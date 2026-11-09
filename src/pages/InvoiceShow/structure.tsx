import { TableProps } from 'antd'
import { InvoiceLine } from '../../types'
import formatAmount from '../../helpers/formatAmount'
import formatRate from '../../helpers/formatRate'

export const tableColumns: TableProps<InvoiceLine>['columns'] = [
  {
    key: 'label',
    title: 'Item',
    dataIndex: 'label',
  },
  {
    key: 'quantity',
    title: 'Quantity',
    dataIndex: 'quantity',
  },
  {
    key: 'unit',
    title: 'Unit',
    dataIndex: 'unit',
  },
  {
    key: 'unit_price',
    title: 'Unit price',
    render: (_, line) => formatAmount(line.product.unit_price),
  },
  {
    key: 'vat_rate',
    title: 'VAT rate',
    render: (_, line) => formatRate(line.vat_rate),
  },
  {
    // The stored line price (VAT included), the value the total sums.
    key: 'amount',
    title: 'Amount',
    render: (_, line) => formatAmount(line.price),
  },
]
