import { useQuery } from '@tanstack/react-query'
import { useApi } from '../api'
import { toApiFilter } from '../model/listQuery'

// The list URL holds a customer id only, and the API has no customer-by-id
// endpoint. Every invoice embeds its customer, so one invoice of that customer
// (per_page 1) gives the name.
export const filterCustomerKey = (id?: number) =>
  ['filterCustomer', id] as const

export const useFilterCustomer = (id?: number) => {
  const api = useApi()

  return useQuery({
    queryKey: filterCustomerKey(id),
    enabled: id !== undefined,
    // A name does not change during a session, and this makes the entry seeded
    // by the page (the customer was just picked) count as fresh, so no request
    // is made for a name the page already has.
    staleTime: Infinity,
    queryFn: async () => {
      const filter = toApiFilter({ page: 1, customerId: id })
      const { data } = await api.getInvoices({ filter, per_page: 1 })
      return data.invoices[0]?.customer ?? null
    },
  })
}
