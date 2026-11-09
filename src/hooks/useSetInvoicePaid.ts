import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../api'
import { storeInvoice } from '../api/invoiceCache'
import { invoiceKeys } from '../api/queryKeys'
import { Invoice } from '../types'

// The shape of a cached list page that the optimistic update touches: only its
// rows matter here, the rest of the answer is left untouched.
interface InvoiceListPage {
  invoices: Invoice[]
}

// Marking as paid is reversible and almost never fails, and a cold API makes
// the request slow: the new flag is written in the caches at once and put back
// if the server refuses. Not retried, like the other writes.
export const useSetInvoicePaid = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, paid }: { id: number; paid: boolean }) => {
      // Only these two fields: the server refuses `paid` sent with any other
      // field on a finalized invoice.
      const { data } = await api.putInvoice({ id }, { invoice: { id, paid } })
      return data
    },
    onMutate: async ({ id, paid }) => {
      // A refetch in flight would overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: invoiceKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: invoiceKeys.lists() })

      const previousDetail = queryClient.getQueryData<Invoice>(
        invoiceKeys.detail(id)
      )
      const previousLists = queryClient.getQueriesData<InvoiceListPage>({
        queryKey: invoiceKeys.lists(),
      })

      queryClient.setQueryData<Invoice>(invoiceKeys.detail(id), (invoice) =>
        invoice ? { ...invoice, paid } : invoice
      )
      queryClient.setQueriesData<InvoiceListPage>(
        { queryKey: invoiceKeys.lists() },
        (page) =>
          page
            ? {
                ...page,
                invoices: page.invoices.map((invoice) =>
                  invoice.id === id ? { ...invoice, paid } : invoice
                ),
              }
            : page
      )

      return { previousDetail, previousLists }
    },
    onError: (_error, { id }, context) => {
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(invoiceKeys.detail(id), context.previousDetail)
      }
      context?.previousLists.forEach(([key, data]) => {
        if (data !== undefined) queryClient.setQueryData(key, data)
      })
    },
    onSuccess: (invoice) => {
      storeInvoice(queryClient, invoice)
    },
    onSettled: (_data, error, { id }) => {
      // After a failure the detail entry is refetched too, so the page matches
      // the server; the lists are always refetched.
      if (error)
        void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() })
    },
  })
}
