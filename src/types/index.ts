import { OperationMethods } from '../api/gen/client'
import { Awaited } from './helpers'
import { ReactNode } from 'react'

export type Invoice = Awaited<
  ReturnType<OperationMethods['getInvoices']>
>['data']['invoices'][0]

export type InvoiceLine = Invoice['invoice_lines'][0]

export type Product = Awaited<
  ReturnType<OperationMethods['getSearchProducts']>
>['data']['products'][0]

export type Customer = Awaited<
  ReturnType<OperationMethods['getSearchCustomers']>
>['data']['customers'][0]

export interface ColumnDefinition<T extends { id: unknown }> {
  key: string
  header: string
  accessor: (item: T) => unknown
  formatter?: (value: unknown) => ReactNode
}
