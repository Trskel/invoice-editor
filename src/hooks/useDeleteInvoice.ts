import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../api'
import { invoiceKeys } from '../api/queryKeys'

// Deleting is not retried (TanStack Query's default for mutations). `forget`
// removes the invoice from the detail cache; the caller decides when, so that
// the deleted invoice is not requested again by a page that is still mounted.
export const useDeleteInvoice = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (id: number) => api.deleteInvoice({ id }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() }),
    // The server refused (for example the invoice was finalized elsewhere);
    // refetch so the page shows what it holds.
    onError: (_error, id) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
    },
  })

  const forget = (id: number) =>
    queryClient.removeQueries({ queryKey: invoiceKeys.detail(id), exact: true })

  return { ...mutation, forget }
}
