import * as yup from 'yup'
import { Customer, Invoice, Product } from '../types'
import { lineAmount } from './lineAmount'

export const MAX_QUANTITY = 1_000_000

const QUANTITY_MESSAGE = 'Enter a whole quantity from 1 to 1 000 000'

// What the form holds while the user edits it: a picker can be empty, so the
// customer and the products can be null, and a quantity input can be empty.
export type InvoiceFormValues = {
  customer: Customer | null
  date: string | null
  deadline: string | null
  lines: {
    // The saved line this one was filled from, absent for a line added in the
    // form. Not called `id`: useFieldArray uses that name for its row keys.
    lineId?: number
    product: Product | null
    quantity: number | null
  }[]
}

// `today` is a `YYYY-MM-DD` string; the page gives the user's local date.
export const emptyInvoiceForm = (today: string): InvoiceFormValues => ({
  customer: null,
  date: today,
  deadline: null,
  lines: [{ product: null, quantity: null }],
})

// Dates are `YYYY-MM-DD` strings, which compare correctly as strings.
export const invoiceFormSchema = yup.object({
  // `mixed` only checks that something was chosen: the object comes from
  // the API search, its fields are not validated again.
  customer: yup.mixed<Customer>().nullable().required('Select a customer'),
  date: yup.string().nullable().required('Enter a date'),
  deadline: yup
    .string()
    .nullable()
    .defined()
    // A function, not an arrow: yup gives the context as `this`.
    .test(
      'not-before-date',
      'The deadline cannot be before the date',
      function (deadline) {
        const { date } = this.parent as { date: string | null }
        return !deadline || !date || deadline >= date
      }
    ),
  lines: yup
    .array(
      yup.object({
        lineId: yup.number().optional(),
        product: yup.mixed<Product>().nullable().required('Select a product'),
        quantity: yup
          .number()
          .nullable()
          .required(QUANTITY_MESSAGE)
          .integer(QUANTITY_MESSAGE)
          .min(1, QUANTITY_MESSAGE)
          .max(MAX_QUANTITY, QUANTITY_MESSAGE)
          .typeError(QUANTITY_MESSAGE),
      })
    )
    .min(1, 'Add at least one line')
    .required(),
})

// What is left once the schema accepted the form: nothing is null any more.
export type ValidInvoiceForm = yup.InferType<typeof invoiceFormSchema>

const isValidQuantity = (quantity: number | null): quantity is number =>
  quantity !== null &&
  Number.isInteger(quantity) &&
  quantity >= 1 &&
  quantity <= MAX_QUANTITY

// The complete lines (a product and a valid quantity), as the amount and VAT
// rate the totals need. Incomplete lines count for nothing.
export const pricedLines = (
  lines: InvoiceFormValues['lines']
): { price: string; vat_rate: string }[] =>
  lines.flatMap(({ product, quantity }) =>
    product && isValidQuantity(quantity)
      ? [
          {
            price: lineAmount(product.unit_price, quantity),
            vat_rate: product.vat_rate,
          },
        ]
      : []
  )

// Only what the server needs: it derives labels, units, prices and VAT from
// the product. New invoices are drafts, said explicitly.
export const toCreatePayload = (values: ValidInvoiceForm) => ({
  customer_id: values.customer.id,
  date: values.date,
  deadline: values.deadline,
  finalized: false,
  invoice_lines_attributes: values.lines.map((line) => ({
    product_id: line.product.id,
    quantity: line.quantity,
  })),
})

// Fills the edit form from a saved invoice. Values that break a rule are kept
// as they are, so that validation shows them.
export const invoiceToForm = (invoice: Invoice): InvoiceFormValues => ({
  customer: invoice.customer ?? null,
  date: invoice.date,
  deadline: invoice.deadline,
  lines: invoice.invoice_lines.map((line) => ({
    lineId: line.id,
    product: line.product ?? null,
    quantity: line.quantity,
  })),
})

type LineInstruction =
  | { id: number; quantity: number }
  | { id: number; _destroy: true }
  | { product_id: number; quantity: number }

// The changes between the invoice as loaded and the validated form. The
// invoice fields are always sent (idempotent); `finalized` and `paid` never
// are. A saved line is updated in place only when its quantity changed: the
// API does not refresh a line's label, VAT rate or price when its product
// changes, so a product change is a deletion plus a creation.
export const toUpdatePayload = (invoice: Invoice, values: ValidInvoiceForm) => {
  const saved = new Map(invoice.invoice_lines.map((line) => [line.id, line]))
  // Saved lines that a form line accounts for; the others were removed.
  const accountedFor = new Set<number>()
  const instructions: LineInstruction[] = []

  for (const { lineId, product, quantity } of values.lines) {
    const before = lineId === undefined ? undefined : saved.get(lineId)
    if (!before) {
      instructions.push({ product_id: product.id, quantity })
    } else if (before.product_id !== product.id) {
      accountedFor.add(before.id)
      instructions.push({ id: before.id, _destroy: true })
      instructions.push({ product_id: product.id, quantity })
    } else {
      accountedFor.add(before.id)
      if (before.quantity !== quantity) {
        instructions.push({ id: before.id, quantity })
      }
    }
  }

  for (const line of invoice.invoice_lines) {
    if (!accountedFor.has(line.id)) {
      instructions.push({ id: line.id, _destroy: true })
    }
  }

  return {
    id: invoice.id,
    customer_id: values.customer.id,
    date: values.date,
    deadline: values.deadline,
    ...(instructions.length > 0 && { invoice_lines_attributes: instructions }),
  }
}
