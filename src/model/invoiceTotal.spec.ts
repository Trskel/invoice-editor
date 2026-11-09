import { invoiceTotal } from './invoiceTotal'
import formatAmount from '../helpers/formatAmount'
import { normalizeSpaces } from '../specs/normalizeSpaces'

describe('invoiceTotal', () => {
  it('sums the line prices when the invoice has no stored total', () => {
    const total = invoiceTotal([{ price: '105340.0' }, { price: '36840.0' }])

    expect(normalizeSpaces(formatAmount(total))).toBe('142 180,00 €')
  })

  it('sums decimals exactly', () => {
    expect(invoiceTotal([{ price: '0.1' }, { price: '0.2' }])).toBe('0.3')
  })

  it('is zero for an invoice without lines', () => {
    expect(normalizeSpaces(formatAmount(invoiceTotal([])))).toBe('0,00 €')
  })
})
