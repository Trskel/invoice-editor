import { useMemo } from 'react'

import { GetRef, Select } from 'antd'

// The props that make a picker usable in a form: a name, a link to its error
// message, an error outline and a ref that react-hook-form focuses on error.
export interface PickerFieldProps {
  id?: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  status?: 'error'
  ref?: React.Ref<GetRef<typeof Select>>
}

interface Props<
  T extends { id: number; label: string },
> extends PickerFieldProps {
  // Only what the picker shows for the selected value; `items` and `onChange`
  // carry the full item.
  value: { id: number; label: string } | null
  onChange: (item: T | null) => void
  placeholder?: string
  // antd's clear icon, which calls `onChange(null)`.
  allowClear?: boolean
  items: T[] | undefined
  isPending: boolean
  // The search failed: say so instead of "No results".
  isError?: boolean
  fetchNextPage: () => void
  hasNextPage: boolean
  onSearch: (value: string) => void
}

const STYLE = {
  width: '100%',
}

const REMAINING_SCROLL_HEIGHT_PIXELS_TO_FETCH_NEXT_PAGE = 100

const InfiniteScrollSelect = <T extends { id: number; label: string }>({
  value,
  onChange,
  placeholder = 'Search for a item',
  allowClear = false,
  items,
  isPending,
  isError = false,
  fetchNextPage,
  hasNextPage,
  onSearch,
  ...fieldProps
}: Props<T>) => {
  const options = useMemo(() => {
    const itemsOptions: {
      value: number
      label: string
      item: T | null
      disabled: boolean
    }[] = (items || []).map((item) => ({
      value: item.id,
      label: item.label,
      item: item,
      disabled: false,
    }))
    if (isPending || hasNextPage) {
      itemsOptions.push({
        value: 0,
        label: 'Loading...',
        item: null,
        disabled: true,
      } as const)
    }
    return itemsOptions
  }, [items, isPending, hasNextPage])

  return (
    <Select
      {...fieldProps}
      allowClear={allowClear}
      showSearch
      // A page holds 10 results, so virtualizing the list brings nothing, and
      // its height measurements do not work in jsdom.
      virtual={false}
      value={
        value
          ? {
              value: value.id,
              label: value.label,
              // A change always comes from `items`; the item stored on the
              // selected value itself is never read.
              item: null,
              disabled: false,
            }
          : undefined
      }
      placeholder={placeholder}
      defaultActiveFirstOption={false}
      suffixIcon={null}
      filterOption={false}
      onSearch={onSearch}
      onChange={(_, option) => {
        if (Array.isArray(option)) {
          // We don't have multiple section option enabled
          return
        } else {
          onChange(option?.item ?? null)
        }
      }}
      notFoundContent={<p>{isError ? 'Search failed' : 'No results'}</p>}
      onPopupScroll={(e) => {
        const target = e.target as HTMLElement
        const isAtBottom =
          target.scrollTop + target.clientHeight >=
          target.scrollHeight -
            REMAINING_SCROLL_HEIGHT_PIXELS_TO_FETCH_NEXT_PAGE
        if (isAtBottom && hasNextPage) {
          fetchNextPage()
        }
      }}
      options={options}
      style={STYLE}
    />
  )
}

export default InfiniteScrollSelect
