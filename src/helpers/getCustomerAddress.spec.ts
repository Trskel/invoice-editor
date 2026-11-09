import getCustomerAddress from './getCustomerAddress'
import { buildInvoice } from '../specs/fixtures/invoices'

const customer = (overrides: Record<string, string> = {}) => ({
  ...buildInvoice().customer!,
  ...overrides,
})

describe('getCustomerAddress', () => {
  it('joins the street and the zip code and city', () => {
    expect(getCustomerAddress(customer())).toBe(
      '1320 Evelynn Dam, 57824 Gleasonview'
    )
  })

  it('is null without a customer', () => {
    expect(getCustomerAddress(undefined)).toBeNull()
  })

  it('is null when every part is empty', () => {
    expect(
      getCustomerAddress(customer({ address: '', zip_code: '', city: '' }))
    ).toBeNull()
  })

  it.each([
    [{ zip_code: '', city: '' }, '1320 Evelynn Dam'],
    [{ zip_code: '' }, '1320 Evelynn Dam, Gleasonview'],
    [{ address: '' }, '57824 Gleasonview'],
  ])('leaves out empty parts of %j', (overrides, expected) => {
    expect(getCustomerAddress(customer(overrides))).toBe(expected)
  })
})
