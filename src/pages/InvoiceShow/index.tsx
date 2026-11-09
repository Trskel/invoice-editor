import { Link, useNavigate } from 'react-router'
import { Descriptions, Empty, Flex, Table, Typography } from 'antd'
import { tableColumns } from './structure'
import getCustomerAddress from '../../helpers/getCustomerAddress'
import getCustomerName from '../../helpers/getCustomerName'
import { invoiceStatus } from '../../model/invoiceStatus'
import InvoiceActions from '../../ui/InvoiceActions'
import InvoiceTotals from '../../ui/InvoiceTotals'
import StatusTag from '../../ui/StatusTag'
import { Invoice } from '../../types'
import InvoiceLoader from '../InvoiceLoader'

const BackToInvoices = () => <Link to="/">Back to invoices</Link>

// A missing value is shown as a dash.
const orDash = (value: string | null | undefined) => value || '-'

const InvoiceDetails = ({ invoice }: { invoice: Invoice }) => {
  const navigate = useNavigate()
  const status = invoiceStatus(invoice)
  const address = [
    getCustomerAddress(invoice.customer),
    invoice.customer?.country?.trim(),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Flex vertical gap="large">
      <div>
        <BackToInvoices />
      </div>

      <Flex justify="space-between" align="center" gap="1rem">
        <Flex align="center" gap="1rem">
          <Typography.Title level={1} style={{ margin: 0 }}>
            Invoice #{invoice.id}
          </Typography.Title>
          <StatusTag status={status} />
        </Flex>
        <InvoiceActions
          invoice={invoice}
          showEdit
          onDeleted={() => void navigate('/', { replace: true })}
        />
      </Flex>

      <Descriptions column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="Date">
          {orDash(invoice.date)}
        </Descriptions.Item>
        <Descriptions.Item label="Deadline">
          {orDash(invoice.deadline)}
        </Descriptions.Item>
        <Descriptions.Item label="Customer">
          {orDash(getCustomerName(invoice.customer))}
        </Descriptions.Item>
        <Descriptions.Item label="Address">{orDash(address)}</Descriptions.Item>
      </Descriptions>

      <Table
        dataSource={invoice.invoice_lines}
        columns={tableColumns}
        rowKey="id"
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description="No lines" /> }}
      />

      <InvoiceTotals lines={invoice.invoice_lines} />
    </Flex>
  )
}

const InvoiceShow = () => (
  <InvoiceLoader>
    {(invoice) => <InvoiceDetails invoice={invoice} />}
  </InvoiceLoader>
)

export default InvoiceShow
