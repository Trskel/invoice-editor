import { TableProps } from 'antd'
import { Link } from 'react-router'
import { Invoice } from '../../types'
import getCustomerName from '../../helpers/getCustomerName'
import formatAmount from '../../helpers/formatAmount'
import { invoiceStatus } from '../../model/invoiceStatus'
import { invoiceTotal } from '../../model/invoiceTotal'
import InvoiceActions from '../../ui/InvoiceActions'
import StatusTag from '../../ui/StatusTag'

// `onDeleted` runs after a row was deleted, so that a page that becomes empty
// can lead to the previous one.
export const tableColumns = (
  onDeleted: () => void
): TableProps<Invoice>['columns'] => [
  {
    key: 'id',
    title: 'Number',
    dataIndex: 'id',
    // A real link: keyboard, middle-click and Ctrl/Cmd-click work natively.
    render: (id: number) => <Link to={`/invoices/${id}`}>#{id}</Link>,
  },
  {
    key: 'customer',
    title: 'Customer',
    render: (_, invoice) => getCustomerName(invoice.customer) || '-',
  },
  {
    key: 'date',
    title: 'Date',
    dataIndex: 'date',
    render: (date: string | null) => date ?? '-',
  },
  {
    key: 'deadline',
    title: 'Deadline',
    dataIndex: 'deadline',
    render: (deadline: string | null) => deadline ?? '-',
  },
  {
    key: 'status',
    title: 'Status',
    render: (_, invoice) => <StatusTag status={invoiceStatus(invoice)} />,
  },
  {
    key: 'total',
    title: 'Total',
    align: 'right',
    render: (_, invoice) => formatAmount(invoiceTotal(invoice.invoice_lines)),
  },
  {
    key: 'actions',
    title: 'Actions',
    render: (_, invoice) => (
      <InvoiceActions invoice={invoice} onDeleted={onDeleted} />
    ),
  },
]
