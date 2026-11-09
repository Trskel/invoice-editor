import formatAmount from './formatAmount'
import { normalizeSpaces } from '../specs/normalizeSpaces'

describe('formatAmount', () => {
  it('formats in euros with French separators', () => {
    expect(normalizeSpaces(formatAmount('1234.5'))).toBe('1 234,50 €')
  })

  it('keeps the cents of a large amount', () => {
    // As a JavaScript number, this value is 90071992547409.98.
    expect(normalizeSpaces(formatAmount('90071992547409.99'))).toBe(
      '90 071 992 547 409,99 €'
    )
  })
})
