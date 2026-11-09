import { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Button, Result, Spin } from 'antd'
import { isNotFound } from '../api/errors'
import { useInvoice } from '../hooks/useInvoice'
import { parsePositiveInteger } from '../model/positiveInteger'
import { Invoice } from '../types'

const NotFoundResult = () => (
  <Result
    status="404"
    title="Invoice not found"
    extra={<Link to="/">Back to invoices</Link>}
  />
)

const LoadedInvoice = ({
  id,
  children,
}: {
  id: number
  children: (invoice: Invoice) => ReactNode
}) => {
  const {
    data: invoice,
    isPending,
    isError,
    error,
    errorUpdatedAt,
    isFetching,
    refetch,
  } = useInvoice(id)

  if (isPending) return <Spin description="Loading invoice" />

  if (isError) {
    if (isNotFound(error)) return <NotFoundResult />
    return (
      <Result
        status="error"
        title="Invoice could not be loaded"
        subTitle={
          // Remounted at every failure, so that a failed retry is announced
          // again. The button is outside it and keeps the focus.
          <span role="alert" key={errorUpdatedAt}>
            Check your connection and try again.
          </span>
        }
        extra={
          <Button onClick={() => void refetch()} loading={isFetching}>
            Retry
          </Button>
        }
      />
    )
  }

  return children(invoice)
}

// Reads the id from the URL and shows the loading, not found and error states
// of the invoice; `children` renders it once loaded.
const InvoiceLoader = ({
  children,
}: {
  children: (invoice: Invoice) => ReactNode
}) => {
  const id = parsePositiveInteger(useParams().id)
  // An id that cannot be one is not looked up. The split keeps the hook
  // unconditional: it lives in LoadedInvoice, which only gets a valid id.
  return id === null ? (
    <NotFoundResult />
  ) : (
    <LoadedInvoice id={id}>{children}</LoadedInvoice>
  )
}

export default InvoiceLoader
