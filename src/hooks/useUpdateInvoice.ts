import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../api'
import { storeInvoice } from '../api/invoiceCache'
import { invoiceKeys } from '../api/queryKeys'
import { toUpdatePayload } from '../model/invoiceForm'

// Not retried (TanStack Query's default for mutations): an update that creates
// lines is not idempotent, and a request that timed out may have created them.
export const useUpdateInvoice = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ReturnType<typeof toUpdatePayload>) => {
      const { data } = await api.putInvoice(
        { id: payload.id },
        { invoice: payload }
      )
      return data
    },
    // The answer is the full invoice, so the detail page opens without a
    // request; the cached list pages are refetched when next shown.
    onSuccess: (invoice) => {
      storeInvoice(queryClient, invoice)
      return queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
    },
  })
}
