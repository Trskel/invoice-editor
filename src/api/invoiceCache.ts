import { QueryClient } from '@tanstack/react-query'
import { Invoice } from '../types'
import { invoiceKeys } from './queryKeys'

// Stores an invoice answered by the API under its detail key. The answer of an
// update does not always list the lines in id order (a GET does), so they are
// sorted first.
export const storeInvoice = (
  queryClient: QueryClient,
  invoice: Invoice
): void => {
  const sorted = {
    ...invoice,
    invoice_lines: [...invoice.invoice_lines].sort((a, b) => a.id - b.id),
  }
  queryClient.setQueryData(invoiceKeys.detail(invoice.id), sorted)
}
