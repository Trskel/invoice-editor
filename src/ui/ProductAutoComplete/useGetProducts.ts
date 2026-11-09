import { useInfiniteQuery } from '@tanstack/react-query'
import { useApi } from '../../api'

const useGetProducts = (search: string) => {
  const api = useApi()
  const {
    data: products,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['products', search],
    queryFn: ({ pageParam = 1 }) =>
      api.getSearchProducts({
        query: search,
        per_page: 10,
        page: pageParam,
      }),
    select: (data) => data.pages.flatMap((page) => page.data.products),
    initialPageParam: 1,
    getNextPageParam: (currentPageData) => {
      if (
        currentPageData.data.pagination.page <
        currentPageData.data.pagination.total_pages
      ) {
        return currentPageData.data.pagination.page + 1
      }
      return null
    },
    getPreviousPageParam: (currentPageData) => {
      if (currentPageData.data.pagination.page > 1) {
        return currentPageData.data.pagination.page - 1
      }
      return null
    },
  })

  return {
    products,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
  }
}

export default useGetProducts
