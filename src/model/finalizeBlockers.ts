import { ValidationError } from 'yup'
import { Invoice } from '../types'
import { invoiceFormSchema, invoiceToForm } from './invoiceForm'

// The rules of the invoice form a stored draft breaks, in the schema's order,
// with "Line <n>: " prefixed to a rule of a line and without duplicates. An
// empty array means the draft is complete and can be finalized.
export const finalizeBlockers = (invoice: Invoice): string[] => {
  try {
    invoiceFormSchema.validateSync(invoiceToForm(invoice), {
      abortEarly: false,
    })
    return []
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    const messages = error.inner.map((inner) => {
      const line = /^lines\[(\d+)\]/.exec(inner.path ?? '')
      return line
        ? `Line ${Number(line[1]) + 1}: ${inner.message}`
        : inner.message
    })
    return [...new Set(messages)]
  }
}
