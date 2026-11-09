import { ValidationError } from 'yup'
import { Product } from '../types'
import { buildCustomer, buildProduct } from '../specs/fixtures/catalog'
import { buildInvoice, buildToyotaInvoice } from '../specs/fixtures/invoices'
import {
  InvoiceFormValues,
  ValidInvoiceForm,
  emptyInvoiceForm,
  invoiceFormSchema,
  invoiceToForm,
  pricedLines,
  toCreatePayload,
  toUpdatePayload,
} from './invoiceForm'

const prius = buildProduct({ id: 12, label: 'Toyota Prius' })
const camry = buildProduct({
  id: 11,
  label: 'Toyota Camry',
  vat_rate: '20',
  unit_price: '22840.0',
})

const validValues = (
  overrides: Partial<InvoiceFormValues> = {}
): InvoiceFormValues => ({
  customer: buildCustomer({ id: 1 }),
  date: '2026-09-29',
  deadline: null,
  lines: [{ product: prius, quantity: 2 }],
  ...overrides,
})

// Every message of an invalid form, by field path.
const errorsOf = async (values: InvoiceFormValues) => {
  try {
    await invoiceFormSchema.validate(values, { abortEarly: false })
    return {}
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    return Object.fromEntries(
      error.inner.map((inner) => [inner.path, inner.message])
    )
  }
}

const QUANTITY_MESSAGE = 'Enter a whole quantity from 1 to 1 000 000'

describe('emptyInvoiceForm', () => {
  it('starts with today as the date, no deadline and one empty line', () => {
    expect(emptyInvoiceForm('2026-09-29')).toEqual({
      customer: null,
      date: '2026-09-29',
      deadline: null,
      lines: [{ product: null, quantity: null }],
    })
  })

  it('builds a new object each time', () => {
    expect(emptyInvoiceForm('2026-09-29')).not.toBe(
      emptyInvoiceForm('2026-09-29')
    )
    expect(emptyInvoiceForm('2026-09-29').lines).not.toBe(
      emptyInvoiceForm('2026-09-29').lines
    )
  })
})

describe('invoiceFormSchema', () => {
  it('accepts a valid form', async () => {
    expect(await errorsOf(validValues())).toEqual({})
  })

  it('reports every problem of the empty form at once', async () => {
    expect(await errorsOf(emptyInvoiceForm('2026-09-29'))).toEqual({
      customer: 'Select a customer',
      'lines[0].product': 'Select a product',
      'lines[0].quantity': QUANTITY_MESSAGE,
    })
  })

  describe('customer', () => {
    it('is required', async () => {
      expect(await errorsOf(validValues({ customer: null }))).toEqual({
        customer: 'Select a customer',
      })
    })
  })

  describe('date', () => {
    it('is required', async () => {
      expect(
        await errorsOf(validValues({ date: null, deadline: '2026-10-01' }))
      ).toEqual({ date: 'Enter a date' })
    })
  })

  describe('deadline', () => {
    it('is optional', async () => {
      expect(await errorsOf(validValues({ deadline: null }))).toEqual({})
    })

    it('may be after the date', async () => {
      expect(await errorsOf(validValues({ deadline: '2026-10-29' }))).toEqual(
        {}
      )
    })

    it('may be the date itself', async () => {
      expect(await errorsOf(validValues({ deadline: '2026-09-29' }))).toEqual(
        {}
      )
    })

    it('cannot be before the date', async () => {
      expect(await errorsOf(validValues({ deadline: '2026-09-28' }))).toEqual({
        deadline: 'The deadline cannot be before the date',
      })
    })

    it('compares across months and years', async () => {
      expect(
        await errorsOf(
          validValues({ date: '2027-01-05', deadline: '2026-12-31' })
        )
      ).toEqual({ deadline: 'The deadline cannot be before the date' })
    })

    it('is not compared when there is no date', async () => {
      expect(
        await errorsOf(validValues({ date: null, deadline: '2026-09-28' }))
      ).toEqual({ date: 'Enter a date' })
    })
  })

  describe('lines', () => {
    it('needs at least one', async () => {
      expect(await errorsOf(validValues({ lines: [] }))).toEqual({
        lines: 'Add at least one line',
      })
    })

    it('needs a product on each line', async () => {
      expect(
        await errorsOf(
          validValues({
            lines: [
              { product: prius, quantity: 1 },
              { product: null, quantity: 1 },
            ],
          })
        )
      ).toEqual({ 'lines[1].product': 'Select a product' })
    })

    it.each([1, 2, 999999, 1000000])('accepts a quantity of %i', async (q) => {
      expect(
        await errorsOf(
          validValues({ lines: [{ product: prius, quantity: q }] })
        )
      ).toEqual({})
    })

    it.each([
      ['missing', null],
      ['zero', 0],
      ['negative', -1],
      ['fractional', 1.5],
      ['just above the limit', 1000001],
      ['not a number', NaN],
    ])('rejects a quantity that is %s', async (_name, quantity) => {
      expect(
        await errorsOf(validValues({ lines: [{ product: prius, quantity }] }))
      ).toEqual({ 'lines[0].quantity': QUANTITY_MESSAGE })
    })

    it('reports the line that is wrong, not the others', async () => {
      expect(
        await errorsOf(
          validValues({
            lines: [
              { product: prius, quantity: 1 },
              { product: camry, quantity: 0 },
            ],
          })
        )
      ).toEqual({ 'lines[1].quantity': QUANTITY_MESSAGE })
    })
  })
})

