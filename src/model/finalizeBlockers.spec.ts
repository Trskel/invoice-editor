import {
  buildIncompleteDraftInvoice,
  buildToyotaInvoice,
} from '../specs/fixtures/invoices'
import { finalizeBlockers } from './finalizeBlockers'

const QUANTITY_MESSAGE = 'Enter a whole quantity from 1 to 1 000 000'

describe('finalizeBlockers', () => {
  it('returns nothing for a complete draft', () => {
    expect(finalizeBlockers(buildToyotaInvoice())).toEqual([])
  })

  it('asks for a line when the draft has none', () => {
    expect(finalizeBlockers(buildToyotaInvoice({ invoice_lines: [] }))).toEqual(
      ['Add at least one line']
    )
  })

  it('asks for a date', () => {
    expect(finalizeBlockers(buildToyotaInvoice({ date: null }))).toEqual([
      'Enter a date',
    ])
  })

  it('asks for a customer', () => {
    expect(
      finalizeBlockers(buildToyotaInvoice({ customer: undefined }))
    ).toEqual(['Select a customer'])
  })

  it('names the line whose quantity breaks a rule', () => {
    const invoice = buildToyotaInvoice()
    invoice.invoice_lines[1] = { ...invoice.invoice_lines[1], quantity: 0 }

    expect(finalizeBlockers(invoice)).toEqual([`Line 2: ${QUANTITY_MESSAGE}`])
  })

  it('lists every broken rule in the schema order', () => {
    const invoice = buildToyotaInvoice({ date: null })
    invoice.invoice_lines[1] = { ...invoice.invoice_lines[1], quantity: 0 }

    expect(finalizeBlockers(invoice)).toEqual([
      'Enter a date',
      `Line 2: ${QUANTITY_MESSAGE}`,
    ])
  })

  it('lists all the rules a draft that holds nothing breaks', () => {
    expect(finalizeBlockers(buildIncompleteDraftInvoice())).toEqual([
      'Select a customer',
      'Enter a date',
      'Add at least one line',
    ])
  })
})
