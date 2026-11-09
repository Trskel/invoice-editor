import Big from 'big.js'
import { invoiceTax, lineTax } from './invoiceTax'
import { invoiceTotal } from './invoiceTotal'

describe('lineTax', () => {
  it('extracts the VAT from an inclusive price and ignores the stored tax', () => {
    const seeded = { price: '105340.0', vat_rate: '20', tax: '21068.0' }
    expect(lineTax(seeded)).toBe('17556.67')
  })

  it('is zero for a zero rate', () => {
    expect(lineTax({ price: '22070.0', vat_rate: '0' })).toBe('0')
  })

  it('rounds half up to the cent', () => {
    // At 100 % the VAT is half the price: 0.01 gives exactly half a cent.
    expect(lineTax({ price: '0.01', vat_rate: '100' })).toBe('0.01')
    expect(lineTax({ price: '0.03', vat_rate: '100' })).toBe('0.02')
    // Not a half: 0.5 at 5 % is 0.0238... and rounds down.
    expect(lineTax({ price: '0.5', vat_rate: '5' })).toBe('0.02')
    // 0.35 at 10 % is 0.0318... and rounds up.
    expect(lineTax({ price: '0.35', vat_rate: '10' })).toBe('0.03')
  })
})

describe('invoiceTax', () => {
  it('sums the VAT rounded per line, not the VAT of the sum', () => {
    const lines = [
      { price: '0.10', vat_rate: '20', tax: null },
      { price: '0.10', vat_rate: '20', tax: null },
    ]

    expect(invoiceTax(lines)).toBe('0.04')
  })

  it('is zero for an invoice without lines', () => {
    expect(invoiceTax([])).toBe('0')
  })
})

describe('invoice amounts', () => {
  it('adds up: total excluding VAT + VAT = total', () => {
    const lines = [
      { price: '105340.0', vat_rate: '20', tax: '21068.0' },
      { price: '36840.0', vat_rate: '10', tax: '3684.0' },
    ]

    const total = invoiceTotal(lines)
    const tax = invoiceTax(lines)

    expect(total).toBe('142180')
    expect(tax).toBe('20905.76')
    expect(Big(total).minus(tax).toFixed()).toBe('121274.24')
  })
})
