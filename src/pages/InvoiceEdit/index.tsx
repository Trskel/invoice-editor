import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Result } from 'antd'
import { apiErrorMessage } from '../../api/errors'
import { useToast } from '../../contexts/ToastContext'
import { useUpdateInvoice } from '../../hooks/useUpdateInvoice'
import {
  ValidInvoiceForm,
  invoiceToForm,
  toUpdatePayload,
} from '../../model/invoiceForm'
import { invoiceStatus } from '../../model/invoiceStatus'
import { Invoice } from '../../types'
import InvoiceForm from '../../ui/InvoiceForm/InvoiceForm'
import InvoiceLoader from '../InvoiceLoader'

const EditForm = ({ invoice }: { invoice: Invoice }) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const updateInvoice = useUpdateInvoice()
  // One snapshot of the invoice for the default values and for the diff: a
  // background refetch must not change what the diff is computed against.
  const [snapshot] = useState(invoice)
  const [defaultValues] = useState(() => invoiceToForm(snapshot))
  const detailPath = `/invoices/${snapshot.id}`

  const onSubmit = (values: ValidInvoiceForm) => {
    updateInvoice.mutate(toUpdatePayload(snapshot, values), {
      onSuccess: (updated) => {
        toast.success({ title: `Invoice #${updated.id} updated` })
        // Replace the form's history entry: Back shows the detail page, not
        // the form on values that are already saved.
        void navigate(detailPath, { replace: true })
      },
    })
  }

  return (
    <InvoiceForm
      title={`Edit invoice #${snapshot.id}`}
      defaultValues={defaultValues}
      submitLabel="Save changes"
      cancelTo={detailPath}
      onSubmit={onSubmit}
      isSubmitting={updateInvoice.isPending}
      submitError={
        updateInvoice.isError ? apiErrorMessage(updateInvoice.error) : undefined
      }
    />
  )
}

const InvoiceEdit = () => (
  <InvoiceLoader>
    {(invoice) =>
      invoiceStatus(invoice) === 'draft' ? (
        // Keyed by id: moving to another cached invoice gets a new snapshot.
        <EditForm key={invoice.id} invoice={invoice} />
      ) : (
        <Result
          title={`Invoice #${invoice.id} is finalized`}
          subTitle="A finalized invoice can no longer be edited."
          extra={<Link to={`/invoices/${invoice.id}`}>View invoice</Link>}
        />
      )
    }
  </InvoiceLoader>
)

export default InvoiceEdit
