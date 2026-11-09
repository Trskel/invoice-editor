import { InvoiceStatus } from '../model/invoiceStatus'

// Cache keys for invoice queries, from the broadest to the most specific.
// Invalidating a prefix (for example `invoiceKeys.lists()`) refetches every
// cached query under it, whatever its parameters.
export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params: {
    page: number
    perPage: number
    status?: InvoiceStatus
    customerId?: number
  }) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: number) => [...invoiceKeys.details(), id] as const,
}
