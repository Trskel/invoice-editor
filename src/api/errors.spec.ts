import { AxiosError, AxiosResponse } from 'axios'
import { apiErrorMessage, httpStatus, isNotFound, shouldRetry } from './errors'

// What the API client throws when the server answers with `status`.
const answered = (status: number, data?: unknown) =>
  new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data,
  } as AxiosResponse)

// What it throws when there is no answer at all (offline, DNS, CORS).
const unanswered = () => new AxiosError('Network Error', 'ERR_NETWORK')

describe('httpStatus', () => {
  it('reads the status of an answered request', () => {
    expect(httpStatus(answered(404))).toBe(404)
  })

  it.each([
    ['a request without an answer', unanswered()],
    ['a plain error', new Error('boom')],
    ['a string', 'boom'],
    ['null', null],
    ['undefined', undefined],
  ])('is undefined for %s', (_name, error) => {
    expect(httpStatus(error)).toBeUndefined()
  })
})

describe('isNotFound', () => {
  it('is true for a 404 only', () => {
    expect(isNotFound(answered(404))).toBe(true)
    expect(isNotFound(answered(500))).toBe(false)
    expect(isNotFound(unanswered())).toBe(false)
  })
})

describe('shouldRetry', () => {
  it.each([
    ['a server error', answered(500)],
    ['a bad gateway', answered(502)],
    ['no answer', unanswered()],
    ['a plain error', new Error('boom')],
  ])('retries %s once, and not a second time', (_name, error) => {
    expect(shouldRetry(0, error)).toBe(true)
    expect(shouldRetry(1, error)).toBe(false)
  })

  it.each([400, 401, 404, 408, 422, 429])(
    'never retries a %i answer',
    (status) => {
      expect(shouldRetry(0, answered(status))).toBe(false)
    }
  )
})

describe('apiErrorMessage', () => {
  it('gives the message of a validation body', () => {
    const body = {
      message: 'Validation failed: Invoice lines product must exist',
      details: { 'invoice_lines.product': ['must exist'] },
    }

    expect(apiErrorMessage(answered(422, body))).toBe(
      'Validation failed: Invoice lines product must exist'
    )
  })

  it('gives the error of a { status, error } body', () => {
    expect(
      apiErrorMessage(answered(404, { status: 404, error: 'Not Found' }))
    ).toBe('Not Found')
  })

  it('prefers the message when a body has both', () => {
    expect(
      apiErrorMessage(answered(422, { message: 'Bad', error: 'Other' }))
    ).toBe('Bad')
  })

  it('gives a plain text body as it is', () => {
    expect(
      apiErrorMessage(answered(400, 'param is missing or the value is empty'))
    ).toBe('param is missing or the value is empty')
  })

  it.each([
    ['an empty body', ''],
    ['no body', undefined],
    ['a body without message or error', { foo: 'bar' }],
    ['a blank message', { message: '  ' }],
    ['a message that is not text', { message: { nested: true } }],
  ])('falls back to the status for %s', (_name, body) => {
    expect(apiErrorMessage(answered(500, body))).toBe(
      'The server answered with an error (status 500). Try again in a moment.'
    )
  })

  it('says the server could not be reached when there is no answer', () => {
    expect(apiErrorMessage(unanswered())).toBe(
      'The server could not be reached. Check your connection and try again.'
    )
  })

  it.each([
    ['a plain error', new Error('boom')],
    ['a string', 'boom'],
    ['null', null],
  ])('says the server could not be reached for %s', (_name, error) => {
    expect(apiErrorMessage(error)).toBe(
      'The server could not be reached. Check your connection and try again.'
    )
  })
})
