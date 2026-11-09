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
import {
  buildInvoice,
  buildInvoicesPage,
  buildToyotaInvoice,
} from '../../specs/fixtures/invoices'
import { Invoice, Product } from '../../types'

const jeannie = buildCustomer({ id: 1 })
const prius = buildProduct({ id: 12, label: 'Toyota Prius' })
const camry = buildProduct({
  id: 11,
  label: 'Toyota Camry',
  vat_rate: '20',
  unit_price: '22840.0',
})
const corolla = buildProduct({
  id: 111,
  label: 'Toyota Corolla',
  vat_rate: '20',
  unit_price: '20000.0',
})

// The product search answers with the fixtures whose label contains the
// searched text, like the API does.
const mockCatalog = (products: Product[] = [prius, camry, corolla]) => {
  const search = (request: Request) =>
    new URL(request.url).searchParams.get('query')?.toLowerCase() ?? ''
  mockEndpoint({
    endpointName: 'getSearchCustomers',
    response: buildCustomersPage([jeannie]),
  })
  mockEndpoint({
    endpointName: 'getSearchProducts',
    response: (request) =>
      buildProductsPage(
        products.filter((p) => p.label.toLowerCase().includes(search(request)))
      ),
  })
}

const mockInvoice = (invoice: Invoice, options: { delay?: 'infinite' } = {}) =>
  mockEndpoint({
    endpointName: 'getInvoice',
    params: { pathParams: { id: String(invoice.id) } },
    response: invoice,
    ...options,
  })

// The update of invoice `id`: the requests received and the answer given.
const mockPutInvoice = (
  id: number,
  response: object,
  options: { status?: number; delay?: number | 'infinite' } = {}
) =>
  mockEndpoint({
    endpointName: 'putInvoice',
    params: { pathParams: { id: String(id) } },
    response,
    ...options,
  })

const sentBody = async (request: Request) => request.json()

const productField = (line: number) =>
  screen.getByRole('combobox', { name: `Product, line ${line}` })
const quantityField = (line: number) =>
  screen.getByRole('spinbutton', { name: `Quantity, line ${line}` })
const customerField = () => screen.getByRole('combobox', { name: 'Customer' })
const dateField = () => screen.getByRole('textbox', { name: 'Date' })
const deadlineField = () => screen.getByRole('textbox', { name: 'Deadline' })
const saveButton = () => screen.getByRole('button', { name: /Save changes$/ })

// The row of a line: the container of its product field (the implementation
// marks each row with a `data-line` attribute, as in the creation form).
const lineRow = (line: number) =>
  productField(line).closest('[data-line]') as HTMLElement

const totalsText = (label: string) =>
  normalizeSpaces(screen.getByText(label).parentElement?.textContent ?? '')

// A search is sent after a debounce delay: `choose` waits for the request, so
// that none is sent after the test ended. A search text already sent is
// answered from the query cache, with no new request to wait for, so every
// search in a test must use a distinct text.
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

// antd hides the clear button of a picker from pointer events until the
// picker is hovered, so this click skips that check.
const clearDeadline = async () => {
  const picker = deadlineField().closest('.ant-picker') as HTMLElement
  await userEvent
    .setup({ pointerEventsCheck: 0 })
    .click(within(picker).getByRole('button', { name: 'Clear' }))
  await waitFor(() => expect(deadlineField()).toHaveValue(''))
}

// Opens the edit page of `invoice` and waits for the form.
const openEdit = async (invoice: Invoice = buildToyotaInvoice()) => {
  mockCatalog()
  mockInvoice(invoice)
  const user = userEvent.setup()
  const rendered = renderApp(`/invoices/${invoice.id}/edit`)
  await screen.findByRole('heading', { name: `Edit invoice #${invoice.id}` })
  return { user, ...rendered }
}

// Saves the invoice with `answer` as the API's answer; the detail page that
// follows may ask the API again, so it is mocked too.
const saveWith = async (
  user: ReturnType<typeof userEvent.setup>,
  answer: Invoice
) => {
  const requests = mockPutInvoice(answer.id, answer)
  mockInvoice(answer)
  await user.click(saveButton())
  await waitFor(() => expect(requests).toHaveLength(1))
  return sentBody(requests[0])
}

