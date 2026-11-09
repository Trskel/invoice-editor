import { invoiceStatus } from './invoiceStatus'

describe('invoiceStatus', () => {
  it('is draft when the invoice is not finalized', () => {
    expect(invoiceStatus({ finalized: false, paid: false })).toBe('draft')
  })

  it('is finalized when the invoice is finalized and not paid', () => {
    expect(invoiceStatus({ finalized: true, paid: false })).toBe('finalized')
  })

  it('is paid when the invoice is finalized and paid', () => {
    expect(invoiceStatus({ finalized: true, paid: true })).toBe('paid')
  })

  it('is draft when a draft is flagged as paid', () => {
    expect(invoiceStatus({ finalized: false, paid: true })).toBe('draft')
  })
})
