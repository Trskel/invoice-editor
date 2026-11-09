import Big from 'big.js'

// The amount of a line that is not saved yet: the unit price (VAT included) by
// the quantity, the formula the server applies when it saves the line. Decimal
// strings in, decimal string out.
export const lineAmount = (unitPrice: string, quantity: number): string =>
  Big(unitPrice).times(quantity).toFixed()
