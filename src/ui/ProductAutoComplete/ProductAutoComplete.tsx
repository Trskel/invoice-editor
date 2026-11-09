import { useState } from 'react'

import useGetProducts from './useGetProducts'
import { Product } from '../../types'
import useDebounceState from '../../hooks/useDebounceState'
import InfiniteScrollSelect, { PickerFieldProps } from '../InfiniteScrollSelect'

interface Props extends PickerFieldProps {
  value: Product | null
  onChange: (product: Product | null) => void
  placeholder?: string
}

const ProductAutoComplete = ({
  value,
  onChange,
  placeholder = 'Search for a product',
  ...fieldProps
}: Props) => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounceState(search)
  const { products, isPending, isError, fetchNextPage, hasNextPage } =
    useGetProducts(debouncedSearch)

  return (
    <InfiniteScrollSelect<Product>
      {...fieldProps}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      items={products}
      isPending={isPending}
      isError={isError}
      fetchNextPage={() => void fetchNextPage()}
      hasNextPage={hasNextPage}
      onSearch={setSearch}
    />
  )
}

export default ProductAutoComplete
