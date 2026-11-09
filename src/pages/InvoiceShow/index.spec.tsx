import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { act, renderApp, screen, waitFor, within } from '../../specs/testUtils'
import { mockEndpoint, server, serverBaseURL } from '../../specs/mocks/server'
import { mockDeleteInvoice, mockPutInvoice } from '../../specs/mocks/invoice'
import { normalizeSpaces } from '../../specs/normalizeSpaces'
import {
  buildFinalizedInvoice,
  buildIncompleteDraftInvoice,
  buildInvoice,
  buildInvoicesPage,
  buildPaidInvoice,
  buildToyotaInvoice,
} from '../../specs/fixtures/invoices'
import { Invoice } from '../../types'

const mockInvoice = (
  id: number,
  response: Invoice | { message: string },
  options: { status?: number; delay?: 'infinite' } = {}
) =>
  mockEndpoint({
    endpointName: 'getInvoice',
    params: { pathParams: { id: String(id) } },
    response,
    ...options,
  })

const line = (overrides: Partial<Invoice['invoice_lines'][number]> = {}) => ({
  ...buildInvoice().invoice_lines[0],
  ...overrides,
})

// The value shown next to a label of the details block.
const detail = (label: string) =>
  normalizeSpaces(
    screen.getByText(label).closest('.ant-descriptions-item')?.textContent ?? ''
  )

// The amount shown next to a label of the totals block.
const total = (label: string) =>
  normalizeSpaces(screen.getByText(label).parentElement?.textContent ?? '')

const sentBody = async (request: Request) => request.json()

// The lifecycle action of an invoice, found by its accessible name (the visible
// label followed by the invoice number). A regex tolerates the icon that antd
// adds to the accessible name while the button shows progress.
const actionButton = (label: string, id: number) =>
  screen.getByRole('button', { name: new RegExp(`${label}, invoice #${id}`) })

const actionQuery = (label: string, id: number) =>
  screen.queryByRole('button', { name: new RegExp(`${label}, invoice #${id}`) })

