import { Customer } from '../types'

// The street, then the zip code and city. Empty parts are left out, with
// their separators; null when nothing is left.
const getCustomerAddress = (customer?: Customer) => {
  if (!customer) return null
  const cityInfos = [customer.zip_code, customer.city]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ')
  return (
    [customer.address, cityInfos]
      .map((part) => (part ?? '').trim())
      .filter(Boolean)
      .join(', ') || null
  )
}

export default getCustomerAddress
