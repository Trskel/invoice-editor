import { InvoiceStatus } from './invoiceStatus'
import { parsePositiveInteger } from './positiveInteger'

// The list is described by the URL: the page, the status filter and the
// customer filter. A value the app does not know is treated as absent.
export type ListQuery = {
  page: number
  status?: InvoiceStatus
  customerId?: number
}

const isStatus = (value: string | null): value is InvoiceStatus =>
  value === 'draft' || value === 'finalized' || value === 'paid'

export const parseListQuery = (params: URLSearchParams): ListQuery => {
  const status = params.get('status')
  const customerId = parsePositiveInteger(params.get('customer'))
  return {
    page: parsePositiveInteger(params.get('page')) ?? 1,
    ...(isStatus(status) ? { status } : {}),
    ...(customerId !== null ? { customerId } : {}),
  }
}

// One list has one URL: the parameters in a fixed order, defaults left out.
export const listSearch = ({ page, status, customerId }: ListQuery): string => {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (customerId !== undefined) params.set('customer', String(customerId))
  if (page > 1) params.set('page', String(page))
  const search = params.toString()
  return search ? `?${search}` : ''
}

export const hasFilter = ({ status, customerId }: ListQuery): boolean =>
  status !== undefined || customerId !== undefined

type Condition = {
  field: 'finalized' | 'paid' | 'customer_id'
  operator: 'eq'
  value: boolean | number
}

const statusConditions = (status?: InvoiceStatus): Condition[] => {
  if (status === 'draft') {
    return [{ field: 'finalized', operator: 'eq', value: false }]
  }
  if (status === 'finalized') {
    return [
      { field: 'finalized', operator: 'eq', value: true },
      { field: 'paid', operator: 'eq', value: false },
    ]
  }
  if (status === 'paid') {
    return [
      { field: 'finalized', operator: 'eq', value: true },
      { field: 'paid', operator: 'eq', value: true },
    ]
  }
  return []
}

// The conditions sent to the API, all ANDed. Nothing is sent without a filter,
// so a mistake cannot look like a filter that matches everything.
export const toApiFilter = ({
  status,
  customerId,
}: ListQuery): string | undefined => {
  const conditions = statusConditions(status)
  if (customerId !== undefined) {
    conditions.push({ field: 'customer_id', operator: 'eq', value: customerId })
  }
  return conditions.length > 0 ? JSON.stringify(conditions) : undefined
}