describe('InvoiceShow', () => {
  describe('invoice details', () => {
    it('shows the number, status, dates, customer and address', async () => {
      mockInvoice(
        100389,
        buildInvoice({
          id: 100389,
          finalized: true,
          paid: false,
          date: '2026-09-01',
          deadline: '2026-10-15',
        })
      )
      renderApp('/invoices/100389')

      expect(
        await screen.findByRole('heading', { name: 'Invoice #100389' })
      ).toBeInTheDocument()
      expect(screen.getByText('Finalized')).toBeInTheDocument()
      expect(screen.queryByText('Draft')).not.toBeInTheDocument()
      expect(detail('Date')).toContain('2026-09-01')
      expect(detail('Deadline')).toContain('2026-10-15')
      expect(detail('Customer')).toContain('Jeannie Flatley')
      expect(detail('Address')).toContain(
        '1320 Evelynn Dam, 57824 Gleasonview, Montserrat'
      )
    })

    it('shows only the parts of the address that exist', async () => {
      const customer = {
        ...buildInvoice().customer!,
        address: '',
        zip_code: '',
      }
      mockInvoice(100389, buildInvoice({ id: 100389, customer }))
      renderApp('/invoices/100389')

      await screen.findByRole('heading', { name: 'Invoice #100389' })
      expect(detail('Address')).toMatch(/Gleasonview, Montserrat$/)
      expect(detail('Address')).not.toContain(', ,')
    })

    it('shows a dash for an address that is entirely empty', async () => {
      const customer = {
        ...buildInvoice().customer!,
        address: '',
        zip_code: '',
        city: '',
        country: '',
      }
      mockInvoice(100389, buildInvoice({ id: 100389, customer }))
      renderApp('/invoices/100389')

      await screen.findByRole('heading', { name: 'Invoice #100389' })
      expect(detail('Address')).toMatch(/-$/)
    })

    it('shows a dash for a missing deadline', async () => {
      mockInvoice(100389, buildInvoice({ id: 100389, deadline: null }))
      renderApp('/invoices/100389')

      await screen.findByRole('heading', { name: 'Invoice #100389' })
      expect(detail('Deadline')).toMatch(/-$/)
    })
  })

  describe('lines', () => {
    it('shows label, quantity, unit, unit price, VAT rate and amount', async () => {
      mockInvoice(
        100389,
        buildInvoice({
          id: 100389,
          invoice_lines: [
            line({
              id: 1,
              label: 'Toyota Prius',
              quantity: 2,
              unit: 'piece',
              vat_rate: '10',
              price: '36840.0',
              product: {
                ...line().product!,
                unit_price: '18420.0',
              },
            }),
          ],
        })
      )
      renderApp('/invoices/100389')

      const row = (await screen.findByText('Toyota Prius')).closest('tr')!
      const cells = within(row)
        .getAllByRole('cell')
        .map((cell) => normalizeSpaces(cell.textContent ?? ''))
      expect(cells).toEqual([
        'Toyota Prius',
        '2',
        'piece',
        '18 420,00 €',
        '10 %',
        '36 840,00 €',
      ])
    })

    it('says there are no lines and shows zero totals', async () => {
      mockInvoice(100389, buildInvoice({ id: 100389, invoice_lines: [] }))
      renderApp('/invoices/100389')

      expect(await screen.findByText('No lines')).toBeInTheDocument()
      expect(total('Total excluding VAT')).toContain('0,00 €')
      expect(total('VAT')).toContain('0,00 €')
      expect(total('Total including VAT')).toContain('0,00 €')
    })
  })

  describe('totals', () => {
    it('derives the totals of a seeded invoice from its lines', async () => {
      mockInvoice(
        100389,
        buildInvoice({
          id: 100389,
          total: null,
          tax: null,
          invoice_lines: [
            line({
              id: 1,
              label: 'Audi A7',
              vat_rate: '20',
              price: '105340.0',
              tax: '21068.0',
            }),
            line({
              id: 2,
              label: 'Toyota Prius',
              vat_rate: '10',
              price: '36840.0',
              tax: '3684.0',
            }),
          ],
        })
      )
      renderApp('/invoices/100389')

      await screen.findByText('Audi A7')
      expect(total('Total excluding VAT')).toContain('121 274,24 €')
      expect(total('VAT')).toContain('20 905,76 €')
      expect(total('Total including VAT')).toContain('142 180,00 €')
    })
  })

  describe('way back', () => {
    it.each([
      ['a draft', { finalized: false, paid: false }],
      ['a finalized invoice', { finalized: true, paid: false }],
      ['a paid invoice', { finalized: true, paid: true }],
    ])('returns to the list from %s', async (_, status) => {
      const user = userEvent.setup()
      mockInvoice(100389, buildInvoice({ id: 100389, ...status }))
      mockEndpoint({
        endpointName: 'getInvoices',
        response: buildInvoicesPage([buildInvoice({ id: 100390 })]),
      })
      const { router } = renderApp('/invoices/100389')

      await user.click(
        await screen.findByRole('link', { name: 'Back to invoices' })
      )

      expect(
        await screen.findByRole('link', { name: '#100390' })
      ).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/')
    })
  })

  describe('edit entry point', () => {
    it('opens the edit page of a draft', async () => {
      const user = userEvent.setup()
      mockInvoice(100389, buildInvoice({ id: 100389, finalized: false }))
      // The edit page (not under test) loads these when it opens.
      mockEndpoint({
        endpointName: 'getSearchCustomers',
        response: {
          customers: [],
          pagination: buildInvoicesPage([]).pagination,
        },
      })
      mockEndpoint({
        endpointName: 'getSearchProducts',
        response: {
          products: [],
          pagination: buildInvoicesPage([]).pagination,
        },
      })
      const { router } = renderApp('/invoices/100389')

      await user.click(await screen.findByRole('link', { name: 'Edit' }))

      expect(router.state.location.pathname).toBe('/invoices/100389/edit')
    })

    it('has no edit link for a finalized invoice', async () => {
      mockInvoice(100389, buildInvoice({ id: 100389, finalized: true }))
      renderApp('/invoices/100389')

      await screen.findByRole('heading', { name: 'Invoice #100389' })
      expect(
        screen.queryByRole('link', { name: 'Edit' })
      ).not.toBeInTheDocument()
    })
  })

  describe('request states', () => {
    it('shows a loading indicator while the invoice is requested', async () => {
      mockInvoice(100389, buildInvoice({ id: 100389 }), { delay: 'infinite' })
      renderApp('/invoices/100389')

      expect(await screen.findByText('Loading invoice')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('says "Invoice not found" for an unknown invoice, without retry', async () => {
      mockInvoice(999999, { message: 'Not Found' }, { status: 404 })
      renderApp('/invoices/999999')

      expect(await screen.findByText('Invoice not found')).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Back to invoices' })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Retry' })
      ).not.toBeInTheDocument()
    })

    it.each(['abc', '0'])(
      'says "Invoice not found" for /invoices/%s without calling the API',
      async (id) => {
        const requests = mockEndpoint({
          endpointName: 'getInvoice',
          params: { pathParams: { id } },
          response: buildInvoice(),
        })
        renderApp(`/invoices/${id}`)

        expect(await screen.findByText('Invoice not found')).toBeInTheDocument()
        expect(requests).toHaveLength(0)
      }
    )

    it('shows an error and a retry button when the request fails', async () => {
      mockInvoice(100389, { message: 'Internal Server Error' }, { status: 500 })
      renderApp('/invoices/100389')

      expect(
        await screen.findByText('Invoice could not be loaded')
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
      expect(screen.queryByText('Invoice not found')).not.toBeInTheDocument()
    })

    it('announces the error again when a retry fails', async () => {
      const user = userEvent.setup()
      mockInvoice(100389, { message: 'Internal Server Error' }, { status: 500 })
      renderApp('/invoices/100389')
      const retry = await screen.findByRole('button', { name: 'Retry' })
      const alert = screen.getByRole('alert')

      const requests = mockInvoice(
        100389,
        { message: 'Internal Server Error' },
        { status: 500 }
      )
      await user.click(retry)

      await waitFor(() => expect(requests).toHaveLength(1))
      // A new element is what a screen reader announces again; the button
      // stays, and keeps the focus.
      await waitFor(() => expect(screen.getByRole('alert')).not.toBe(alert))
      expect(screen.getByRole('button', { name: 'Retry' })).toBe(retry)
    })

    it('shows the invoice after a successful retry', async () => {
      const user = userEvent.setup()
      mockInvoice(100389, { message: 'Internal Server Error' }, { status: 500 })
      renderApp('/invoices/100389')
      const retry = await screen.findByRole('button', { name: 'Retry' })

      const requests = mockInvoice(100389, buildInvoice({ id: 100389 }))
      await user.click(retry)

      expect(
        await screen.findByRole('heading', { name: 'Invoice #100389' })
      ).toBeInTheDocument()
      expect(
        screen.queryByText('Invoice could not be loaded')
      ).not.toBeInTheDocument()
      expect(requests).toHaveLength(1)
    })
  })

  describe('lifecycle actions', () => {
    describe('actions offered by status', () => {
      it.each<[string, Invoice, string[]]>([
        ['a draft', buildToyotaInvoice(), ['Finalize', 'Delete']],
        ['a finalized invoice', buildFinalizedInvoice(), ['Mark as paid']],
        ['a paid invoice', buildPaidInvoice(), ['Mark as unpaid']],
      ])('offers only the actions of %s', async (_, invoice, labels) => {
        mockInvoice(invoice.id, invoice)
        renderApp(`/invoices/${invoice.id}`)

        await screen.findByRole('heading', { name: `Invoice #${invoice.id}` })

        for (const label of [
          'Finalize',
          'Delete',
          'Mark as paid',
          'Mark as unpaid',
        ]) {
          const button = actionQuery(label, invoice.id)
          if (labels.includes(label)) expect(button).toBeInTheDocument()
          else expect(button).not.toBeInTheDocument()
        }
      })

      it('offers Finalize and Delete for a draft flagged as paid, without Mark as unpaid', async () => {
        const invoice = buildToyotaInvoice({ paid: true })
        mockInvoice(invoice.id, invoice)
        renderApp(`/invoices/${invoice.id}`)
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        expect(actionButton('Finalize', 100500)).toBeInTheDocument()
        expect(actionButton('Delete', 100500)).toBeInTheDocument()
        expect(actionQuery('Mark as unpaid', 100500)).not.toBeInTheDocument()
      })
    })

    describe('finalize', () => {
      it('finalizes a complete draft from the detail page after confirmation', async () => {
        const user = userEvent.setup()
        const finalized = { ...buildToyotaInvoice(), finalized: true }
        mockInvoice(100500, buildToyotaInvoice())
        const requests = mockPutInvoice(100500, finalized)
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Finalize', 100500))

        expect(
          await screen.findAllByText('Finalize invoice #100500?')
        ).not.toHaveLength(0)
        expect(
          screen.getByText(
            'A finalized invoice can no longer be edited or deleted.'
          )
        ).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Finalize' }))

        await waitFor(() => expect(requests).toHaveLength(1))
        expect(await sentBody(requests[0])).toEqual({
          invoice: { id: 100500, finalized: true },
        })
        expect(
          await screen.findByText('Invoice #100500 finalized')
        ).toBeInTheDocument()
        expect(await screen.findByText('Finalized')).toBeInTheDocument()
        expect(actionButton('Mark as paid', 100500)).toBeInTheDocument()
        expect(
          screen.queryByRole('link', { name: 'Edit' })
        ).not.toBeInTheDocument()
        expect(actionQuery('Finalize', 100500)).not.toBeInTheDocument()
        expect(actionQuery('Delete', 100500)).not.toBeInTheDocument()
      })

      it('sends nothing when the dialog is cancelled', async () => {
        const user = userEvent.setup()
        mockInvoice(100500, buildToyotaInvoice())
        const requests = mockPutInvoice(100500, buildToyotaInvoice())
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Finalize', 100500))
        await screen.findAllByText('Finalize invoice #100500?')

        await user.click(screen.getByRole('button', { name: 'Cancel' }))

        await waitFor(() =>
          expect(
            screen.queryAllByText('Finalize invoice #100500?')
          ).toHaveLength(0)
        )
        expect(requests).toHaveLength(0)
        expect(screen.getByText('Draft')).toBeInTheDocument()
      })

      it('sends nothing when the dialog is closed with Escape', async () => {
        const user = userEvent.setup()
        mockInvoice(100500, buildToyotaInvoice())
        const requests = mockPutInvoice(100500, buildToyotaInvoice())
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Finalize', 100500))
        await screen.findAllByText('Finalize invoice #100500?')

        await user.keyboard('{Escape}')

        await waitFor(() =>
          expect(
            screen.queryAllByText('Finalize invoice #100500?')
          ).toHaveLength(0)
        )
        expect(requests).toHaveLength(0)
      })

      it('refuses a draft without lines and says what to fix', async () => {
        const user = userEvent.setup()
        const invoice = buildToyotaInvoice({ invoice_lines: [] })
        mockInvoice(100500, invoice)
        const requests = mockPutInvoice(100500, invoice)
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Finalize', 100500))

        expect(
          await screen.findAllByText('Invoice #100500 cannot be finalized yet')
        ).not.toHaveLength(0)
        expect(screen.getByText('Add at least one line')).toBeInTheDocument()
        expect(requests).toHaveLength(0)
      })

      it('lists all the rules a draft that holds nothing breaks', async () => {
        const user = userEvent.setup()
        mockInvoice(100500, buildIncompleteDraftInvoice())
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Finalize', 100500))

        expect(
          await screen.findAllByText('Invoice #100500 cannot be finalized yet')
        ).not.toHaveLength(0)
        expect(screen.getByText('Select a customer')).toBeInTheDocument()
        expect(screen.getByText('Enter a date')).toBeInTheDocument()
        expect(screen.getByText('Add at least one line')).toBeInTheDocument()
      })

      it('lists every broken rule with its line and links to the edit page', async () => {
        const user = userEvent.setup()
        const invoice = buildToyotaInvoice({ date: null })
        invoice.invoice_lines[1] = { ...invoice.invoice_lines[1], quantity: 0 }
        mockInvoice(100500, invoice)
        // The edit page loads the customer and product searches when it opens.
        mockEndpoint({
          endpointName: 'getSearchCustomers',
          response: {
            customers: [],
            pagination: buildInvoicesPage([]).pagination,
          },
        })
        mockEndpoint({
          endpointName: 'getSearchProducts',
          response: {
            products: [],
            pagination: buildInvoicesPage([]).pagination,
          },
        })
        const { router } = renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Finalize', 100500))

        expect(
          await screen.findAllByText('Invoice #100500 cannot be finalized yet')
        ).not.toHaveLength(0)
        expect(screen.getByText('Enter a date')).toBeInTheDocument()
        expect(
          screen.getByText('Line 2: Enter a whole quantity from 1 to 1 000 000')
        ).toBeInTheDocument()

        await user.click(screen.getByRole('link', { name: 'Edit invoice' }))

        expect(router.state.location.pathname).toBe('/invoices/100500/edit')
      })
    })

    describe('delete', () => {
      it('deletes a draft from the detail page and shows the list', async () => {
        const user = userEvent.setup()
        mockInvoice(100500, buildToyotaInvoice())
        mockEndpoint({
          endpointName: 'getInvoices',
          response: buildInvoicesPage([buildInvoice({ id: 100501 })]),
        })
        const requests = mockDeleteInvoice(100500)
        const { router } = renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Delete', 100500))

        expect(
          await screen.findAllByText('Delete invoice #100500?')
        ).not.toHaveLength(0)
        expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Delete' }))

        await waitFor(() => expect(requests).toHaveLength(1))
        expect(
          await screen.findByText('Invoice #100500 deleted')
        ).toBeInTheDocument()
        expect(router.state.location.pathname).toBe('/')
        expect(
          await screen.findByRole('link', { name: '#100501' })
        ).toBeInTheDocument()
        expect(
          screen.queryByRole('link', { name: '#100500' })
        ).not.toBeInTheDocument()
      })

      it('does not reopen the deleted invoice with the browser Back button', async () => {
        const user = userEvent.setup()
        const invoices = [
          buildToyotaInvoice(),
          buildToyotaInvoice({ id: 100501 }),
        ]
        mockEndpoint({
          endpointName: 'getInvoices',
          response: () => buildInvoicesPage(invoices),
        })
        mockInvoice(100500, buildToyotaInvoice())
        mockDeleteInvoice(100500, {
          onRequest: () => invoices.splice(0, 1),
        })
        const { router } = renderApp('/')
        await user.click(await screen.findByRole('link', { name: '#100500' }))
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Delete', 100500))
        await user.click(await screen.findByRole('button', { name: 'Delete' }))
        await screen.findByText('Invoice #100500 deleted')

        // The router updates React state outside of a user event.
        await act(() => router.navigate(-1))

        expect(router.state.location.pathname).not.toBe('/invoices/100500')
        expect(
          screen.queryByRole('heading', { name: 'Invoice #100500' })
        ).not.toBeInTheDocument()
      })

      it('does not request the deleted invoice again after deleting it', async () => {
        const user = userEvent.setup()
        mockEndpoint({
          endpointName: 'getInvoices',
          response: buildInvoicesPage([buildInvoice({ id: 100501 })]),
        })
        const gets = mockInvoice(100500, buildToyotaInvoice())
        mockDeleteInvoice(100500)
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })
        expect(gets).toHaveLength(1)

        await user.click(actionButton('Delete', 100500))
        await user.click(await screen.findByRole('button', { name: 'Delete' }))
        await screen.findByText('Invoice #100500 deleted')

        expect(gets).toHaveLength(1)
      })

      it('sends nothing when the dialog is cancelled', async () => {
        const user = userEvent.setup()
        mockInvoice(100500, buildToyotaInvoice())
        const requests = mockDeleteInvoice(100500)
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Delete', 100500))
        await screen.findAllByText('Delete invoice #100500?')

        await user.click(screen.getByRole('button', { name: 'Cancel' }))

        await waitFor(() =>
          expect(screen.queryAllByText('Delete invoice #100500?')).toHaveLength(
            0
          )
        )
        expect(requests).toHaveLength(0)
        expect(
          screen.getByRole('heading', { name: 'Invoice #100500' })
        ).toBeInTheDocument()
      })

      it('sends nothing when the dialog is closed with Escape', async () => {
        const user = userEvent.setup()
        mockInvoice(100500, buildToyotaInvoice())
        const requests = mockDeleteInvoice(100500)
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Delete', 100500))
        await screen.findAllByText('Delete invoice #100500?')

        await user.keyboard('{Escape}')

        await waitFor(() =>
          expect(screen.queryAllByText('Delete invoice #100500?')).toHaveLength(
            0
          )
        )
        expect(requests).toHaveLength(0)
      })
    })

    describe('mark as paid or unpaid', () => {
      it('marks a finalized invoice as paid, showing the status before the answer', async () => {
        const user = userEvent.setup()
        const paid = { ...buildFinalizedInvoice(), paid: true }
        mockInvoice(100417, buildFinalizedInvoice())
        const requests = mockPutInvoice(100417, paid, { delay: 500 })
        renderApp('/invoices/100417')
        await screen.findByRole('heading', { name: 'Invoice #100417' })

        await user.click(actionButton('Mark as paid', 100417))

        expect(await screen.findByText('Paid')).toBeInTheDocument()
        await waitFor(() => expect(requests).toHaveLength(1))
        expect(await sentBody(requests[0])).toEqual({
          invoice: { id: 100417, paid: true },
        })
        expect(
          await screen.findByText('Invoice #100417 marked as paid')
        ).toBeInTheDocument()
        expect(actionButton('Mark as unpaid', 100417)).toBeInTheDocument()
      })

      it('marks a paid invoice as unpaid', async () => {
        const user = userEvent.setup()
        const unpaid = { ...buildPaidInvoice(), paid: false }
        mockInvoice(100421, buildPaidInvoice())
        const requests = mockPutInvoice(100421, unpaid)
        renderApp('/invoices/100421')
        await screen.findByRole('heading', { name: 'Invoice #100421' })

        await user.click(actionButton('Mark as unpaid', 100421))

        expect(
          await screen.findByText('Invoice #100421 marked as unpaid')
        ).toBeInTheDocument()
        expect(await sentBody(requests[0])).toEqual({
          invoice: { id: 100421, paid: false },
        })
        expect(await screen.findByText('Finalized')).toBeInTheDocument()
        expect(actionButton('Mark as paid', 100421)).toBeInTheDocument()
      })

      it('shows the previous status again when the server refuses', async () => {
        const user = userEvent.setup()
        mockInvoice(100417, buildFinalizedInvoice())
        mockPutInvoice(100417, { message: 'Refused' }, { status: 422 })
        renderApp('/invoices/100417')
        await screen.findByRole('heading', { name: 'Invoice #100417' })
        expect(screen.getByText('Finalized')).toBeInTheDocument()

        await user.click(actionButton('Mark as paid', 100417))

        expect(
          await screen.findByText('Invoice #100417 could not be marked as paid')
        ).toBeInTheDocument()
        expect(await screen.findByText('Finalized')).toBeInTheDocument()
        expect(screen.queryByText('Paid')).not.toBeInTheDocument()
      })
    })

    describe('progress while an action runs', () => {
      it('shows progress on the action and disables the others and Edit', async () => {
        const user = userEvent.setup()
        mockInvoice(100500, buildToyotaInvoice())
        mockPutInvoice(100500, buildToyotaInvoice(), { delay: 'infinite' })
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Finalize', 100500))
        await user.click(
          await screen.findByRole('button', { name: 'Finalize' })
        )

        await waitFor(() =>
          expect(actionButton('Finalize', 100500)).toHaveClass(
            'ant-btn-loading'
          )
        )
        expect(actionButton('Delete', 100500)).toBeDisabled()
        expect(screen.getByText('Edit').closest('a, button')).toHaveAttribute(
          'aria-disabled',
          'true'
        )
      })
    })

    describe('failed action', () => {
      it('reports why a deletion failed and reloads the invoice', async () => {
        const user = userEvent.setup()
        // The invoice was finalized in another tab: the reload shows it.
        let finalized = false
        const gets = mockEndpoint({
          endpointName: 'getInvoice',
          params: { pathParams: { id: '100500' } },
          response: () =>
            finalized
              ? { ...buildToyotaInvoice(), finalized: true }
              : buildToyotaInvoice(),
        })
        mockDeleteInvoice(100500, {
          status: 422,
          response: {
            message: 'Une facture finalisée ne peut pas être supprimée',
          },
          onRequest: () => {
            finalized = true
          },
        })
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Delete', 100500))
        await user.click(await screen.findByRole('button', { name: 'Delete' }))

        expect(
          await screen.findByText('Invoice #100500 could not be deleted')
        ).toBeInTheDocument()
        expect(
          await screen.findByText(
            'Une facture finalisée ne peut pas être supprimée'
          )
        ).toBeInTheDocument()
        expect(await screen.findByText('Finalized')).toBeInTheDocument()
        await waitFor(() => expect(gets.length).toBeGreaterThan(1))
        expect(actionButton('Mark as paid', 100500)).toBeInTheDocument()
      })

      it('says the server could not be reached when finalizing', async () => {
        const user = userEvent.setup()
        mockInvoice(100500, buildToyotaInvoice())
        server.use(
          http.put(`${serverBaseURL}/invoices/100500`, () =>
            HttpResponse.error()
          )
        )
        renderApp('/invoices/100500')
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Finalize', 100500))
        await user.click(
          await screen.findByRole('button', { name: 'Finalize' })
        )

        expect(
          await screen.findByText('Invoice #100500 could not be finalized')
        ).toBeInTheDocument()
        expect(
          await screen.findByText(/server could not be reached/)
        ).toBeInTheDocument()
        expect(screen.getByText('Draft')).toBeInTheDocument()
      })
    })

    describe('views stay current after an action', () => {
      it('shows the finalized status in the list after finalizing from the detail page', async () => {
        const user = userEvent.setup()
        const finalized = { ...buildToyotaInvoice(), finalized: true }
        mockEndpoint({
          endpointName: 'getInvoices',
          response: buildInvoicesPage([buildToyotaInvoice()]),
        })
        mockInvoice(100500, buildToyotaInvoice())
        mockPutInvoice(100500, finalized)
        const { router } = renderApp('/')
        await user.click(await screen.findByRole('link', { name: '#100500' }))
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        await user.click(actionButton('Finalize', 100500))
        await user.click(
          await screen.findByRole('button', { name: 'Finalize' })
        )
        await screen.findByText('Invoice #100500 finalized')

        mockEndpoint({
          endpointName: 'getInvoices',
          response: buildInvoicesPage([finalized]),
        })
        await user.click(screen.getByRole('link', { name: 'Back to invoices' }))

        const row = (
          await screen.findByRole('link', { name: '#100500' })
        ).closest('tr')!
        expect(row).toHaveTextContent('Finalized')
        expect(router.state.location.pathname).toBe('/')
      })
    })
  })
})
