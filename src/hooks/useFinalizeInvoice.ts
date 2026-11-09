import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../api'
import { storeInvoice } from '../api/invoiceCache'
import { invoiceKeys } from '../api/queryKeys'

// Finalizing is not retried (TanStack Query's default for mutations), like the
// other writes.
export const useFinalizeInvoice = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.putInvoice(
        { id },
        { invoice: { id, finalized: true } }
      )
      return data
    },
    // The answer is the full invoice: the detail page shows the new status
    // without a request, and the list pages are refetched when next shown.
    onSuccess: (invoice) => {
      storeInvoice(queryClient, invoice)
      return queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
    },
    // The server may hold another status (for example a draft finalized in
    // another tab); refetch so the actions shown match it.
    onError: (_error, id) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
    },
  })
}
