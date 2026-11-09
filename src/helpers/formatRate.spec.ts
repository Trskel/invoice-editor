import formatRate from './formatRate'
import { normalizeSpaces } from '../specs/normalizeSpaces'

describe('formatRate', () => {
  it.each([
    ['0', '0 %'],
    ['5.5', '5,5 %'],
    ['10', '10 %'],
    ['20', '20 %'],
  ])('formats %s as %s', (rate, expected) => {
    expect(normalizeSpaces(formatRate(rate))).toBe(expected)
  })
})