describe('toCreatePayload', () => {
  const valid = (values: InvoiceFormValues) =>
    invoiceFormSchema.validateSync(values) as ValidInvoiceForm

  it('sends the ids, the dates and the quantities, as a draft, and nothing else', () => {
    const values = valid(
      validValues({
        customer: buildCustomer({ id: 1 }),
        date: '2026-09-29',
        deadline: null,
        lines: [
          { product: prius, quantity: 2 },
          { product: camry, quantity: 1 },
        ],
      })
    )

    expect(toCreatePayload(values)).toStrictEqual({
      customer_id: 1,
      date: '2026-09-29',
      deadline: null,
      finalized: false,
      invoice_lines_attributes: [
        { product_id: 12, quantity: 2 },
        { product_id: 11, quantity: 1 },
      ],
    })
  })

  it('sends the deadline when there is one', () => {
    const values = valid(validValues({ deadline: '2026-10-29' }))

    expect(toCreatePayload(values).deadline).toBe('2026-10-29')
  })

  it('does not accept unvalidated values', () => {
    // Checked by `yarn typecheck`: the form values allow a missing customer,
    // the validated ones do not.
    // @ts-expect-error unvalidated values are refused by the compiler
    const call = () => toCreatePayload(validValues())
    expect(call).toBeDefined()
  })
})

describe('pricedLines', () => {
  it('gives the amount and the VAT rate of each complete line', () => {
    expect(
      pricedLines([
        { product: prius, quantity: 2 },
        { product: camry, quantity: 1 },
      ])
    ).toEqual([
      { price: '36840', vat_rate: '10' },
      { price: '22840', vat_rate: '20' },
    ])
  })

  it('skips a line without a product', () => {
    expect(pricedLines([{ product: null, quantity: 2 }])).toEqual([])
  })

  it.each([null, 0, -1, 1.5, 1000001, NaN])(
    'skips a line whose quantity is %p',
    (quantity) => {
      expect(pricedLines([{ product: prius, quantity }])).toEqual([])
    }
  )

  it('keeps the complete lines around an incomplete one', () => {
    expect(
      pricedLines([
        { product: prius, quantity: 1 },
        { product: null, quantity: null },
        { product: camry, quantity: 1 },
      ])
    ).toEqual([
      { price: '18420', vat_rate: '10' },
      { price: '22840', vat_rate: '20' },
    ])
  })

  it('is empty for no lines', () => {
    expect(pricedLines([])).toEqual([])
  })
})

describe('invoiceFormSchema and lineId', () => {
  it('accepts a line that remembers its saved line', async () => {
    expect(
      await errorsOf(
        validValues({ lines: [{ lineId: 1001, product: prius, quantity: 2 }] })
      )
    ).toEqual({})
  })

  it('keeps the lineId in the validated values', () => {
    const values = invoiceFormSchema.validateSync(
      validValues({ lines: [{ lineId: 1001, product: prius, quantity: 2 }] })
    )

    expect(values.lines[0].lineId).toBe(1001)
  })

  it('does not add a lineId to the lines of a new invoice', () => {
    expect(emptyInvoiceForm('2026-09-29').lines[0]).not.toHaveProperty('lineId')
  })

  it('does not send a lineId when creating', () => {
    const values = invoiceFormSchema.validateSync(
      validValues({ lines: [{ lineId: 1001, product: prius, quantity: 2 }] })
    ) as ValidInvoiceForm

    expect(toCreatePayload(values).invoice_lines_attributes).toStrictEqual([
      { product_id: 12, quantity: 2 },
    ])
  })
})

describe('invoiceToForm', () => {
  it('fills the customer, the dates and the lines in the API order', () => {
    const invoice = buildToyotaInvoice()

    expect(invoiceToForm(invoice)).toEqual({
      customer: invoice.customer,
      date: '2026-09-29',
      deadline: '2026-10-29',
      lines: [
        {
          lineId: 1001,
          product: invoice.invoice_lines[0].product,
          quantity: 2,
        },
        {
          lineId: 1002,
          product: invoice.invoice_lines[1].product,
          quantity: 1,
        },
      ],
    })
  })

  it('has no customer when the invoice has none', () => {
    expect(
      invoiceToForm(
        buildToyotaInvoice({ customer: undefined, customer_id: null })
      ).customer
    ).toBeNull()
  })

  it('has no deadline when the invoice has none', () => {
    expect(
      invoiceToForm(buildToyotaInvoice({ deadline: null })).deadline
    ).toBeNull()
  })

  it('has no lines for an invoice without lines', () => {
    expect(invoiceToForm(buildInvoice({ invoice_lines: [] })).lines).toEqual([])
  })

  it('keeps a value that breaks a rule, so that validation shows it', async () => {
    const invoice = buildToyotaInvoice()
    invoice.invoice_lines[0] = { ...invoice.invoice_lines[0], quantity: 0 }

    const values = invoiceToForm(invoice)

    expect(values.lines[0].quantity).toBe(0)
    expect(await errorsOf(values)).toEqual({
      'lines[0].quantity': QUANTITY_MESSAGE,
    })
  })

  it('gives values the schema accepts for a valid invoice', async () => {
    expect(await errorsOf(invoiceToForm(buildToyotaInvoice()))).toEqual({})
  })
})

