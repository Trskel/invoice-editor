import { Customer } from '../types'

const getCustomerName = (customer?: Customer) => {
  if (!customer) return null
  return `${customer?.first_name ?? ''} ${customer?.last_name ?? ''}`.trim()
}

export default getCustomerName
