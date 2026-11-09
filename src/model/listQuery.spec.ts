import {
  ListQuery,
  hasFilter,
  listSearch,
  parseListQuery,
  toApiFilter,
} from './listQuery'

describe('parseListQuery', () => {
  it('reads the page, the status and the customer', () => {
    expect(
      parseListQuery(new URLSearchParams('status=draft&customer=157&page=2'))
    ).toEqual({ page: 2, status: 'draft', customerId: 157 })
  })

  it('is the unfiltered first page for an empty search string', () => {
    expect(parseListQuery(new URLSearchParams(''))).toEqual({ page: 1 })
  })

  it.each([
    ['1', 1],
    ['2', 2],
    ['12', 12],
  ])('reads ?page=%s as page %p', (value, page) => {
    expect(parseListQuery(new URLSearchParams({ page: value }))).toEqual({
      page,
    })
  })

  it.each([null, '', 'abc', '0', '-1', '1.5', '2abc', '1e3', ' 2'])(
    'falls back to page 1 for page %p',
    (value) => {
      const params = new URLSearchParams()
      if (value !== null) params.set('page', value)
      expect(parseListQuery(params)).toEqual({ page: 1 })
    }
  )

  it.each(['draft', 'finalized', 'paid'] as const)(
    'reads the %s status',
    (status) => {
      expect(parseListQuery(new URLSearchParams({ status }))).toEqual({
        page: 1,
        status,
      })
    }
  )

  it.each(['overdue', 'DRAFT', 'true', ''])(
    'treats the unknown status %p as absent',
    (status) => {
      expect(parseListQuery(new URLSearchParams({ status }))).toEqual({
        page: 1,
      })
    }
  )

  it('reads a positive integer customer', () => {
    expect(parseListQuery(new URLSearchParams('customer=20'))).toEqual({
      page: 1,
      customerId: 20,
    })
  })

  it.each(['abc', '0', '-1', '1.5', ''])(
    'treats the invalid customer %p as absent',
    (customer) => {
      expect(parseListQuery(new URLSearchParams({ customer }))).toEqual({
        page: 1,
      })
    }
  )
})

describe('listSearch', () => {
  it('is empty for the unfiltered first page', () => {
    expect(listSearch({ page: 1 })).toBe('')
  })

  it('writes the page number from page 2', () => {
    expect(listSearch({ page: 2 })).toBe('?page=2')
  })

  it('writes the status', () => {
    expect(listSearch({ page: 1, status: 'draft' })).toBe('?status=draft')
  })

  it('writes the customer', () => {
    expect(listSearch({ page: 1, customerId: 157 })).toBe('?customer=157')
  })

  it('writes the status, the customer and the page in a fixed order', () => {
    expect(listSearch({ page: 2, status: 'draft', customerId: 157 })).toBe(
      '?status=draft&customer=157&page=2'
    )
  })

  it('leaves out the unset values', () => {
    expect(
      listSearch({ page: 1, status: undefined, customerId: undefined })
    ).toBe('')
  })

  it('round-trips through parseListQuery', () => {
    const query: ListQuery = { page: 3, status: 'paid', customerId: 20 }
    expect(parseListQuery(new URLSearchParams(listSearch(query)))).toEqual(
      query
    )
  })
})

describe('hasFilter', () => {
  it('is false without a status and a customer', () => {
    expect(hasFilter({ page: 1 })).toBe(false)
  })

  it('is true with a status', () => {
    expect(hasFilter({ page: 1, status: 'draft' })).toBe(true)
  })

  it('is true with a customer', () => {
    expect(hasFilter({ page: 1, customerId: 20 })).toBe(true)
  })
})

describe('toApiFilter', () => {
  it('is undefined without a filter, so the parameter is not sent', () => {
    expect(toApiFilter({ page: 1 })).toBeUndefined()
  })

  it('sends the draft condition', () => {
    expect(toApiFilter({ page: 1, status: 'draft' })).toBe(
      '[{"field":"finalized","operator":"eq","value":false}]'
    )
  })

  it('sends the finalized and unpaid conditions', () => {
    expect(toApiFilter({ page: 1, status: 'finalized' })).toBe(
      '[{"field":"finalized","operator":"eq","value":true},{"field":"paid","operator":"eq","value":false}]'
    )
  })

  it('sends the finalized and paid conditions', () => {
    expect(toApiFilter({ page: 1, status: 'paid' })).toBe(
      '[{"field":"finalized","operator":"eq","value":true},{"field":"paid","operator":"eq","value":true}]'
    )
  })

  it('sends the customer condition alone', () => {
    expect(toApiFilter({ page: 1, customerId: 157 })).toBe(
      '[{"field":"customer_id","operator":"eq","value":157}]'
    )
  })

  it('sends the status conditions before the customer one', () => {
    expect(toApiFilter({ page: 1, status: 'draft', customerId: 157 })).toBe(
      '[{"field":"finalized","operator":"eq","value":false},{"field":"customer_id","operator":"eq","value":157}]'
    )
  })
})
