import { Invoice } from '../types'

export type InvoiceStatus = 'draft' | 'finalized' | 'paid'

// Payment only applies to a finalized invoice: a draft flagged as paid is
// still a draft.
export const invoiceStatus = ({
  finalized,
  paid,
}: Pick<Invoice, 'finalized' | 'paid'>): InvoiceStatus => {
  if (!finalized) return 'draft'
  return paid ? 'paid' : 'finalized'
}