const invoiceFields = {
  id: 100500,
  customer_id: 1,
  date: '2026-09-29',
  deadline: '2026-10-29',
}

describe('InvoiceEdit', () => {
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
  })

  describe('edit form filled from the invoice', () => {
    it('opens with the values of the invoice', async () => {
      await openEdit()

      expect(
        screen.getByRole('heading', { name: 'Edit invoice #100500' })
      ).toBeInTheDocument()
      expect(customerField().parentElement).toHaveTextContent('Jeannie Flatley')
      expect(dateField()).toHaveValue('2026-09-29')
      expect(deadlineField()).toHaveValue('2026-10-29')
      expect(
        screen.getAllByRole('combobox', { name: /^Product, line/ })
      ).toHaveLength(2)
      expect(productField(1).parentElement).toHaveTextContent('Toyota Prius')
      expect(quantityField(1)).toHaveValue('2')
      expect(productField(2).parentElement).toHaveTextContent('Toyota Camry')
      expect(quantityField(2)).toHaveValue('1')
    })

    it('shows the unit price, VAT rate and amount of each line', async () => {
      await openEdit()

      const row = within(lineRow(1))
      expect(row.getByText('piece')).toBeInTheDocument()
      expect(row.getByText(/18 420,00/)).toBeInTheDocument()
      expect(row.getByText(/10 %/)).toBeInTheDocument()
      expect(row.getByText(/36 840,00/)).toBeInTheDocument()
    })

    it('shows the totals from the start', async () => {
      await openEdit()

      expect(totalsText('Total excluding VAT')).toContain('52 524,24 €')
      expect(totalsText('VAT')).toContain('7 155,76 €')
      expect(totalsText('Total including VAT')).toContain('59 680,00 €')
    })

    it('leaves the deadline empty for an invoice without one', async () => {
      await openEdit(buildToyotaInvoice({ deadline: null }))

      expect(deadlineField()).toHaveValue('')
    })

    it('names the fields like the creation form', async () => {
      const { user } = await openEdit()
      await user.click(screen.getByRole('button', { name: 'Add line' }))

      expect(productField(3)).toBeInTheDocument()
      expect(quantityField(3)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Remove line 3' })
      ).toBeInTheDocument()
    })
  })

  describe('validation before saving', () => {
    it('does not send a saved quantity that breaks a rule', async () => {
      const invoice = buildToyotaInvoice()
      invoice.invoice_lines[0] = { ...invoice.invoice_lines[0], quantity: 0 }
      const { user } = await openEdit(invoice)
      const requests = mockPutInvoice(100500, invoice)

      await user.click(saveButton())

      const message = await screen.findByText(
        'Enter a whole quantity from 1 to 1 000 000'
      )
      expect(message).toBeInTheDocument()
      expect(quantityField(1)).toHaveAccessibleDescription(message.textContent!)
      expect(requests).toHaveLength(0)
    })

    it('does not send an invoice whose lines were all removed', async () => {
      const invoice = buildToyotaInvoice({
        invoice_lines: [buildToyotaInvoice().invoice_lines[0]],
      })
      const { user } = await openEdit(invoice)
      const requests = mockPutInvoice(100500, invoice)

      await user.click(screen.getByRole('button', { name: 'Remove line 1' }))
      await user.click(saveButton())

      expect(
        await screen.findByText('Add at least one line')
      ).toBeInTheDocument()
      expect(requests).toHaveLength(0)
    })
  })

  describe('only the changes are sent', () => {
    it('updates a line whose quantity changed, and nothing else', async () => {
      const { user } = await openEdit()

      await enterQuantity(user, 1, '3')
      const body = await saveWith(user, buildToyotaInvoice())

      expect(body).toEqual({
        invoice: {
          ...invoiceFields,
          invoice_lines_attributes: [{ id: 1001, quantity: 3 }],
        },
      })
    })

    it('creates the added line and deletes the removed one', async () => {
      const { user } = await openEdit()

      await user.click(screen.getByRole('button', { name: 'Remove line 2' }))
      await user.click(screen.getByRole('button', { name: 'Add line' }))
      await chooseProduct(user, 2, corolla)
      await enterQuantity(user, 2, '1')
      const body = await saveWith(user, buildToyotaInvoice())

      expect(body.invoice.invoice_lines_attributes).toEqual([
        { product_id: 111, quantity: 1 },
        { id: 1002, _destroy: true },
      ])
      expect(JSON.stringify(body)).not.toContain('1001')
    })

    it('deletes and creates the line whose product changed', async () => {
      const { user } = await openEdit()

      await chooseProduct(user, 2, corolla)
      const body = await saveWith(user, buildToyotaInvoice())

      expect(body.invoice.invoice_lines_attributes).toEqual([
        { id: 1002, _destroy: true },
        { product_id: 111, quantity: 1 },
      ])
    })

    it('sends no line instruction when only the invoice fields changed', async () => {
      const { user } = await openEdit()

      await clearDeadline()
      const body = await saveWith(user, buildToyotaInvoice())

      expect(body).toEqual({
        invoice: {
          id: 100500,
          customer_id: 1,
          date: '2026-09-29',
          deadline: null,
        },
      })
      expect(body.invoice).not.toHaveProperty('invoice_lines_attributes')
    })

    it('never sends the status of the invoice', async () => {
      const { user } = await openEdit()

      const body = await saveWith(user, buildToyotaInvoice())

      expect(body.invoice).not.toHaveProperty('finalized')
      expect(body.invoice).not.toHaveProperty('paid')
    })
  })

  describe('Enter in a date field', () => {
    // Valid values, so that only Enter could have sent the form.
    it.each([
      ['Date', '2026-10-05'],
      ['Deadline', '2026-11-05'],
    ])('keeps the typed %s and does not save', async (name, typed) => {
      const { user, router } = await openEdit()
      const requests = mockPutInvoice(100500, buildToyotaInvoice())
      const field = screen.getByRole('textbox', { name })

      await user.clear(field)
      await user.type(field, `${typed}{Enter}`)

      expect(field).toHaveValue(typed)
      expect(requests).toHaveLength(0)
      expect(router.state.location.pathname).toBe('/invoices/100500/edit')
      expect(saveButton()).toBeInTheDocument()
    })
  })

  describe('saving in progress', () => {
    it('sends one request when activated twice', async () => {
      const { user } = await openEdit()
      const requests = mockPutInvoice(100500, buildToyotaInvoice(), {
        delay: 'infinite',
      })

      await enterQuantity(user, 1, '3')
      await user.click(saveButton())
      await user.click(saveButton())

      await waitFor(() => expect(requests).toHaveLength(1))
      expect(saveButton()).toHaveClass('ant-btn-loading')
      expect(requests).toHaveLength(1)
    })
  })

  describe('saved invoice', () => {
    const updated = () => {
      const invoice = buildToyotaInvoice()
      invoice.invoice_lines[0] = {
        ...invoice.invoice_lines[0],
        quantity: 3,
        price: '55260.0',
        tax: '5023.64',
      }
      return invoice
    }

    it('confirms and shows the detail page with the saved invoice', async () => {
      const { user, router } = await openEdit()
      await enterQuantity(user, 1, '3')
      // The detail page shows the answer of the update, not a new request.
      mockPutInvoice(100500, updated())
      mockInvoice(updated(), { delay: 'infinite' })

      await user.click(saveButton())

      expect(
        await screen.findByText('Invoice #100500 updated')
      ).toBeInTheDocument()
      expect(
        await screen.findByRole('heading', { name: 'Invoice #100500' })
      ).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/invoices/100500')
      expect(screen.getByText('Toyota Prius')).toBeInTheDocument()
      expect(
        normalizeSpaces(
          screen.getByText('Total including VAT').parentElement?.textContent ??
            ''
        )
      ).toContain('78 100,00 €')
    })

    it('lists the lines by id when the update answers in another order', async () => {
      const { user } = await openEdit()
      await enterQuantity(user, 1, '3')
      const answer = updated()
      answer.invoice_lines.reverse()
      mockPutInvoice(100500, answer)
      mockInvoice(updated(), { delay: 'infinite' })

      await user.click(saveButton())

      await screen.findByRole('heading', { name: 'Invoice #100500' })
      const rows = screen.getAllByRole('row').map((row) => row.textContent)
      const prius = rows.findIndex((text) => text?.includes('Toyota Prius'))
      const camry = rows.findIndex((text) => text?.includes('Toyota Camry'))
      expect(prius).toBeGreaterThan(-1)
      expect(prius).toBeLessThan(camry)
    })

    describe('from the list and the detail page', () => {
      const openFromList = async () => {
        mockCatalog()
        const listRequests = mockEndpoint({
          endpointName: 'getInvoices',
          response: buildInvoicesPage([buildToyotaInvoice()]),
        })
        mockInvoice(buildToyotaInvoice())
        const user = userEvent.setup()
        const rendered = renderApp('/')
        await user.click(await screen.findByRole('link', { name: '#100500' }))
        await user.click(await screen.findByRole('link', { name: 'Edit' }))
        await screen.findByRole('heading', { name: 'Edit invoice #100500' })
        return { user, listRequests, ...rendered }
      }

      it('goes back to the detail page, not to the form', async () => {
        const { user, router } = await openFromList()
        await enterQuantity(user, 1, '3')
        await saveWith(user, updated())
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        // The router updates React state outside of a user event.
        await act(() => router.navigate(-1))

        expect(router.state.location.pathname).toBe('/invoices/100500')
        expect(
          await screen.findByRole('heading', { name: 'Invoice #100500' })
        ).toBeInTheDocument()
        expect(
          screen.queryByRole('button', { name: /Save changes$/ })
        ).not.toBeInTheDocument()
      })

      it('requests the list again when it is shown after a save', async () => {
        const { user, router, listRequests } = await openFromList()
        expect(listRequests).toHaveLength(1)
        await enterQuantity(user, 1, '3')
        await saveWith(user, updated())
        await screen.findByRole('heading', { name: 'Invoice #100500' })

        // Back to the detail page, then back to the list.
        await act(() => router.navigate(-2))

        await waitFor(() => expect(listRequests).toHaveLength(2))
      })
    })
  })

  describe('save failure', () => {
    it('shows the reason given by the server and keeps the values', async () => {
      const { user } = await openEdit()
      mockPutInvoice(
        100500,
        {
          message:
            'Validation failed: Une facture finalisée ne peut pas être modifiée',
        },
        { status: 422 }
      )
      await enterQuantity(user, 1, '3')

      await user.click(saveButton())

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('The invoice could not be saved')
      expect(alert).toHaveTextContent(
        'Validation failed: Une facture finalisée ne peut pas être modifiée'
      )
      expect(quantityField(1)).toHaveValue('3')
      expect(quantityField(2)).toHaveValue('1')
      expect(productField(2).parentElement).toHaveTextContent('Toyota Camry')
    })

    it('says the server could not be reached', async () => {
      const { user } = await openEdit()
      server.use(
        http.put(`${serverBaseURL}/invoices/100500`, () => HttpResponse.error())
      )
      await enterQuantity(user, 1, '3')

      await user.click(saveButton())

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('The invoice could not be saved')
      expect(alert).toHaveTextContent('The server could not be reached')
    })
  })

  describe('cancel', () => {
    it('returns to the detail page and sends nothing', async () => {
      const { user, router } = await openEdit()
      const requests = mockPutInvoice(100500, buildToyotaInvoice())
      await enterQuantity(user, 1, '3')

      await user.click(screen.getByRole('link', { name: 'Cancel' }))

      expect(router.state.location.pathname).toBe('/invoices/100500')
      expect(
        await screen.findByRole('heading', { name: 'Invoice #100500' })
      ).toBeInTheDocument()
      expect(requests).toHaveLength(0)
    })
  })

  describe('finalized invoices', () => {
    it.each([
      ['finalized', { finalized: true, paid: false }],
      ['paid', { finalized: true, paid: true }],
    ])('shows no form for a %s invoice', async (_name, status) => {
      mockCatalog()
      mockInvoice(buildInvoice({ id: 100417, ...status }))
      renderApp('/invoices/100417/edit')

      expect(
        await screen.findByText('Invoice #100417 is finalized')
      ).toBeInTheDocument()
      expect(
        screen.getByText(/A finalized invoice can no longer be edited/)
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'View invoice' })
      ).toHaveAttribute('href', '/invoices/100417')
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Save changes$/ })
      ).not.toBeInTheDocument()
    })

    it('keeps a draft flagged as paid editable', async () => {
      await openEdit(buildToyotaInvoice({ paid: true }))

      expect(saveButton()).toBeInTheDocument()
    })
  })

  describe('loading, not found and error states', () => {
    it('says the invoice is loading', async () => {
      mockInvoice(buildToyotaInvoice(), { delay: 'infinite' })
      renderApp('/invoices/100500/edit')

      expect(await screen.findByText('Loading invoice')).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('says "Invoice not found" for an unknown invoice', async () => {
      mockEndpoint({
        endpointName: 'getInvoice',
        params: { pathParams: { id: '999999' } },
        response: { message: 'Not Found' },
        status: 404,
      })
      renderApp('/invoices/999999/edit')

      expect(await screen.findByText('Invoice not found')).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Back to invoices' })
      ).toBeInTheDocument()
    })

    it('says "Invoice not found" for an id that is not a number, without a request', async () => {
      const requests = mockEndpoint({
        endpointName: 'getInvoice',
        params: { pathParams: { id: 'abc' } },
        response: buildInvoice(),
      })
      renderApp('/invoices/abc/edit')

      expect(await screen.findByText('Invoice not found')).toBeInTheDocument()
      expect(requests).toHaveLength(0)
    })

    it('shows the form after a retry of a failed load', async () => {
      const user = userEvent.setup()
      mockCatalog()
      mockEndpoint({
        endpointName: 'getInvoice',
        params: { pathParams: { id: '100500' } },
        response: { message: 'Internal Server Error' },
        status: 500,
      })
      renderApp('/invoices/100500/edit')
      expect(
        await screen.findByText('Invoice could not be loaded')
      ).toBeInTheDocument()

      mockInvoice(buildToyotaInvoice())
      await user.click(screen.getByRole('button', { name: 'Retry' }))

      expect(
        await screen.findByRole('heading', { name: 'Edit invoice #100500' })
      ).toBeInTheDocument()
      expect(quantityField(1)).toHaveValue('2')
    })
  })

  describe('moving between two edit URLs', () => {
    it('shows the values of the invoice that the URL names, from the cache', async () => {
      const other = buildToyotaInvoice({
        id: 100501,
        invoice_lines: [
          {
            ...buildToyotaInvoice().invoice_lines[1],
            id: 2001,
            invoice_id: 100501,
            quantity: 5,
          },
        ],
      })
      mockCatalog()
      mockInvoice(buildToyotaInvoice())
      mockInvoice(other)
      const { router } = renderApp('/invoices/100500/edit')
      await screen.findByRole('heading', { name: 'Edit invoice #100500' })

      // Both invoices are cached once each has been shown.
      await act(() => router.navigate('/invoices/100501/edit'))
      await screen.findByRole('heading', { name: 'Edit invoice #100501' })
      await act(() => router.navigate('/invoices/100500/edit'))

      expect(
        await screen.findByRole('heading', { name: 'Edit invoice #100500' })
      ).toBeInTheDocument()
      expect(quantityField(1)).toHaveValue('2')
      expect(productField(1).parentElement).toHaveTextContent('Toyota Prius')
      expect(
        screen.getAllByRole('combobox', { name: /^Product, line/ })
      ).toHaveLength(2)
    })
  })
})
