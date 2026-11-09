import { parsePositiveInteger } from './positiveInteger'

describe('parsePositiveInteger', () => {
  it.each([
    ['1', 1],
    ['42', 42],
    ['100389', 100389],
    ['01', 1],
    ['0100389', 100389],
  ])('reads %p as %p', (value, expected) => {
    expect(parsePositiveInteger(value)).toBe(expected)
  })

  it.each([
    null,
    undefined,
    '',
    'abc',
    '0',
    '-1',
    '1.5',
    '1e3',
    '2abc',
    ' 2',
    // Above Number.MAX_SAFE_INTEGER: it would not be the id that was typed.
    '9007199254740993',
  ])('returns null for %p', (value) => {
    expect(parsePositiveInteger(value)).toBeNull()
  })
})
