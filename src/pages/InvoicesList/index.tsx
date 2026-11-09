import { Link, useSearchParams } from 'react-router'
import {
  Button,
  Empty,
  Flex,
  Radio,
  RadioChangeEvent,
  Result,
  Spin,
  Table,
  Typography,
} from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { ITEMS_PER_PAGE } from './constants'
import { tableColumns } from './structure'
import { useInvoices } from '../../hooks/useInvoices'
import {
  filterCustomerKey,
  useFilterCustomer,
} from '../../hooks/useFilterCustomer'
import {
  ListQuery,
  hasFilter,
  listSearch,
  parseListQuery,
} from '../../model/listQuery'
import { InvoiceStatus } from '../../model/invoiceStatus'
import { Customer } from '../../types'
import ButtonLink from '../../ui/ButtonLink'
import CustomerAutoComplete from '../../ui/CustomerAutoComplete/CustomerAutoComplete'

const LOADING_TEXT = 'Loading invoices'

const STATUS_OPTIONS: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Finalized', value: 'finalized' },
  { label: 'Paid', value: 'paid' },
]

const InvoicesList = (): React.ReactElement => {
  // The URL is the only source of the list: the page and the filters.
  const [searchParams, setSearchParams] = useSearchParams()
  const query = parseListQuery(searchParams)
  const { data, isPending, isError, isFetching, isPlaceholderData, refetch } =
    useInvoices(query, ITEMS_PER_PAGE)

  // The name of a customer opened from its URL comes from the API; the id is
  // already known, so the picker can show a stand-in label meanwhile.
  const queryClient = useQueryClient()
  const filterCustomer = useFilterCustomer(query.customerId)

  const setQuery = (next: ListQuery) => setSearchParams(listSearch(next))

  const onStatusChange = (event: RadioChangeEvent) => {
    const status = event.target.value as InvoiceStatus | 'all'
    setQuery({
      ...query,
      page: 1,
      status: status === 'all' ? undefined : status,
    })
  }

  const onCustomerChange = (customer: Customer | null) => {
    if (customer) {
      queryClient.setQueryData(filterCustomerKey(customer.id), customer)
    }
    setQuery({ ...query, page: 1, customerId: customer?.id })
  }

  // A deletion that empties a page past the first leads to the previous one;
  // the count is the one before the deletion.
  const onDeleted = () => {
    if (query.page > 1 && data?.invoices.length === 1) {
      setQuery({ ...query, page: query.page - 1 })
    }
  }

  const renderContent = () => {
    if (isPending) return <Spin description={LOADING_TEXT} />

    if (isError) {
      return (
        <Result
          status="error"
          title="Invoices could not be loaded"
          subTitle="Check your connection and try again."
          extra={
            <Button onClick={() => void refetch()} loading={isFetching}>
              Retry
            </Button>
          }
        />
      )
    }

    if (data.pagination.total_entries === 0) {
      return (
        <Empty
          description={
            hasFilter(query)
              ? 'No invoices match these filters'
              : 'No invoices yet'
          }
        />
      )
    }

    // A stale link or a bookmark can point past the last page.
    if (data.invoices.length === 0) {
      return (
        <Result
          status="warning"
          title="This page does not exist"
          extra={
            <Link to={`/${listSearch({ ...query, page: 1 })}`}>
              Go to the first page
            </Link>
          }
        />
      )
    }

    return (
      <Table
        dataSource={data.invoices}
        columns={tableColumns(onDeleted)}
        rowKey="id"
        // On a narrow viewport the columns do not fit: scroll the table inside
        // its own container instead of widening the page.
        scroll={{ x: 'max-content' }}
        loading={{ spinning: isPlaceholderData, description: LOADING_TEXT }}
        pagination={{
          current: query.page,
          pageSize: ITEMS_PER_PAGE,
          total: data.pagination.total_entries,
          showSizeChanger: false,
          onChange: (nextPage) => setQuery({ ...query, page: nextPage }),
        }}
      />
    )
  }

  return (
    <Flex vertical gap="medium">
      <Typography.Title level={1} style={{ margin: 0 }}>
        Invoices
      </Typography.Title>
      <Flex justify="space-between" align="center" gap="1rem" wrap>
        {/* No controls during the first load; filters work in every other
            state, so an empty filter or a failed request can be left. */}
        {!isPending && (
          <Flex align="center" gap="1rem" wrap>
            <Radio.Group
              aria-label="Status"
              optionType="button"
              value={query.status ?? 'all'}
              onChange={onStatusChange}
              options={STATUS_OPTIONS}
            />
            <div style={{ width: 240 }}>
              <CustomerAutoComplete
                aria-label="Customer"
                placeholder="Filter by customer"
                allowClear
                value={
                  filterCustomer.data ??
                  (query.customerId !== undefined
                    ? { id: query.customerId }
                    : null)
                }
                valueLabel={
                  query.customerId !== undefined && !filterCustomer.data
                    ? `Customer #${query.customerId}`
                    : undefined
                }
                onChange={onCustomerChange}
              />
            </div>
            {hasFilter(query) && (
              <Button onClick={() => setQuery({ page: 1 })}>
                Clear filters
              </Button>
            )}
          </Flex>
        )}
        <ButtonLink type="primary" to="/invoices/new">
          Create invoice
        </ButtonLink>
      </Flex>

      {renderContent()}
    </Flex>
  )
}

export default InvoicesList
