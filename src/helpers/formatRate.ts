import Big from 'big.js'

// Takes a rate in percent as the API returns it ("5.5"). Formats like
// `formatAmount`, so that a row shows one decimal separator: "5,5 %".
const formatRate = (percent: string) =>
  Intl.NumberFormat('fr-FR', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(Big(percent).div(100).toFixed() as Intl.StringNumericLiteral)

export default formatRate
