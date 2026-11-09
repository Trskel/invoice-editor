import { useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import { apiErrorMessage } from '../../api/errors'
import { useToast } from '../../contexts/ToastContext'
import { useCreateInvoice } from '../../hooks/useCreateInvoice'
import {
  ValidInvoiceForm,
  emptyInvoiceForm,
  toCreatePayload,
} from '../../model/invoiceForm'
import InvoiceForm from '../../ui/InvoiceForm/InvoiceForm'

const InvoiceCreate = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createInvoice = useCreateInvoice()
  // Today in the user's time zone, read once when the page opens.
  const [defaultValues] = useState(() =>
    emptyInvoiceForm(dayjs().format('YYYY-MM-DD'))
  )

  const onSubmit = (values: ValidInvoiceForm) => {
    createInvoice.mutate(toCreatePayload(values), {
      // Runs only while this page is still shown, which is what navigating
      // needs (the cache work is in the hook).
      onSuccess: (invoice) => {
        toast.success({ title: `Invoice #${invoice.id} created` })
        // Replace the form's history entry: Back leads to the list and cannot
        // submit the form a second time.
        void navigate(`/invoices/${invoice.id}`, { replace: true })
      },
    })
  }

  return (
    <InvoiceForm
      title="New invoice"
      defaultValues={defaultValues}
      submitLabel="Save invoice"
      cancelTo="/"
      onSubmit={onSubmit}
      isSubmitting={createInvoice.isPending}
      submitError={
        createInvoice.isError ? apiErrorMessage(createInvoice.error) : undefined
      }
    />
  )
}

export default InvoiceCreate
