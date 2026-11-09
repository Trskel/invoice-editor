import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { act, renderApp, screen, waitFor, within } from '../../specs/testUtils'
import { mockEndpoint, server, serverBaseURL } from '../../specs/mocks/server'
import { normalizeSpaces } from '../../specs/normalizeSpaces'
import {
  buildCustomer,
  buildCustomersPage,
  buildProduct,
  buildProductsPage,
} from '../../specs/fixtures/catalog'
import { buildInvoice, buildInvoicesPage } from '../../specs/fixtures/invoices'
import { Customer, Product } from '../../types'

const jeannie = buildCustomer({ id: 1 })
const prius = buildProduct({ id: 12, label: 'Toyota Prius' })
const camry = buildProduct({
  id: 11,
  label: 'Toyota Camry',
  vat_rate: '20',
  unit_price: '22840.0',
})

// The customer and product searches answer with the fixtures whose name
// contains the searched text, like the API does.
const mockCatalog = (
  customers: Customer[] = [jeannie],
  products: Product[] = [prius, camry]
) => {
  const search = (request: Request) =>
    new URL(request.url).searchParams.get('query')?.toLowerCase() ?? ''
  mockEndpoint({
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
  mockEndpoint({
    endpointName: 'getSearchProducts',
    response: (request) =>
      buildProductsPage(
        products.filter((p) => p.label.toLowerCase().includes(search(request)))
      ),
  })
}

const mockPostInvoices = (
  response: object,
  options: { status?: number; delay?: number | 'infinite' } = {}
) => mockEndpoint({ endpointName: 'postInvoices', response, ...options })

// The detail page opened after a save shows the cached invoice, and asks the
// API again because a cached entry is stale at once in these tests.
const mockDetail = (invoice: { id: number }) =>
  mockEndpoint({
    endpointName: 'getInvoice',
    params: { pathParams: { id: String(invoice.id) } },
    response: invoice,
  })

// The invoice the API answers with, and the mock of the detail page opened
// after the save (the created invoice is also seeded in the cache, but a
// refresh must work).
const createdInvoice = (id = 100500) => buildInvoice({ id, invoice_lines: [] })

const sentBody = async (request: Request) => request.json()

// Fake only the clock: user-event, the debounce and the query client keep
// their real timers.
const freezeToday = (day: string) =>
  jest.useFakeTimers({
    now: new Date(`${day}T10:00:00`),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  })

const customerField = () => screen.getByRole('combobox', { name: 'Customer' })
const productField = (line: number) =>
  screen.getByRole('combobox', { name: `Product, line ${line}` })
const quantityField = (line: number) =>
  screen.getByRole('spinbutton', { name: `Quantity, line ${line}` })
const dateField = () => screen.getByRole('textbox', { name: 'Date' })
const deadlineField = () => screen.getByRole('textbox', { name: 'Deadline' })
// While saving, antd puts a "loading" icon (named "loading") in the button.
const saveButton = () => screen.getByRole('button', { name: /Save invoice$/ })

// The row of a line: the container of its product field. The implementation
// marks each row with a `data-line` attribute and its amount cell with
// `data-testid="line-amount"`.
const lineRow = (line: number) =>
  productField(line).closest('[data-line]') as HTMLElement

// The `query` of every search request sent so far. A search is sent after a
// debounce delay, and the options of the previous search may already be shown:
// `choose` waits for the request, so that none is sent after the test ended.
// A search text already sent is answered from the query cache, with no new
// request to wait for, so every search in a test must use a distinct text.
let sentSearches: string[] = []

const choose = async (
  user: ReturnType<typeof userEvent.setup>,
  field: HTMLElement,
  search: string,
  optionName: string
) => {
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

const chooseCustomer = (user: ReturnType<typeof userEvent.setup>) =>
  choose(user, customerField(), 'jea', 'Jeannie Flatley')

const chooseProduct = (
  user: ReturnType<typeof userEvent.setup>,
  line: number,
  product: Product
) => choose(user, productField(line), product.label, product.label)

const enterQuantity = async (
  user: ReturnType<typeof userEvent.setup>,
  line: number,
  quantity: string
) => {
  await user.clear(quantityField(line))
  await user.type(quantityField(line), quantity)
}

const setDate = async (
  user: ReturnType<typeof userEvent.setup>,
  field: HTMLElement,
  day: string
) => {
  await user.clear(field)
  await user.type(field, `${day}{Enter}`)
}

// A form that passes validation, with the two-line example of the spec.
const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await chooseCustomer(user)
  await chooseProduct(user, 1, prius)
  await enterQuantity(user, 1, '2')
  await user.click(screen.getByRole('button', { name: 'Add line' }))
  await chooseProduct(user, 2, camry)
  await enterQuantity(user, 2, '1')
}

const totalsText = (label: string) =>
  normalizeSpaces(screen.getByText(label).parentElement?.textContent ?? '')

const openForm = () => {
  const user = userEvent.setup()
  const rendered = renderApp('/invoices/new')
  return { user, ...rendered }
}

describe('InvoiceCreate', () => {
  beforeEach(() => {
    sentSearches = []
    server.events.on('request:start', ({ request }) => {
      const url = new URL(request.url)
      if (request.method === 'GET' && url.pathname.endsWith('/search')) {
        sentSearches.push(url.searchParams.get('query') ?? '')
      }
    })
  })

  afterEach(() => {
    server.events.removeAllListeners()
    jest.useRealTimers()
  })

  describe('new invoice form', () => {
    it('opens with today, no deadline and one empty line', async () => {
      freezeToday('2026-09-29')
      mockCatalog()
      openForm()

      expect(
        await screen.findByRole('heading', { name: 'New invoice' })
      ).toBeInTheDocument()
      expect(customerField()).toHaveValue('')
      expect(dateField()).toHaveValue('2026-09-29')
      expect(deadlineField()).toHaveValue('')
      expect(
        screen.getAllByRole('combobox', { name: /^Product, line/ })
      ).toHaveLength(1)
      expect(quantityField(1)).toHaveValue('')
      expect(
        screen.queryByRole('combobox', { name: 'Product, line 2' })
      ).toBeNull()
    })
  })

  describe('named fields', () => {
    it('names the fields of every line and its remove action', async () => {
      mockCatalog()
      const { user } = openForm()
      await user.click(await screen.findByRole('button', { name: 'Add line' }))

      expect(
        screen.getByRole('combobox', { name: 'Customer' })
      ).toBeInTheDocument()
      expect(dateField()).toBeInTheDocument()
      expect(deadlineField()).toBeInTheDocument()
      expect(productField(1)).toBeInTheDocument()
      expect(quantityField(1)).toBeInTheDocument()
      expect(productField(2)).toBeInTheDocument()
      expect(quantityField(2)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Remove line 1' })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Remove line 2' })
      ).toBeInTheDocument()
    })
  })

  describe('choosing a customer and products', () => {
    it('chooses the customer from the search', async () => {
      mockCatalog()
      const { user } = openForm()

      await chooseCustomer(user)

      expect(customerField().parentElement).toHaveTextContent('Jeannie Flatley')
    })

    it('sends the typed text to the API', async () => {
      mockCatalog()
      const requests = mockEndpoint({
        endpointName: 'getSearchCustomers',
        response: buildCustomersPage([jeannie]),
      })
      const { user } = openForm()

      await user.click(customerField())
      await user.type(customerField(), 'jea')

      await waitFor(() =>
        expect(
          requests.some(
            (r) => new URL(r.url).searchParams.get('query') === 'jea'
          )
        ).toBe(true)
      )
    })

    it('says there are no results', async () => {
      mockCatalog()
      const { user } = openForm()

      await user.click(productField(1))
      await user.type(productField(1), 'tesla')

      expect(await screen.findByText('No results')).toBeInTheDocument()
    })

    it('says the search failed, not that there are no results', async () => {
      mockCatalog()
      mockEndpoint({
        endpointName: 'getSearchProducts',
        response: { message: 'boom' },
        status: 500,
      })
      const { user } = openForm()

      await user.click(productField(1))
      await user.type(productField(1), 'pri')

      expect(await screen.findByText('Search failed')).toBeInTheDocument()
      expect(screen.queryByText('No results')).not.toBeInTheDocument()
    })
  })

  describe('editing the lines', () => {
    it('shows the unit, unit price, VAT rate and amount of the product', async () => {
      mockCatalog()
      const { user } = openForm()

      await chooseProduct(user, 1, prius)
      await enterQuantity(user, 1, '2')

      const row = within(lineRow(1))
      expect(row.getByText('piece')).toBeInTheDocument()
      expect(row.getByText(/18 420,00/)).toBeInTheDocument()
      expect(row.getByText(/10 %/)).toBeInTheDocument()
      expect(row.getByText(/36 840,00/)).toBeInTheDocument()
    })

    it('updates the amount with the quantity, without a request', async () => {
      mockCatalog()
      const { user } = openForm()
      const searches = mockEndpoint({
        endpointName: 'getSearchProducts',
        response: buildProductsPage([prius]),
      })
      await chooseProduct(user, 1, prius)
      await enterQuantity(user, 1, '2')
      // The search for the typed text is sent after a debounce delay: let it
      // go out, so that only requests caused by the new quantity are counted.
      await waitFor(() =>
        expect(
          searches.some(
            (r) => new URL(r.url).searchParams.get('query') === prius.label
          )
        ).toBe(true)
      )
      const before = searches.length

      await enterQuantity(user, 1, '3')

      expect(within(lineRow(1)).getByText(/55 260,00/)).toBeInTheDocument()
      expect(searches).toHaveLength(before)
    })

    it.each([
      ['no product', null, '2'],
      ['a quantity of 0', prius, '0'],
    ])(
      'shows a dash as the amount for %s',
      async (_name, product, quantity) => {
        mockCatalog()
        const { user } = openForm()

        if (product) await chooseProduct(user, 1, product)
        await enterQuantity(user, 1, quantity)

        expect(within(lineRow(1)).getByTestId('line-amount')).toHaveTextContent(
          /^-$/
        )
      }
    )

    it('adds and removes lines', async () => {
      mockCatalog()
      const { user } = openForm()
      await chooseProduct(user, 1, prius)

      await user.click(screen.getByRole('button', { name: 'Add line' }))
      await chooseProduct(user, 2, camry)
      await user.click(screen.getByRole('button', { name: 'Remove line 1' }))

      expect(
        screen.getAllByRole('combobox', { name: /^Product, line/ })
      ).toHaveLength(1)
      expect(within(lineRow(1)).getByText('Toyota Camry')).toBeInTheDocument()
      expect(within(lineRow(1)).queryByText('Toyota Prius')).toBeNull()
    })
  })

  describe('live totals', () => {
    it('adds up the lines', async () => {
      mockCatalog()
      const { user } = openForm()

      await fillValidForm(user)

      expect(totalsText('Total excluding VAT')).toContain('52 524,24 €')
      expect(totalsText('VAT')).toContain('7 155,76 €')
      expect(totalsText('Total including VAT')).toContain('59 680,00 €')
    })

    it('is zero for an empty form', async () => {
      mockCatalog()
      openForm()
      await screen.findByRole('heading', { name: 'New invoice' })

      expect(totalsText('Total excluding VAT')).toContain('0,00 €')
      expect(totalsText('VAT')).toContain('0,00 €')
      expect(totalsText('Total including VAT')).toContain('0,00 €')
    })
  })

  describe('validation before saving', () => {
    it('does not send an empty form and focuses the customer', async () => {
      mockCatalog()
      const requests = mockPostInvoices(createdInvoice())
      const { user } = openForm()

      await user.click(
        await screen.findByRole('button', { name: 'Save invoice' })
      )

      expect(await screen.findByText('Select a customer')).toBeInTheDocument()
      expect(screen.getByText('Select a product')).toBeInTheDocument()
      expect(
        screen.getByText('Enter a whole quantity from 1 to 1 000 000')
      ).toBeInTheDocument()
      expect(requests).toHaveLength(0)
      expect(customerField()).toHaveFocus()
      expect(customerField()).toBeInvalid()
      expect(customerField()).toHaveAccessibleDescription('Select a customer')
    })

    it.each(['0', '-1', '1.5'])(
      'does not send a quantity of %s',
      async (quantity) => {
        mockCatalog()
        const requests = mockPostInvoices(createdInvoice())
        const { user } = openForm()
        await chooseCustomer(user)
        await chooseProduct(user, 1, prius)

        await enterQuantity(user, 1, quantity)
        await user.click(saveButton())

        expect(
          await screen.findByText('Enter a whole quantity from 1 to 1 000 000')
        ).toBeInTheDocument()
        expect(requests).toHaveLength(0)
      }
    )

    it('does not send a deadline before the date', async () => {
      freezeToday('2026-09-29')
      mockCatalog()
      const requests = mockPostInvoices(createdInvoice())
      const { user } = openForm()
      await fillValidForm(user)

      await setDate(user, deadlineField(), '2026-09-28')
      await user.click(saveButton())

      expect(
        await screen.findByText('The deadline cannot be before the date')
      ).toBeInTheDocument()
      expect(requests).toHaveLength(0)
    })

    it('sends a deadline on the date', async () => {
      freezeToday('2026-09-29')
      mockCatalog()
      const requests = mockPostInvoices(createdInvoice())
      mockDetail(createdInvoice())
      const { user } = openForm()
      await fillValidForm(user)

      await setDate(user, deadlineField(), '2026-09-29')
      await user.click(saveButton())

      await waitFor(() => expect(requests).toHaveLength(1))
      expect((await sentBody(requests[0])).invoice.deadline).toBe('2026-09-29')
    })

    it('does not send an invoice without lines', async () => {
      mockCatalog()
      const requests = mockPostInvoices(createdInvoice())
      const { user } = openForm()
      await chooseCustomer(user)
      await user.click(screen.getByRole('button', { name: 'Remove line 1' }))

      await user.click(saveButton())

      expect(
        await screen.findByText('Add at least one line')
      ).toBeInTheDocument()
      expect(requests).toHaveLength(0)
    })

    it('clears a message once its field is fixed', async () => {
      mockCatalog()
      const { user } = openForm()
      await user.click(
        await screen.findByRole('button', { name: 'Save invoice' })
      )
      expect(await screen.findByText('Select a customer')).toBeInTheDocument()

      await chooseCustomer(user)

      await waitFor(() =>
        expect(screen.queryByText('Select a customer')).not.toBeInTheDocument()
      )
    })
  })

  describe('saving', () => {
    it('sends the customer, dates and lines, as a draft, and nothing else', async () => {
      freezeToday('2026-09-29')
      mockCatalog()
      const requests = mockPostInvoices(createdInvoice())
      mockDetail(createdInvoice())
      const { user } = openForm()
      await fillValidForm(user)

      await user.click(saveButton())

      await waitFor(() => expect(requests).toHaveLength(1))
      expect(await sentBody(requests[0])).toEqual({
        invoice: {
          customer_id: 1,
          date: '2026-09-29',
          deadline: null,
          finalized: false,
          invoice_lines_attributes: [
            { product_id: 12, quantity: 2 },
            { product_id: 11, quantity: 1 },
          ],
        },
      })
    })

    it('sends one request when activated twice while saving', async () => {
      mockCatalog()
      const requests = mockPostInvoices(createdInvoice(), { delay: 'infinite' })
      const { user } = openForm()
      await fillValidForm(user)

      await user.click(saveButton())
      await user.click(saveButton())

      await waitFor(() => expect(requests).toHaveLength(1))
      expect(saveButton()).toHaveClass('ant-btn-loading')
      expect(requests).toHaveLength(1)
    })
  })

  describe('saved invoice', () => {
    it('confirms and shows the detail page of the new invoice', async () => {
      mockCatalog()
      const created = buildInvoice({
        id: 100500,
        customer: jeannie,
        invoice_lines: [
          {
            ...buildInvoice().invoice_lines[0],
            id: 1,
            label: 'Toyota Prius',
            quantity: 2,
            price: '36840.0',
            vat_rate: '10',
            product: prius,
          },
        ],
      })
      mockPostInvoices(created)
      mockDetail(created)
      const { user, router } = openForm()
      await fillValidForm(user)

      await user.click(saveButton())

      expect(
        await screen.findByText('Invoice #100500 created')
      ).toBeInTheDocument()
      expect(
        await screen.findByRole('heading', { name: 'Invoice #100500' })
      ).toBeInTheDocument()
      expect(screen.getByText('Toyota Prius')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/invoices/100500')
    })

    it('goes back to the list, not to the form', async () => {
      mockCatalog()
      mockEndpoint({
        endpointName: 'getInvoices',
        response: buildInvoicesPage([buildInvoice({ id: 100389 })]),
      })
      const created = createdInvoice()
      mockPostInvoices(created)
      mockDetail(created)
      const user = userEvent.setup()
      const { router } = renderApp('/')
      await user.click(
        await screen.findByRole('link', { name: 'Create invoice' })
      )
      await fillValidForm(user)
      await user.click(saveButton())
      await screen.findByRole('heading', { name: 'Invoice #100500' })

      // The router updates React state outside of a user event.
      await act(() => router.navigate(-1))

      expect(router.state.location.pathname).toBe('/')
      expect(
        await screen.findByRole('link', { name: '#100389' })
      ).toBeInTheDocument()
    })

    it('requests the list again when it is shown after a creation', async () => {
      mockCatalog()
      const listRequests = mockEndpoint({
        endpointName: 'getInvoices',
        response: buildInvoicesPage([buildInvoice({ id: 100389 })]),
      })
      const created = createdInvoice()
      mockPostInvoices(created)
      mockDetail(created)
      const user = userEvent.setup()
      const { router } = renderApp('/')
      await user.click(
        await screen.findByRole('link', { name: 'Create invoice' })
      )
      expect(listRequests).toHaveLength(1)
      await fillValidForm(user)
      await user.click(saveButton())
      await screen.findByRole('heading', { name: 'Invoice #100500' })

      // The router updates React state outside of a user event.
      await act(() => router.navigate(-1))

      await waitFor(() => expect(listRequests).toHaveLength(2))
    })
  })

  describe('save failure', () => {
    it('shows the reason given by the server and keeps the values', async () => {
      mockCatalog()
      mockPostInvoices(
        { message: 'Validation failed: Invoice lines product must exist' },
        { status: 422 }
      )
      const { user } = openForm()
      await fillValidForm(user)

      await user.click(saveButton())

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('The invoice could not be saved')
      expect(alert).toHaveTextContent(
        'Validation failed: Invoice lines product must exist'
      )
      expect(customerField().parentElement).toHaveTextContent('Jeannie Flatley')
      expect(productField(1).parentElement).toHaveTextContent('Toyota Prius')
      expect(productField(2).parentElement).toHaveTextContent('Toyota Camry')
      expect(quantityField(1)).toHaveValue('2')
      expect(quantityField(2)).toHaveValue('1')
    })

    it('says the server could not be reached', async () => {
      mockCatalog()
      server.use(
        http.post(`${serverBaseURL}/invoices`, () => HttpResponse.error())
      )
      const { user } = openForm()
      await fillValidForm(user)

      await user.click(saveButton())

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('The invoice could not be saved')
      expect(alert).toHaveTextContent('The server could not be reached')
    })

    it('saves again after a failure', async () => {
      mockCatalog()
      const created = createdInvoice()
      server.use(
        http.post(
          `${serverBaseURL}/invoices`,
          () => HttpResponse.json({ message: 'Oops' }, { status: 500 }),
          { once: true }
        )
      )
      const { user } = openForm()
      await fillValidForm(user)
      await user.click(saveButton())
      await screen.findByRole('alert')

      mockPostInvoices(created)
      mockDetail(created)
      await user.click(saveButton())

      expect(
        await screen.findByRole('heading', { name: 'Invoice #100500' })
      ).toBeInTheDocument()
    })
  })

  describe('cancel', () => {
    it('returns to the list and sends nothing', async () => {
      mockCatalog()
      mockEndpoint({
        endpointName: 'getInvoices',
        response: buildInvoicesPage([buildInvoice({ id: 100389 })]),
      })
      const requests = mockPostInvoices(createdInvoice())
      const { user, router } = openForm()
      await chooseCustomer(user)

      await user.click(screen.getByRole('link', { name: 'Cancel' }))

      expect(router.state.location.pathname).toBe('/')
      expect(
        await screen.findByRole('link', { name: '#100389' })
      ).toBeInTheDocument()
      expect(requests).toHaveLength(0)
    })
  })
})
