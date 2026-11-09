import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useApi } from '../api'
import { invoiceKeys } from '../api/queryKeys'
import { ListQuery, toApiFilter } from '../model/listQuery'

export const useInvoices = (query: ListQuery, perPage: number) => {
  const api = useApi()
  const filter = toApiFilter(query)

  return useQuery({
    queryKey: invoiceKeys.list({ ...query, perPage }),
    queryFn: async () => {
      const { data } = await api.getInvoices({
        page: query.page,
        per_page: perPage,
        ...(filter ? { filter } : {}),
      })
      return data
    },
    // While another page loads, keep showing the current one
    // (`isPlaceholderData` is true meanwhile).
    placeholderData: keepPreviousData,
  })
}
