import { Button, Flex, Modal } from 'antd'
import { Link } from 'react-router'
import { apiErrorMessage } from '../api/errors'
import { useToast } from '../contexts/ToastContext'
import { useDeleteInvoice } from '../hooks/useDeleteInvoice'
import { useFinalizeInvoice } from '../hooks/useFinalizeInvoice'
import { useSetInvoicePaid } from '../hooks/useSetInvoicePaid'
import { finalizeBlockers } from '../model/finalizeBlockers'
import { invoiceStatus } from '../model/invoiceStatus'
import { Invoice } from '../types'
import ButtonLink from './ButtonLink'

interface InvoiceActionsProps {
  invoice: Invoice
  // The detail page shows Edit next to the other actions; the list does not.
  showEdit?: boolean
  // Called after a successful deletion, before the invoice is forgotten.
  onDeleted?: () => void | Promise<void>
}

// The actions an invoice's status allows, the same on the list and the detail
// page. Each instance owns its mutation state, so progress and disabling are
// per invoice without any bookkeeping.
const InvoiceActions = ({
  invoice,
  showEdit = false,
  onDeleted,
}: InvoiceActionsProps) => {
  const [modal, modalContextHolder] = Modal.useModal()
  const { toast } = useToast()
  const finalizeInvoice = useFinalizeInvoice()
  const deleteInvoice = useDeleteInvoice()
  const setPaid = useSetInvoicePaid()

  const status = invoiceStatus(invoice)
  const busy =
    finalizeInvoice.isPending || deleteInvoice.isPending || setPaid.isPending
  const name = (label: string) => `${label}, invoice #${invoice.id}`

  const finalize = () => {
    const blockers = finalizeBlockers(invoice)

    if (blockers.length > 0) {
      modal.info({
        title: `Invoice #${invoice.id} cannot be finalized yet`,
        content: (
          <Flex vertical gap="small">
            <ul>
              {blockers.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            <Link to={`/invoices/${invoice.id}/edit`}>Edit invoice</Link>
          </Flex>
        ),
        okText: 'Close',
      })
      return
    }

    modal.confirm({
      title: `Finalize invoice #${invoice.id}?`,
      content: 'A finalized invoice can no longer be edited or deleted.',
      okText: 'Finalize',
      cancelText: 'Cancel',
      onOk: () => {
        finalizeInvoice.mutate(invoice.id, {
          onSuccess: () =>
            toast.success({ title: `Invoice #${invoice.id} finalized` }),
          onError: (error) =>
            toast.error({
              title: `Invoice #${invoice.id} could not be finalized`,
              description: apiErrorMessage(error),
            }),
        })
      },
    })
  }

  const remove = () => {
    modal.confirm({
      title: `Delete invoice #${invoice.id}?`,
      content: 'This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => {
        deleteInvoice.mutate(invoice.id, {
          onSuccess: () => {
            toast.success({ title: `Invoice #${invoice.id} deleted` })
            // Navigate or leave the page first, then forget: removing the entry
            // while the detail page is still mounted would request the deleted
            // invoice again.
            void (async () => {
              await onDeleted?.()
              deleteInvoice.forget(invoice.id)
            })()
          },
          onError: (error) =>
            toast.error({
              title: `Invoice #${invoice.id} could not be deleted`,
              description: apiErrorMessage(error),
            }),
        })
      },
    })
  }

  const togglePaid = (paid: boolean) => {
    const action = paid ? 'marked as paid' : 'marked as unpaid'
    setPaid.mutate(
      { id: invoice.id, paid },
      {
        onSuccess: () =>
          toast.success({ title: `Invoice #${invoice.id} ${action}` }),
        onError: (error) =>
          toast.error({
            title: `Invoice #${invoice.id} could not be ${action}`,
            description: apiErrorMessage(error),
          }),
      }
    )
  }

  return (
    <>
      {modalContextHolder}
      <Flex gap="small">
        {showEdit && status === 'draft' && (
          <ButtonLink to={`/invoices/${invoice.id}/edit`} disabled={busy}>
            Edit
          </ButtonLink>
        )}

        {status === 'draft' && (
          <>
            <Button
              type="primary"
              aria-label={name('Finalize')}
              loading={finalizeInvoice.isPending}
              disabled={busy && !finalizeInvoice.isPending}
              onClick={finalize}
            >
              Finalize
            </Button>
            <Button
              danger
              aria-label={name('Delete')}
              loading={deleteInvoice.isPending}
              disabled={busy && !deleteInvoice.isPending}
              onClick={remove}
            >
              Delete
            </Button>
          </>
        )}

        {status === 'finalized' && (
          <Button
            type="primary"
            aria-label={name('Mark as paid')}
            loading={setPaid.isPending}
            disabled={busy && !setPaid.isPending}
            onClick={() => togglePaid(true)}
          >
            Mark as paid
          </Button>
        )}

        {status === 'paid' && (
          <Button
            aria-label={name('Mark as unpaid')}
            loading={setPaid.isPending}
            disabled={busy && !setPaid.isPending}
            onClick={() => togglePaid(false)}
          >
            Mark as unpaid
          </Button>
        )}
      </Flex>
    </>
  )
}

export default InvoiceActions
