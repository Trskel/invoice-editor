import { Invoice } from '../../types'

let nextId = 100000

// An invoice with plausible defaults; each test overrides only the fields it
// asserts on.
export const buildInvoice = (overrides: Partial<Invoice> = {}): Invoice => {
  const id = overrides.id ?? nextId++
  return {
    id,
    customer_id: 1,
    customer: {
      id: 1,
      first_name: 'Jeannie',
      last_name: 'Flatley',
      address: '1320 Evelynn Dam',
      zip_code: '57824',
      city: 'Gleasonview',
      country: 'Montserrat',
      country_code: 'MS',
    },
    finalized: false,
    paid: false,
    date: '2026-09-01',
    deadline: '2026-10-01',
    total: null,
    tax: null,
    invoice_lines: [
      {
        id: id * 10,
        invoice_id: id,
        product_id: 5,
        quantity: 2,
        unit: 'piece',
        label: 'Audi A7',
        vat_rate: '0',
        price: '22070.0',
        tax: '0.0',
        product: {
          id: 5,
          label: 'Audi A7',
          vat_rate: '0',
          unit: 'piece',
          unit_price: '11035.0',
          unit_price_without_tax: '11035.0',
          unit_tax: '0.0',
        },
      },
    ],
    ...overrides,
  }
}

export const buildInvoicesPage = (
  invoices: Invoice[],
  pagination: { page?: number; total_entries?: number } = {}
) => {
  const page = pagination.page ?? 1
  const totalEntries = pagination.total_entries ?? invoices.length
  return {
    invoices,
    pagination: {
      page,
      page_size: 10,
      total_pages: Math.ceil(totalEntries / 10),
      total_entries: totalEntries,
    },
  }
}

// Finalized, unpaid invoice 100417 of the lifecycle scenarios.
export const buildFinalizedInvoice = (
  overrides: Partial<Invoice> = {}
): Invoice =>
  buildInvoice({ id: 100417, finalized: true, paid: false, ...overrides })

// Finalized and paid invoice 100421 of the lifecycle scenarios.
export const buildPaidInvoice = (overrides: Partial<Invoice> = {}): Invoice =>
  buildInvoice({ id: 100421, finalized: true, paid: true, ...overrides })

// Draft invoice 100500 of the lifecycle scenarios that the invoice form
// refuses: no customer, no date and no line.
export const buildIncompleteDraftInvoice = (
  overrides: Partial<Invoice> = {}
): Invoice =>
  buildInvoice({
    id: 100500,
    customer: undefined,
    date: null,
    invoice_lines: [],
    ...overrides,
  })

// Draft invoice 100500 of the editing scenarios: two Toyota lines with known
// line ids (1001 and 1002). Totals: 52 524,24 / 7 155,76 / 59 680,00.
export const buildToyotaInvoice = (overrides: Partial<Invoice> = {}): Invoice =>
  buildInvoice({
    id: 100500,
    date: '2026-09-29',
    deadline: '2026-10-29',
    invoice_lines: [
      {
        id: 1001,
        invoice_id: 100500,
        product_id: 12,
        quantity: 2,
        unit: 'piece',
        label: 'Toyota Prius',
        vat_rate: '10',
        price: '36840.0',
        tax: '3349.09',
        product: {
          id: 12,
          label: 'Toyota Prius',
          vat_rate: '10',
          unit: 'piece',
          unit_price: '18420.0',
          unit_price_without_tax: '16745.45',
          unit_tax: '1674.55',
        },
      },
      {
        id: 1002,
        invoice_id: 100500,
        product_id: 11,
        quantity: 1,
        unit: 'piece',
        label: 'Toyota Camry',
        vat_rate: '20',
        price: '22840.0',
        tax: '3806.67',
        product: {
          id: 11,
          label: 'Toyota Camry',
          vat_rate: '20',
          unit: 'piece',
          unit_price: '22840.0',
          unit_price_without_tax: '19033.33',
          unit_tax: '3806.67',
        },
      },
    ],
    ...overrides,
  })
