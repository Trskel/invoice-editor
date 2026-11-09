// Reads a positive integer written in decimal digits only (leading zeros
// allowed). Anything else, or a value beyond the safe integer range, is null.
export const parsePositiveInteger = (
  value: string | null | undefined
): number | null => {
  if (value == null || !/^\d+$/.test(value)) return null
  const number = Number(value)
  return number >= 1 && Number.isSafeInteger(number) ? number : null
}
