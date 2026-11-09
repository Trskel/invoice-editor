import Big from 'big.js'
import { InvoiceLine } from '../types'

// Line prices include tax, so the invoice total is their sum. Derived rather
// than read from `invoice.total`, which is null on the seeded invoices.
export const invoiceTotal = (lines: Pick<InvoiceLine, 'price'>[]): string =>
  lines.reduce((sum, line) => sum.plus(line.price), Big(0)).toFixed()
