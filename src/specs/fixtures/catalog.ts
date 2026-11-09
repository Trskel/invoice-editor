import { Customer, Product } from '../../types'

// A customer and a product with plausible defaults; each test overrides only
// the fields it asserts on.
export const buildCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 1,
  first_name: 'Jeannie',
  last_name: 'Flatley',
  address: '1320 Evelynn Dam',
  zip_code: '57824',
  city: 'Gleasonview',
  country: 'Montserrat',
  country_code: 'MS',
  ...overrides,
})

export const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 12,
  label: 'Toyota Prius',
  vat_rate: '10',
  unit: 'piece',
  unit_price: '18420.0',
  unit_price_without_tax: '16745.45',
  unit_tax: '1674.55',
  ...overrides,
})

const page = (total: number) => ({
  page: 1,
  page_size: 10,
  total_pages: Math.ceil(total / 10),
  total_entries: total,
})

export const buildCustomersPage = (customers: Customer[]) => ({
  customers,
  pagination: page(customers.length),
})

export const buildProductsPage = (products: Product[]) => ({
  products,
  pagination: page(products.length),
})
