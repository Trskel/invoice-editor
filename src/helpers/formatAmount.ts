// Takes the decimal string the API returns. Intl.NumberFormat formats numeric
// strings exactly, without converting them to a floating-point number first.
const formatAmount = (value: string) => {
  return Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value as Intl.StringNumericLiteral)
}

export default formatAmount
