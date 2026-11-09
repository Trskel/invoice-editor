import { useMemo, useState } from 'react'

import useGetCustomers from './useGetCustomers'
import { Customer } from '../../types'
import useDebounceState from '../../hooks/useDebounceState'
import InfiniteScrollSelect, { PickerFieldProps } from '../InfiniteScrollSelect'

// The selected value only needs an id and a name; the list page knows the id
// from the URL before the name comes back from the API.
type CustomerChoice = { id: number; first_name?: string; last_name?: string }

interface Props extends PickerFieldProps {
  value: CustomerChoice | null
  onChange: (Customer: Customer | null) => void
  placeholder?: string
  // antd's clear icon (mouse only); keyboard users clear with "Clear filters".
  allowClear?: boolean
  // Shown instead of the name when the page knows only the customer id.
  valueLabel?: string
}

const getCustomerLabel = (customer: CustomerChoice) =>
  `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()

type CustomerItem = Customer & {
  label: string
}

const CustomerAutoComplete = ({
  value,
  onChange,
  placeholder = 'Search for a customer',
  allowClear = false,
  valueLabel,
  ...fieldProps
}: Props) => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounceState(search)
  const { customers, isPending, isError, fetchNextPage, hasNextPage } =
    useGetCustomers(debouncedSearch)

  const memoizedValue = useMemo(() => {
    return value
      ? { id: value.id, label: valueLabel ?? getCustomerLabel(value) }
      : null
  }, [value, valueLabel])

  // The text typed to find a customer belongs to that search only. Once one is
  // chosen (or the choice is cleared), reset it, so opening the picker again
  // searches the full list instead of the previous query's results. antd empties
  // its input but does not notify `onSearch` when a single value is selected.
  const selectCustomer = (customer: Customer | null) => {
    setSearch('')
    onChange(customer)
  }

  return (
    <InfiniteScrollSelect<CustomerItem>
      {...fieldProps}
      value={memoizedValue}
      onChange={selectCustomer}
      placeholder={placeholder}
      allowClear={allowClear}
      items={customers}
      isPending={isPending}
      isError={isError}
      fetchNextPage={() => void fetchNextPage()}
      hasNextPage={hasNextPage}
      onSearch={setSearch}
    />
  )
}

export default CustomerAutoComplete
