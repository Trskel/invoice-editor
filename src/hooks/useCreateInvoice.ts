import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../api'
import { invoiceKeys } from '../api/queryKeys'
import { toCreatePayload } from '../model/invoiceForm'

// Not retried (TanStack Query's default for mutations): creating is not
// idempotent, and a request that timed out may still have created the invoice.
export const useCreateInvoice = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ReturnType<typeof toCreatePayload>) => {
      const { data } = await api.postInvoices(null, { invoice: payload })
      return data
    },
    // Cache work lives here, so it happens whoever calls the hook. The answer
    // is the full invoice, so the detail page opens without a request; the
    // cached list pages are refetched when next shown.
    onSuccess: (invoice) => {
      queryClient.setQueryData(invoiceKeys.detail(invoice.id), invoice)
      return queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
    },
  })
}
