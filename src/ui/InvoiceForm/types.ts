import { Control } from 'react-hook-form'
import { InvoiceFormValues, ValidInvoiceForm } from '../../model/invoiceForm'

// The form's store: it holds `InvoiceFormValues` and hands `ValidInvoiceForm`
// to the submit handler.
export type InvoiceControl = Control<
  InvoiceFormValues,
  unknown,
  ValidInvoiceForm
>
