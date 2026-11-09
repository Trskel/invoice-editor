import Big from 'big.js'

// Decimal strings, as the API returns them.
type TaxedLine = { price: string; vat_rate: string }

// Line prices include tax, so the VAT is extracted from the price, rounded to
// the cent, like the server does on writes. The stored `tax` is ignored: the
// seeded lines store `price x rate / 100`, which is wrong for inclusive prices.
export const lineTax = (line: TaxedLine): string =>
  Big(line.price)
    .minus(Big(line.price).div(Big(line.vat_rate).div(100).plus(1)))
    .round(2, Big.roundHalfUp)
    .toFixed()

// The sum of the rounded line taxes, not the tax of the summed prices.
export const invoiceTax = (lines: TaxedLine[]): string =>
  lines.reduce((sum, line) => sum.plus(lineTax(line)), Big(0)).toFixed()
