import { lineAmount } from './lineAmount'

describe('lineAmount', () => {
  it('multiplies the unit price by the quantity', () => {
    expect(lineAmount('18420.0', 2)).toBe('36840')
  })

  it('is an exact decimal product, not a floating point one', () => {
    // 0.1 * 3 is 0.30000000000000004 with JavaScript numbers.
    expect(lineAmount('0.1', 3)).toBe('0.3')
  })

  it('keeps the cents of the unit price', () => {
    expect(lineAmount('19.99', 1000000)).toBe('19990000')
  })
})
