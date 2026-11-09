import { useQuery } from '@tanstack/react-query'
import { useApi } from '../api'
import { invoiceKeys } from '../api/queryKeys'

export const useInvoice = (id: number) => {
  const api = useApi()

  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.getInvoice({ id })
      return data
    },
  })
}
