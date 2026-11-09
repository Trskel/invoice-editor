import { Flex, Typography } from 'antd'
import Big from 'big.js'
import formatAmount from '../helpers/formatAmount'
import { invoiceTax } from '../model/invoiceTax'
import { invoiceTotal } from '../model/invoiceTotal'

const TotalRow = ({ label, amount }: { label: string; amount: string }) => (
  <Flex justify="space-between" gap="2rem">
    <Typography.Text>{label}</Typography.Text>
    <Typography.Text strong>{formatAmount(amount)}</Typography.Text>
  </Flex>
)

// The three totals of a set of lines, for a saved invoice and for a form.
const InvoiceTotals = ({
  lines,
}: {
  lines: { price: string; vat_rate: string }[]
}) => {
  const total = invoiceTotal(lines)
  const tax = invoiceTax(lines)

  return (
    <Flex vertical gap="small" align="flex-end">
      <Flex vertical gap="small">
        <TotalRow
          label="Total excluding VAT"
          amount={Big(total).minus(tax).toFixed()}
        />
        <TotalRow label="VAT" amount={tax} />
        <TotalRow label="Total including VAT" amount={total} />
      </Flex>
    </Flex>
  )
}

export default InvoiceTotals
