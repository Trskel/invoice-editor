import userEvent from '@testing-library/user-event'
import { act, renderApp, screen, waitFor, within } from '../../specs/testUtils'
import { mockEndpoint, server } from '../../specs/mocks/server'
import { mockDeleteInvoice, mockPutInvoice } from '../../specs/mocks/invoice'
import { normalizeSpaces } from '../../specs/normalizeSpaces'
import { buildCustomer, buildCustomersPage } from '../../specs/fixtures/catalog'
import {
  buildFinalizedInvoice,
  buildInvoice,
  buildInvoicesPage,
  buildPaidInvoice,
  buildToyotaInvoice,
} from '../../specs/fixtures/invoices'
import { Customer, Invoice } from '../../types'

const mockInvoices = (
  response: ReturnType<typeof buildInvoicesPage>,
  options: { delay?: number | 'infinite' } = {}
) => mockEndpoint({ endpointName: 'getInvoices', response, ...options })

const tenInvoices = (firstId: number) =>
  Array.from({ length: 10 }, (_, i) => buildInvoice({ id: firstId + i }))

const findRow = async (invoiceId: number) => {
  const link = await screen.findByRole('link', { name: `#${invoiceId}` })
  return link.closest('tr')!
}

const invoiceLinks = () => screen.queryAllByRole('link', { name: /^#\d+$/ })

const queryParams = (request: Request) => new URL(request.url).searchParams

const location = (router: ReturnType<typeof renderApp>['router']) =>
  router.state.location.pathname + router.state.location.search

// A click or a history navigation updates the router on a later tick; wait for
// the new location instead of reading it synchronously right after the action.
const expectLocation = (
  router: ReturnType<typeof renderApp>['router'],
  expected: string
) => waitFor(() => expect(location(router)).toBe(expected))

const sentBody = async (request: Request) => request.json()

// The `filter` parameter of a list request (Decision 2 of the change): the
// exact query strings the page must send, pinned as the unit tests do.
const filterOf = (request: Request) => queryParams(request).get('filter')

const DRAFT_FILTER = '[{"field":"finalized","operator":"eq","value":false}]'
const FINALIZED_FILTER =
  '[{"field":"finalized","operator":"eq","value":true},{"field":"paid","operator":"eq","value":false}]'
const PAID_FILTER =
  '[{"field":"finalized","operator":"eq","value":true},{"field":"paid","operator":"eq","value":true}]'
const customerFilter = (id: number) =>
  `[{"field":"customer_id","operator":"eq","value":${id}}]`
const draftCustomerFilter = (id: number) =>
  `[{"field":"finalized","operator":"eq","value":false},{"field":"customer_id","operator":"eq","value":${id}}]`
const finalizedCustomerFilter = (id: number) =>
  `[{"field":"finalized","operator":"eq","value":true},{"field":"paid","operator":"eq","value":false},{"field":"customer_id","operator":"eq","value":${id}}]`

const customerField = () => screen.getByRole('combobox', { name: 'Customer' })
// The label the picker shows for the selected value (the text node next to the
// combobox input), or the placeholder when nothing is selected.
const customerLabel = () => customerField().parentElement?.textContent ?? ''

// antd's button-style radio puts `pointer-events: none` on the input; the
// wrapping label is the part a user clicks.
const statusControl = (name: string) =>
  screen.getByRole('radio', { name }).closest('label') as HTMLElement

// A search is sent after a debounce delay: `chooseCustomer` waits for the
// request, so that none is sent after the test ended. A search text already
// sent is answered from the query cache, with no new request to wait for, so
// every search in a test must use a distinct text.
let sentSearches: string[] = []

const mockCustomerSearch = (customers: Customer[] = []) => {
  const search = (request: Request) =>
    new URL(request.url).searchParams.get('query')?.toLowerCase() ?? ''
  return mockEndpoint({
    endpointName: 'getSearchCustomers',
    response: (request) =>
      buildCustomersPage(
        customers.filter((c) =>
          `${c.first_name} ${c.last_name}`
            .toLowerCase()
            .includes(search(request))
        )
      ),
  })
}

const chooseCustomer = async (
  user: ReturnType<typeof userEvent.setup>,
  search: string,
  optionName: string
) => {
  const field = customerField()
  const sentBefore = sentSearches.filter((q) => q === search).length
  if (sentBefore > 0) {
    throw new Error(
      `"${search}" was already searched in this test: search by a distinct text`
    )
  }
  await user.click(field)
  await user.type(field, search)
  await waitFor(() =>
    expect(sentSearches.filter((q) => q === search).length).toBeGreaterThan(
      sentBefore
    )
  )
  await user.click(await screen.findByRole('option', { name: optionName }))
}

// The list request (per_page 10) is answered by `list`; the customer name
// lookup (Decision 5, per_page 1) by `name`, so the two never collide.
const mockListAndName = (
  list: (request: Request) => ReturnType<typeof buildInvoicesPage>,
  name: Customer | null = null
) =>
  mockEndpoint({
    endpointName: 'getInvoices',
    response: (request) =>
      queryParams(request).get('per_page') === '1'
        ? buildInvoicesPage(
            name ? [buildInvoice({ customer_id: name.id, customer: name })] : []
          )
        : list(request),
  })

// The lifecycle action of an invoice, found by its accessible name (the visible
// label followed by the invoice number). A regex tolerates the icon that antd
// adds to the accessible name while the button shows progress.
const actionButton = (label: string, id: number) =>
  screen.getByRole('button', { name: new RegExp(`${label}, invoice #${id}`) })

const actionQuery = (label: string, id: number) =>
  screen.queryByRole('button', { name: new RegExp(`${label}, invoice #${id}`) })

// The detail page loads the invoice when it opens.
const mockInvoice = (invoice: Invoice) =>
  mockEndpoint({
    endpointName: 'getInvoice',
    params: { pathParams: { id: String(invoice.id) } },
    response: invoice,
  })

describe('InvoicesList', () => {
  beforeEach(() => {
    sentSearches = []
    // The list shows the customer picker, which searches on mount; a test that
    // needs results overrides this with `mockCustomerSearch`.
    mockCustomerSearch()
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (request.method === 'GET' && url.pathname.endsWith('/search')) {
        sentSearches.push(url.searchParams.get('query') ?? '')
      }
    })
  })

  afterEach(() => server.events.removeAllListeners())

  describe('listing', () => {
    it('names the page with a top-level heading', async () => {
      mockInvoices(buildInvoicesPage([buildInvoice()]))
      renderApp('/')

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Invoices' })
      ).toBeInTheDocument()
    })

    it('shows one row per invoice with its details', async () => {
      mockInvoices(
        buildInvoicesPage([
          buildInvoice({
            id: 100389,
            customer: {
              id: 7,
              first_name: 'Ada',
              last_name: 'Lovelace',
              address: '1 Main St',
              zip_code: '75001',
              city: 'Paris',
              country: 'France',
              country_code: 'FR',
            },
            date: '2026-09-01',
            deadline: '2026-10-15',
            finalized: true,
            invoice_lines: [
              { ...buildInvoice().invoice_lines[0], price: '105340.0' },
              { ...buildInvoice().invoice_lines[0], price: '36840.0' },
            ],
          }),
          buildInvoice({ id: 100390 }),
        ])
      )
      renderApp('/')

      const row = await findRow(100389)
      const text = normalizeSpaces(row.textContent ?? '')
      expect(text).toContain('Ada Lovelace')
      expect(text).toContain('2026-09-01')
      expect(text).toContain('2026-10-15')
      expect(text).toContain('Finalized')
      expect(text).toContain('142 180,00 €')
      expect(invoiceLinks()).toHaveLength(2)
    })

    it('shows a dash for a missing deadline', async () => {
      mockInvoices(
        buildInvoicesPage([buildInvoice({ id: 100389, deadline: null })])
      )
      renderApp('/')

      const row = await findRow(100389)
      const deadlineIndex = screen
        .getAllByRole('columnheader')
        .findIndex((header) => header.textContent === 'Deadline')
      expect(within(row).getAllByRole('cell')[deadlineIndex]).toHaveTextContent(
        /^-$/
      )
    })
  })

  describe('status', () => {
    it.each<[string, string, Partial<Invoice>]>([
      ['a draft', 'Draft', { finalized: false, paid: false }],
      [
        'a finalized unpaid invoice',
        'Finalized',
        { finalized: true, paid: false },
      ],
      ['a finalized paid invoice', 'Paid', { finalized: true, paid: true }],
      ['a draft flagged as paid', 'Draft', { finalized: false, paid: true }],
    ])('labels %s as "%s"', async (_, label, flags) => {
      mockInvoices(buildInvoicesPage([buildInvoice({ id: 100389, ...flags })]))
      renderApp('/')

      expect(await findRow(100389)).toHaveTextContent(label)
    })
  })

  describe('request states', () => {
    it('shows a loading indicator and no rows during the first load', async () => {
      mockInvoices(buildInvoicesPage([buildInvoice()]), { delay: 'infinite' })
      renderApp('/')

      expect(await screen.findByText('Loading invoices')).toBeInTheDocument()
      expect(invoiceLinks()).toHaveLength(0)
    })

    it('shows an error and a retry button when the request fails', async () => {
      mockEndpoint({
        endpointName: 'getInvoices',
        response: { message: 'Internal Server Error' },
        status: 500,
      })
      renderApp('/')

      expect(
        await screen.findByText('Invoices could not be loaded')
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('shows the invoices after a successful retry', async () => {
      const user = userEvent.setup()
      mockEndpoint({
        endpointName: 'getInvoices',
        response: { message: 'Internal Server Error' },
        status: 500,
      })
      renderApp('/')
      const retry = await screen.findByRole('button', { name: 'Retry' })

      mockInvoices(buildInvoicesPage([buildInvoice({ id: 100389 })]))
      await user.click(retry)

      expect(await findRow(100389)).toBeInTheDocument()
      expect(
        screen.queryByText('Invoices could not be loaded')
      ).not.toBeInTheDocument()
    })

    it('says there are no invoices yet and offers to create one', async () => {
      mockInvoices(buildInvoicesPage([], { total_entries: 0 }))
      renderApp('/')

      expect(await screen.findByText('No invoices yet')).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Create invoice' })
      ).toHaveAttribute('href', '/invoices/new')
      expect(
        screen.queryByRole('button', { name: 'Clear filters' })
      ).not.toBeInTheDocument()
    })
  })

  describe('pagination', () => {
    it('requests the page in the URL and marks it as current', async () => {
      const requests = mockInvoices(
        buildInvoicesPage(tenInvoices(100010), { page: 2, total_entries: 25 })
      )
      renderApp('/?page=2')

      await findRow(100010)
      expect(queryParams(requests[0]).get('page')).toBe('2')
      expect(queryParams(requests[0]).get('per_page')).toBe('10')
      expect(screen.getByTitle('2')).toHaveClass('ant-pagination-item-active')
    })

    it('changes page through the pagination control', async () => {
      const user = userEvent.setup()
      mockInvoices(
        buildInvoicesPage(tenInvoices(100000), { page: 1, total_entries: 25 })
      )
      const { router } = renderApp('/')
      await findRow(100000)

      mockInvoices(
        buildInvoicesPage(tenInvoices(100010), { page: 2, total_entries: 25 })
      )
      await user.click(screen.getByTitle('2'))

      await expectLocation(router, '/?page=2')
      expect(await findRow(100010)).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: '#100000' })
      ).not.toBeInTheDocument()
    })

    it('returns to page 1 with the browser back button', async () => {
      const user = userEvent.setup()
      // Going back refetches page 1 in the background: answer by page.
      const requests = mockEndpoint({
        endpointName: 'getInvoices',
        response: (request) =>
          queryParams(request).get('page') === '2'
            ? buildInvoicesPage(tenInvoices(100010), {
                page: 2,
                total_entries: 25,
              })
            : buildInvoicesPage(tenInvoices(100000), { total_entries: 25 }),
      })
      const { router } = renderApp('/')
      await findRow(100000)
      await user.click(screen.getByTitle('2'))
      await findRow(100010)

      // The router updates React state outside of a user event.
      await act(() => router.navigate(-1))

      await expectLocation(router, '/')
      expect(await findRow(100000)).toBeInTheDocument()
      // The cached rows show first; the refetch follows.
      await waitFor(() =>
        expect(queryParams(requests.at(-1)!).get('page')).toBe('1')
      )
    })

    it.each(['abc', '0', '-1'])(
      'falls back to page 1 for ?page=%s',
      async (value) => {
        const requests = mockInvoices(
          buildInvoicesPage(tenInvoices(100000), { total_entries: 25 })
        )
        renderApp(`/?page=${value}`)

        await findRow(100000)
        expect(queryParams(requests[0]).get('page')).toBe('1')
        expect(screen.getByTitle('1')).toHaveClass('ant-pagination-item-active')
      }
    )

    it('says a page out of range does not exist and links to the first page', async () => {
      const user = userEvent.setup()
      mockInvoices(buildInvoicesPage([], { page: 7, total_entries: 25 }))
      const { router } = renderApp('/?page=7')

      expect(
        await screen.findByText('This page does not exist')
      ).toBeInTheDocument()

      mockInvoices(
        buildInvoicesPage(tenInvoices(100000), { total_entries: 25 })
      )
      await user.click(
        screen.getByRole('link', { name: 'Go to the first page' })
      )

      await expectLocation(router, '/')
      expect(await findRow(100000)).toBeInTheDocument()
    })

    it('keeps the current rows visible while the next page loads', async () => {
      const user = userEvent.setup()
      mockInvoices(
        buildInvoicesPage(tenInvoices(100000), { page: 1, total_entries: 25 })
      )
      renderApp('/')
      await findRow(100000)

      mockInvoices(
        buildInvoicesPage(tenInvoices(100010), { page: 2, total_entries: 25 }),
        { delay: 'infinite' }
      )
      await user.click(screen.getByTitle('2'))

      expect(await screen.findByText('Loading invoices')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '#100000' })).toBeInTheDocument()
      expect(screen.getByTitle('2')).toHaveClass('ant-pagination-item-active')
    })
  })

  describe('navigation', () => {
    it('opens an invoice from the keyboard', async () => {
      const user = userEvent.setup()
      mockInvoices(buildInvoicesPage([buildInvoice({ id: 100389 })]))
      // The detail page loads the invoice when it opens.
      mockEndpoint({
        endpointName: 'getInvoice',
        params: { pathParams: { id: '100389' } },
        response: buildInvoice({ id: 100389 }),
      })
      const { router } = renderApp('/')
      const link = await screen.findByRole('link', { name: '#100389' })

      // Tab through the page (header link, "Create invoice", ...) up to it.
      for (let i = 0; i < 10 && document.activeElement !== link; i++) {
        await user.tab()
      }
      expect(link).toHaveFocus()
      await user.keyboard('{Enter}')

      await expectLocation(router, '/invoices/100389')
    })

    it('opens the creation page from "Create invoice"', async () => {
      const user = userEvent.setup()
      mockInvoices(buildInvoicesPage([buildInvoice()]))
      // The creation page loads the customer and product choices.
      const emptyPage = {
        page: 1,
        page_size: 10,
        total_pages: 0,
        total_entries: 0,
      }
      mockEndpoint({
        endpointName: 'getSearchCustomers',
        response: { customers: [], pagination: emptyPage },
      })
      mockEndpoint({
        endpointName: 'getSearchProducts',
        response: { products: [], pagination: emptyPage },
      })
      const { router } = renderApp('/')

      await user.click(
        await screen.findByRole('link', { name: 'Create invoice' })
      )

      await expectLocation(router, '/invoices/new')
    })
  })

  describe('lifecycle actions', () => {
    describe('actions column', () => {
      it('offers the actions of each invoice in its row', async () => {
        mockInvoices(
          buildInvoicesPage([buildToyotaInvoice(), buildFinalizedInvoice()])
        )
        renderApp('/')
        await findRow(100500)

        expect(
          screen.getByRole('columnheader', { name: 'Actions' })
        ).toBeInTheDocument()
        expect(
          within(await findRow(100500)).getByRole('button', {
            name: 'Finalize, invoice #100500',
          })
        ).toBeInTheDocument()
        expect(
          within(await findRow(100500)).getByRole('button', {
            name: 'Delete, invoice #100500',
          })
        ).toBeInTheDocument()
        expect(
          within(await findRow(100417)).getByRole('button', {
            name: 'Mark as paid, invoice #100417',
          })
        ).toBeInTheDocument()
        expect(
          within(await findRow(100417)).queryByRole('button', {
            name: /Finalize/,
          })
        ).not.toBeInTheDocument()
      })

      it('offers Mark as unpaid for a paid invoice', async () => {
        mockInvoices(buildInvoicesPage([buildPaidInvoice()]))
        renderApp('/')

        expect(
          within(await findRow(100421)).getByRole('button', {
            name: 'Mark as unpaid, invoice #100421',
          })
        ).toBeInTheDocument()
        expect(actionQuery('Mark as paid', 100421)).not.toBeInTheDocument()
      })
    })

    describe('finalize', () => {
      it('finalizes a draft from its row', async () => {
        const user = userEvent.setup()
        const finalized = { ...buildToyotaInvoice(), finalized: true }
        let invoices = [buildToyotaInvoice()]
        mockEndpoint({
          endpointName: 'getInvoices',
          response: () => buildInvoicesPage(invoices),
        })
        mockPutInvoice(100500, finalized, {
          onRequest: () => {
            invoices = [finalized]
          },
        })
        renderApp('/')
        await findRow(100500)

        await user.click(actionButton('Finalize', 100500))
        await user.click(screen.getByRole('button', { name: 'Finalize' }))

        expect(
          await screen.findByText('Invoice #100500 finalized')
        ).toBeInTheDocument()
        expect(await findRow(100500)).toHaveTextContent('Finalized')
        expect(
          within(await findRow(100500)).getByRole('button', {
            name: 'Mark as paid, invoice #100500',
          })
        ).toBeInTheDocument()
      })

      it('sends nothing when the dialog is cancelled', async () => {
        const user = userEvent.setup()
        mockInvoices(buildInvoicesPage([buildToyotaInvoice()]))
        const requests = mockPutInvoice(100500, buildToyotaInvoice())
        renderApp('/')
        await findRow(100500)

        await user.click(actionButton('Finalize', 100500))
        await user.click(await screen.findByRole('button', { name: 'Cancel' }))

        await waitFor(() =>
          expect(
            screen.queryAllByText('Finalize invoice #100500?')
          ).toHaveLength(0)
        )
        expect(requests).toHaveLength(0)
      })
    })

    describe('delete', () => {
      it('removes the row after deleting an invoice from the list', async () => {
        const user = userEvent.setup()
        const invoices = [
          buildToyotaInvoice(),
          buildToyotaInvoice({ id: 100501 }),
        ]
        mockEndpoint({
          endpointName: 'getInvoices',
          response: () => buildInvoicesPage(invoices),
        })
        mockDeleteInvoice(100500, {
          onRequest: () => invoices.splice(0, 1),
        })
        renderApp('/')
        await findRow(100500)

        await user.click(actionButton('Delete', 100500))
        await user.click(await screen.findByRole('button', { name: 'Delete' }))

        expect(
          await screen.findByText('Invoice #100500 deleted')
        ).toBeInTheDocument()
        await waitFor(() =>
          expect(
            screen.queryByRole('link', { name: '#100500' })
          ).not.toBeInTheDocument()
        )
        expect(await findRow(100501)).toBeInTheDocument()
      })

      it('shows the previous page after deleting the last row of page 2', async () => {
        const user = userEvent.setup()
        // The API answers page 2 with no invoices once the row is deleted;
        // the previous-page rule must still work (Decision 8 of the filters
        // change fixes the old mock that kept answering the deleted row).
        let deleted = false
        mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) =>
            queryParams(request).get('page') === '2'
              ? deleted
                ? buildInvoicesPage([], { page: 2, total_entries: 10 })
                : buildInvoicesPage([buildToyotaInvoice({ id: 100510 })], {
                    page: 2,
                    total_entries: 11,
                  })
              : buildInvoicesPage(tenInvoices(100000), { total_entries: 10 }),
        })
        mockDeleteInvoice(100510, {
          onRequest: () => {
            deleted = true
          },
        })
        const { router } = renderApp('/?page=2')
        await findRow(100510)

        await user.click(actionButton('Delete', 100510))
        await user.click(await screen.findByRole('button', { name: 'Delete' }))

        await expectLocation(router, '/')
        expect(await findRow(100000)).toBeInTheDocument()
      })

      it('sends nothing when the dialog is cancelled', async () => {
        const user = userEvent.setup()
        mockInvoices(buildInvoicesPage([buildToyotaInvoice()]))
        const requests = mockDeleteInvoice(100500)
        renderApp('/')
        await findRow(100500)

        await user.click(actionButton('Delete', 100500))
        await user.click(await screen.findByRole('button', { name: 'Cancel' }))

        await waitFor(() =>
          expect(screen.queryAllByText('Delete invoice #100500?')).toHaveLength(
            0
          )
        )
        expect(requests).toHaveLength(0)
        expect(await findRow(100500)).toBeInTheDocument()
      })
    })

    describe('mark as paid or unpaid', () => {
      it('marks a finalized invoice as paid from its row', async () => {
        const user = userEvent.setup()
        const paid = { ...buildFinalizedInvoice(), paid: true }
        let invoices = [buildFinalizedInvoice()]
        mockEndpoint({
          endpointName: 'getInvoices',
          response: () => buildInvoicesPage(invoices),
        })
        const requests = mockPutInvoice(100417, paid, {
          onRequest: () => {
            invoices = [paid]
          },
        })
        renderApp('/')
        await findRow(100417)

        await user.click(actionButton('Mark as paid', 100417))

        expect(
          await screen.findByText('Invoice #100417 marked as paid')
        ).toBeInTheDocument()
        expect(await sentBody(requests[0])).toEqual({
          invoice: { id: 100417, paid: true },
        })
        expect(await findRow(100417)).toHaveTextContent('Paid')
        expect(
          within(await findRow(100417)).getByRole('button', {
            name: 'Mark as unpaid, invoice #100417',
          })
        ).toBeInTheDocument()
      })

      it('marks a paid invoice as unpaid from its row', async () => {
        const user = userEvent.setup()
        const unpaid = { ...buildPaidInvoice(), paid: false }
        let invoices = [buildPaidInvoice()]
        mockEndpoint({
          endpointName: 'getInvoices',
          response: () => buildInvoicesPage(invoices),
        })
        const requests = mockPutInvoice(100421, unpaid, {
          onRequest: () => {
            invoices = [unpaid]
          },
        })
        renderApp('/')
        await findRow(100421)

        await user.click(actionButton('Mark as unpaid', 100421))

        expect(
          await screen.findByText('Invoice #100421 marked as unpaid')
        ).toBeInTheDocument()
        expect(await sentBody(requests[0])).toEqual({
          invoice: { id: 100421, paid: false },
        })
        expect(await findRow(100421)).toHaveTextContent('Finalized')
        expect(
          within(await findRow(100421)).getByRole('button', {
            name: 'Mark as paid, invoice #100421',
          })
        ).toBeInTheDocument()
      })

      it('keeps the other rows available while one row is busy', async () => {
        const user = userEvent.setup()
        mockInvoices(
          buildInvoicesPage([
            buildToyotaInvoice(),
            buildToyotaInvoice({ id: 100501 }),
          ])
        )
        mockDeleteInvoice(100500, { delay: 'infinite' })
        renderApp('/')
        await findRow(100500)

        await user.click(actionButton('Delete', 100500))
        await user.click(await screen.findByRole('button', { name: 'Delete' }))

        await waitFor(() =>
          expect(actionButton('Delete', 100500)).toHaveClass('ant-btn-loading')
        )
        expect(actionButton('Finalize', 100501)).toBeEnabled()
        expect(actionButton('Delete', 100501)).toBeEnabled()
      })
    })

    describe('views stay current after an action', () => {
      it('shows the new status on the detail page opened after marking as paid in the list', async () => {
        const user = userEvent.setup()
        const paid = { ...buildFinalizedInvoice(), paid: true }
        let invoices = [buildFinalizedInvoice()]
        mockEndpoint({
          endpointName: 'getInvoices',
          response: () => buildInvoicesPage(invoices),
        })
        mockPutInvoice(100417, paid, {
          onRequest: () => {
            invoices = [paid]
          },
        })
        mockInvoice(paid)
        renderApp('/')
        await findRow(100417)

        await user.click(actionButton('Mark as paid', 100417))
        await screen.findByText('Invoice #100417 marked as paid')

        await user.click(screen.getByRole('link', { name: '#100417' }))

        expect(
          await screen.findByRole('heading', { name: 'Invoice #100417' })
        ).toBeInTheDocument()
        expect(screen.getByText('Paid')).toBeInTheDocument()
        expect(actionButton('Mark as unpaid', 100417)).toBeInTheDocument()
      })
    })
  })

  describe('filters', () => {
    const vincent = buildCustomer({
      id: 20,
      first_name: 'Vincent',
      last_name: 'Upton',
    })
    const wilfred = buildCustomer({
      id: 157,
      first_name: 'Wilfred',
      last_name: 'Ernser',
    })

    describe('status filter', () => {
      it('shows the drafts only after choosing "Draft"', async () => {
        const user = userEvent.setup()
        const draft = buildInvoice({ id: 100389, finalized: false })
        const paid = buildPaidInvoice()
        const requests = mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) =>
            filterOf(request) === DRAFT_FILTER
              ? buildInvoicesPage([draft])
              : buildInvoicesPage([draft, paid]),
        })
        const { router } = renderApp('/')
        await findRow(100389)
        await findRow(100421)

        await user.click(statusControl('Draft'))

        await expectLocation(router, '/?status=draft')
        await waitFor(() =>
          expect(filterOf(requests.at(-1)!)).toBe(DRAFT_FILTER)
        )
        await waitFor(() =>
          expect(
            screen.queryByRole('link', { name: '#100421' })
          ).not.toBeInTheDocument()
        )
        expect(await findRow(100389)).toBeInTheDocument()
      })

      it('shows the finalized unpaid invoices after choosing "Finalized"', async () => {
        const user = userEvent.setup()
        const finalized = buildFinalizedInvoice()
        const draft = buildInvoice({ id: 100389 })
        const requests = mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) =>
            filterOf(request) === FINALIZED_FILTER
              ? buildInvoicesPage([finalized])
              : buildInvoicesPage([draft, finalized]),
        })
        renderApp('/')
        await findRow(100389)

        await user.click(statusControl('Finalized'))

        await waitFor(() =>
          expect(
            screen.queryByRole('link', { name: '#100389' })
          ).not.toBeInTheDocument()
        )
        expect(await findRow(100417)).toHaveTextContent('Finalized')
        expect(filterOf(requests.at(-1)!)).toBe(FINALIZED_FILTER)
      })

      it('shows the paid invoices only, not a draft flagged as paid', async () => {
        const user = userEvent.setup()
        const paid = buildPaidInvoice()
        const paidDraft = buildInvoice({
          id: 100500,
          finalized: false,
          paid: true,
        })
        const requests = mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) =>
            filterOf(request) === PAID_FILTER
              ? buildInvoicesPage([paid])
              : buildInvoicesPage([paid, paidDraft]),
        })
        renderApp('/')
        await findRow(100421)
        expect(await findRow(100500)).toHaveTextContent('Draft')

        await user.click(statusControl('Paid'))

        await waitFor(() =>
          expect(
            screen.queryByRole('link', { name: '#100500' })
          ).not.toBeInTheDocument()
        )
        expect(await findRow(100421)).toHaveTextContent('Paid')
        expect(filterOf(requests.at(-1)!)).toBe(PAID_FILTER)
      })

      it('requests without a filter after returning to "All"', async () => {
        const user = userEvent.setup()
        const requests = mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) =>
            buildInvoicesPage(
              filterOf(request) === DRAFT_FILTER
                ? [buildInvoice({ id: 100389 })]
                : [buildInvoice({ id: 100389 }), buildPaidInvoice()]
            ),
        })
        const { router } = renderApp('/')
        await findRow(100389)

        await user.click(statusControl('Draft'))
        await expectLocation(router, '/?status=draft')

        await user.click(statusControl('All'))

        await expectLocation(router, '/')
        await waitFor(() => expect(filterOf(requests.at(-1)!)).toBeNull())
      })
    })

    describe('customer filter', () => {
      it('filters by the chosen customer and shows its name', async () => {
        const user = userEvent.setup()
        mockCustomerSearch([vincent])
        const vincentInvoice = buildInvoice({
          id: 100389,
          customer_id: 20,
          customer: vincent,
        })
        const other = buildInvoice({ id: 100390 })
        const requests = mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) =>
            filterOf(request) === customerFilter(20)
              ? buildInvoicesPage([vincentInvoice])
              : buildInvoicesPage([vincentInvoice, other]),
        })
        const { router } = renderApp('/')
        await findRow(100390)

        await chooseCustomer(user, 'upt', 'Vincent Upton')

        await expectLocation(router, '/?customer=20')
        await waitFor(() =>
          expect(
            screen.queryByRole('link', { name: '#100390' })
          ).not.toBeInTheDocument()
        )
        expect(filterOf(requests.at(-1)!)).toBe(customerFilter(20))
        expect(customerLabel()).toContain('Vincent Upton')
      })

      it('combines the customer and the status', async () => {
        const user = userEvent.setup()
        const wilfredDraft = buildInvoice({
          id: 100389,
          customer_id: 157,
          customer: wilfred,
        })
        const requests = mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) =>
            buildInvoicesPage(filterOf(request) === null ? [] : [wilfredDraft]),
        })
        const { router } = renderApp('/?customer=157')
        await findRow(100389)

        await user.click(statusControl('Draft'))

        await expectLocation(router, '/?status=draft&customer=157')
        await waitFor(() =>
          expect(filterOf(requests.at(-1)!)).toBe(draftCustomerFilter(157))
        )
      })

      it('clears the customer with its clear control and keeps the status', async () => {
        const wilfredDraft = buildInvoice({
          id: 100389,
          customer_id: 157,
          customer: wilfred,
        })
        const requests = mockListAndName(
          () => buildInvoicesPage([wilfredDraft]),
          wilfred
        )
        const { router } = renderApp('/?status=draft&customer=157')
        await findRow(100389)
        expect(customerLabel()).toContain('Wilfred Ernser')

        // antd hides the clear control from pointer events until the picker is
        // hovered, and gives it no role or name, so it is found by its class.
        const select = customerField().closest('.ant-select') as HTMLElement
        await userEvent
          .setup({ pointerEventsCheck: 0 })
          .click(select.querySelector('.ant-select-clear') as HTMLElement)

        await expectLocation(router, '/?status=draft')
        await waitFor(() =>
          expect(filterOf(requests.at(-1)!)).toBe(DRAFT_FILTER)
        )
        expect(customerLabel()).not.toContain('Wilfred Ernser')
      })

      it('says the customer search failed and keeps the list', async () => {
        const user = userEvent.setup()
        mockEndpoint({
          endpointName: 'getSearchCustomers',
          response: { message: 'boom' },
          status: 500,
        })
        mockInvoices(buildInvoicesPage([buildInvoice({ id: 100389 })]))
        renderApp('/')
        await findRow(100389)

        await user.click(customerField())
        await user.type(customerField(), 'upt')

        expect(await screen.findByText('Search failed')).toBeInTheDocument()
        expect(await findRow(100389)).toBeInTheDocument()
      })
    })

    describe('filters in the URL', () => {
      it('applies the filters of the URL', async () => {
        const finalized = buildFinalizedInvoice({
          customer_id: 157,
          customer: wilfred,
        })
        const requests = mockListAndName(
          (request) =>
            filterOf(request) === finalizedCustomerFilter(157)
              ? buildInvoicesPage([finalized], { page: 2, total_entries: 11 })
              : buildInvoicesPage([]),
          wilfred
        )
        renderApp('/?status=finalized&customer=157&page=2')

        await findRow(100417)
        const list = requests.filter(
          (request) => queryParams(request).get('per_page') === '10'
        )
        expect(queryParams(list.at(-1)!).get('page')).toBe('2')
        expect(filterOf(list.at(-1)!)).toBe(finalizedCustomerFilter(157))
        expect(screen.getByRole('radio', { name: 'Finalized' })).toBeChecked()
        await waitFor(() => expect(customerLabel()).toContain('Wilfred Ernser'))
      })

      it('writes the filters to the URL as they are chosen', async () => {
        const user = userEvent.setup()
        mockCustomerSearch([wilfred])
        mockListAndName(() => buildInvoicesPage([buildInvoice({ id: 100389 })]))
        const { router } = renderApp('/')
        await findRow(100389)

        await user.click(statusControl('Paid'))
        await expectLocation(router, '/?status=paid')

        await chooseCustomer(user, 'wil', 'Wilfred Ernser')
        await expectLocation(router, '/?status=paid&customer=157')
      })

      it('restores the previous filter with the browser back button', async () => {
        const user = userEvent.setup()
        const requests = mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) =>
            buildInvoicesPage(
              filterOf(request) === DRAFT_FILTER
                ? [buildInvoice({ id: 100389 })]
                : [buildInvoice({ id: 100389 }), buildPaidInvoice()]
            ),
        })
        const { router } = renderApp('/')
        await findRow(100389)
        await user.click(statusControl('Draft'))
        await expectLocation(router, '/?status=draft')
        await waitFor(() =>
          expect(filterOf(requests.at(-1)!)).toBe(DRAFT_FILTER)
        )

        // The router updates React state outside of a user event.
        await act(() => router.navigate(-1))

        await expectLocation(router, '/')
        expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
        await waitFor(() => expect(filterOf(requests.at(-1)!)).toBeNull())
        expect(await findRow(100421)).toBeInTheDocument()
      })

      it('ignores unknown filter values', async () => {
        const requests = mockInvoices(
          buildInvoicesPage([buildInvoice({ id: 100389 })])
        )
        renderApp('/?status=overdue&customer=abc')

        await findRow(100389)
        expect(filterOf(requests[0])).toBeNull()
        expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
        expect(customerLabel()).not.toContain('Customer #')
      })

      it('shows "Customer #999" and no match when that customer has no invoices', async () => {
        mockListAndName(() => buildInvoicesPage([], { total_entries: 0 }))
        renderApp('/?customer=999')

        expect(
          await screen.findByText('No invoices match these filters')
        ).toBeInTheDocument()
        await waitFor(() => expect(customerLabel()).toContain('Customer #999'))
      })
    })

    describe('page when a filter changes', () => {
      it('goes to page 1 when the status changes', async () => {
        const user = userEvent.setup()
        const requests = mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) => {
            const page = queryParams(request).get('page') ?? '1'
            return buildInvoicesPage(tenInvoices(100000), {
              page: Number(page),
              total_entries: 25,
            })
          },
        })
        const { router } = renderApp('/?page=3')
        await findRow(100000)

        await user.click(statusControl('Draft'))

        await expectLocation(router, '/?status=draft')
        await waitFor(() =>
          expect(queryParams(requests.at(-1)!).get('page')).toBe('1')
        )
      })

      it('goes to page 1 when the customer changes', async () => {
        const user = userEvent.setup()
        mockCustomerSearch([wilfred])
        const requests = mockListAndName(() =>
          buildInvoicesPage([buildInvoice({ id: 100389 })])
        )
        const { router } = renderApp('/?status=draft&page=2')
        await findRow(100389)

        await chooseCustomer(user, 'wil', 'Wilfred Ernser')

        await expectLocation(router, '/?status=draft&customer=157')
        await waitFor(() =>
          expect(queryParams(requests.at(-1)!).get('page')).toBe('1')
        )
      })

      it('keeps the filters when paging', async () => {
        const user = userEvent.setup()
        const requests = mockListAndName((request) => {
          const page = queryParams(request).get('page') ?? '1'
          return buildInvoicesPage(
            page === '2' ? tenInvoices(100010) : tenInvoices(100000),
            { page: Number(page), total_entries: 25 }
          )
        }, wilfred)
        const { router } = renderApp('/?status=draft&customer=157')
        await findRow(100000)

        await user.click(screen.getByTitle('2'))

        await expectLocation(router, '/?status=draft&customer=157&page=2')
        expect(await findRow(100010)).toBeInTheDocument()
        expect(filterOf(requests.at(-1)!)).toBe(draftCustomerFilter(157))
      })

      it('links an out-of-range page back to page 1 with the filters', async () => {
        mockInvoices(buildInvoicesPage([], { page: 4, total_entries: 3 }))
        renderApp('/?status=paid&page=4')

        expect(
          await screen.findByText('This page does not exist')
        ).toBeInTheDocument()
        expect(
          screen.getByRole('link', { name: 'Go to the first page' })
        ).toHaveAttribute('href', '/?status=paid')
      })

      it('shows the previous filtered page after deleting its last row', async () => {
        const user = userEvent.setup()
        let deleted = false
        mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) =>
            queryParams(request).get('page') === '2'
              ? deleted
                ? buildInvoicesPage([], { page: 2, total_entries: 0 })
                : buildInvoicesPage([buildToyotaInvoice({ id: 100510 })], {
                    page: 2,
                    total_entries: 11,
                  })
              : buildInvoicesPage(tenInvoices(100000), { total_entries: 10 }),
        })
        mockDeleteInvoice(100510, {
          onRequest: () => {
            deleted = true
          },
        })
        const { router } = renderApp('/?status=draft&page=2')
        await findRow(100510)

        await user.click(actionButton('Delete', 100510))
        await user.click(await screen.findByRole('button', { name: 'Delete' }))

        await expectLocation(router, '/?status=draft')
        expect(await findRow(100000)).toBeInTheDocument()
      })
    })

    describe('clear filters', () => {
      it('clears both filters', async () => {
        const user = userEvent.setup()
        const requests = mockListAndName(
          () => buildInvoicesPage([buildInvoice({ id: 100389 })]),
          wilfred
        )
        const { router } = renderApp('/?status=draft&customer=157&page=2')
        await findRow(100389)

        await user.click(screen.getByRole('button', { name: 'Clear filters' }))

        await expectLocation(router, '/')
        expect(screen.getByRole('radio', { name: 'All' })).toBeChecked()
        expect(customerLabel()).not.toContain('Wilfred Ernser')
        await waitFor(() => expect(filterOf(requests.at(-1)!)).toBeNull())
      })

      it('offers every customer again after selecting one and clearing', async () => {
        const user = userEvent.setup()
        mockCustomerSearch([vincent, wilfred])
        mockListAndName(() => buildInvoicesPage([buildInvoice({ id: 100389 })]))
        renderApp('/')
        await findRow(100389)

        await chooseCustomer(user, 'upt', 'Vincent Upton')
        expect(customerLabel()).toContain('Vincent Upton')

        await user.click(screen.getByRole('button', { name: 'Clear filters' }))
        await user.click(customerField())

        // The search text is cleared with the filter: the picker must offer
        // the full customer list again, not the last search result.
        expect(
          await screen.findByRole('option', { name: 'Vincent Upton' })
        ).toBeInTheDocument()
        expect(
          await screen.findByRole('option', { name: 'Wilfred Ernser' })
        ).toBeInTheDocument()
      })

      it('clears the filters with the keyboard', async () => {
        const user = userEvent.setup()
        const requests = mockListAndName(
          () => buildInvoicesPage([buildInvoice({ id: 100389 })]),
          wilfred
        )
        const { router } = renderApp('/?customer=157')
        await findRow(100389)

        const clear = screen.getByRole('button', { name: 'Clear filters' })
        for (let i = 0; i < 15 && document.activeElement !== clear; i++) {
          await user.tab()
        }
        expect(clear).toHaveFocus()
        await user.keyboard('{Enter}')

        await expectLocation(router, '/')
        await waitFor(() => expect(filterOf(requests.at(-1)!)).toBeNull())
        expect(customerLabel()).not.toContain('Wilfred Ernser')
      })

      it.each(['/', '/?page=2'])(
        'shows no "Clear filters" button on %s',
        async (url) => {
          mockInvoices(
            buildInvoicesPage(tenInvoices(100000), { total_entries: 25 })
          )
          renderApp(url)

          await findRow(100000)
          expect(
            screen.queryByRole('button', { name: 'Clear filters' })
          ).not.toBeInTheDocument()
        }
      )
    })

    describe('empty filter', () => {
      it('says no invoice matches the filters and keeps the controls', async () => {
        mockInvoices(buildInvoicesPage([], { total_entries: 0 }))
        renderApp('/?status=paid')

        expect(
          await screen.findByText('No invoices match these filters')
        ).toBeInTheDocument()
        expect(
          screen.getByRole('button', { name: 'Clear filters' })
        ).toBeInTheDocument()
        expect(screen.getByRole('radio', { name: 'Paid' })).toBeChecked()
        expect(screen.queryByText('No invoices yet')).not.toBeInTheDocument()
      })

      it('leaves an empty filter with "Clear filters"', async () => {
        const user = userEvent.setup()
        mockEndpoint({
          endpointName: 'getInvoices',
          response: (request) =>
            filterOf(request) === null
              ? buildInvoicesPage([buildInvoice({ id: 100389 })])
              : buildInvoicesPage([], { total_entries: 0 }),
        })
        const { router } = renderApp('/?status=paid&customer=157')
        await screen.findByText('No invoices match these filters')

        await user.click(screen.getByRole('button', { name: 'Clear filters' }))

        await expectLocation(router, '/')
        expect(await findRow(100389)).toBeInTheDocument()
      })
    })
  })
})
