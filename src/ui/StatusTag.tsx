import { CSSProperties } from 'react'
import { Tag } from 'antd'
import { InvoiceStatus } from '../model/invoiceStatus'

interface TagSpec {
  label: string
  color: string
  // The preset green text fails the contrast ratio on its light background;
  // darken it without changing the tag's shape or background.
  style?: CSSProperties
}

const STATUS_TAGS: Record<InvoiceStatus, TagSpec> = {
  draft: { label: 'Draft', color: 'default' },
  finalized: { label: 'Finalized', color: 'blue' },
  paid: { label: 'Paid', color: 'green', style: { color: '#135200' } },
}

const StatusTag = ({ status }: { status: InvoiceStatus }) => {
  const { label, color, style } = STATUS_TAGS[status]
  return (
    <Tag color={color} style={style}>
      {label}
    </Tag>
  )
}

export default StatusTag
