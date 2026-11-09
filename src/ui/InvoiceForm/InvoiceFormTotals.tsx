import { useWatch } from 'react-hook-form'
import { pricedLines } from '../../model/invoiceForm'
import InvoiceTotals from '../InvoiceTotals'
import { InvoiceControl } from './types'

// Subscribes to the lines, so only the totals re-render on each keystroke.
const InvoiceFormTotals = ({ control }: { control: InvoiceControl }) => {
  const lines = useWatch({ control, name: 'lines' })
  return <InvoiceTotals lines={pricedLines(lines)} />
}

export default InvoiceFormTotals