describe('toUpdatePayload', () => {
  const corolla = buildProduct({ id: 111, label: 'Toyota Corolla' })
  const invoice = buildToyotaInvoice()
  const [priusLine, camryLine] = invoice.invoice_lines

  // The form as `invoiceToForm` fills it, with changes applied to it.
  const payloadFor = (changes: Partial<InvoiceFormValues>) =>
    toUpdatePayload(
      invoice,
      invoiceFormSchema.validateSync({
        ...invoiceToForm(invoice),
        ...changes,
      }) as ValidInvoiceForm
    )

  const saved = (index: number, quantity?: number, product?: Product) => ({
    lineId: invoice.invoice_lines[index].id,
    product: product ?? invoice.invoice_lines[index].product!,
    quantity: quantity ?? invoice.invoice_lines[index].quantity,
  })

  it('sends only the invoice fields when nothing changed', () => {
    expect(payloadFor({})).toStrictEqual({
      id: 100500,
      customer_id: 1,
      date: '2026-09-29',
      deadline: '2026-10-29',
    })
  })

  it('updates a line whose quantity changed', () => {
    expect(payloadFor({ lines: [saved(0, 3), saved(1)] })).toStrictEqual({
      id: 100500,
      customer_id: 1,
      date: '2026-09-29',
      deadline: '2026-10-29',
      invoice_lines_attributes: [{ id: priusLine.id, quantity: 3 }],
    })
  })

  it('does not send the lines that did not change', () => {
    const { invoice_lines_attributes } = payloadFor({
      lines: [saved(0), saved(1, 5)],
    })

    expect(invoice_lines_attributes).toStrictEqual([
      { id: camryLine.id, quantity: 5 },
    ])
  })

  it('creates a line added in the form', () => {
    expect(
      payloadFor({
        lines: [saved(0), saved(1), { product: corolla, quantity: 4 }],
      }).invoice_lines_attributes
    ).toStrictEqual([{ product_id: 111, quantity: 4 }])
  })

  it('deletes a saved line removed from the form', () => {
    expect(
      payloadFor({ lines: [saved(0)] }).invoice_lines_attributes
    ).toStrictEqual([{ id: camryLine.id, _destroy: true }])
  })

  it('deletes the old line and creates a new one when the product changed', () => {
    expect(
      payloadFor({ lines: [saved(0), saved(1, undefined, corolla)] })
        .invoice_lines_attributes
    ).toStrictEqual([
      { id: camryLine.id, _destroy: true },
      { product_id: 111, quantity: 1 },
    ])
  })

  it('uses the form quantity for the line created by a product change', () => {
    expect(
      payloadFor({ lines: [saved(0), saved(1, 7, corolla)] })
        .invoice_lines_attributes
    ).toStrictEqual([
      { id: camryLine.id, _destroy: true },
      { product_id: 111, quantity: 7 },
    ])
  })

  it('lists the instructions in form order, then the removed lines', () => {
    expect(
      payloadFor({
        lines: [{ product: corolla, quantity: 1 }, saved(0, 3)],
      }).invoice_lines_attributes
    ).toStrictEqual([
      { product_id: 111, quantity: 1 },
      { id: priusLine.id, quantity: 3 },
      { id: camryLine.id, _destroy: true },
    ])
  })

  it('sends the new customer, date and no deadline', () => {
    const other = buildCustomer({ id: 2, first_name: 'Ada' })

    expect(
      payloadFor({ customer: other, date: '2026-09-30', deadline: null })
    ).toStrictEqual({
      id: 100500,
      customer_id: 2,
      date: '2026-09-30',
      deadline: null,
    })
  })

  it('never sends the status, labels, prices, VAT rates or totals', () => {
    const payload = payloadFor({
      lines: [saved(0, 3), saved(1, undefined, corolla)],
    })
    const sent = JSON.stringify(payload)

    for (const name of [
      'finalized',
      'paid',
      'label',
      'unit',
      'price',
      'vat_rate',
      'tax',
      'total',
    ]) {
      expect(sent).not.toContain(`"${name}"`)
    }
  })

  it('does not accept unvalidated values', () => {
    // @ts-expect-error unvalidated values are refused by the compiler
    const call = () => toUpdatePayload(invoice, invoiceToForm(invoice))
    expect(call).toBeDefined()
  })
})
