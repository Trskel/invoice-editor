import { delay, http, HttpResponse } from 'msw'
import { server, serverBaseURL } from './server'

// The update of an invoice: the requests received and the answer given.
// `response` can read the request (for example its body), and `onRequest` runs
// when the request arrives, so that a test can change what a list mock answers
// once the action has run.
export const mockPutInvoice = (
  id: number,
  response: object | ((request: Request) => object),
  options: {
    status?: number
    delay?: number | 'infinite'
    onRequest?: () => void
  } = {}
): Request[] => {
  const requests: Request[] = []
  server.use(
    http.put(`${serverBaseURL}/invoices/${id}`, async ({ request }) => {
      requests.push(request)
      options.onRequest?.()
      if (options.delay === 'infinite') await new Promise(() => undefined)
      else if (options.delay !== undefined) await delay(options.delay)
      const body = typeof response === 'function' ? response(request) : response
      return HttpResponse.json(body, { status: options.status ?? 200 })
    })
  )
  return requests
}

// The deletion of an invoice: the requests received. The API answers 204 with
// an empty body, and 422 with a message when the invoice cannot be removed.
export const mockDeleteInvoice = (
  id: number,
  options: {
    status?: number
    response?: object
    delay?: number | 'infinite'
    onRequest?: () => void
  } = {}
): Request[] => {
  const requests: Request[] = []
  server.use(
    http.delete(`${serverBaseURL}/invoices/${id}`, async ({ request }) => {
      requests.push(request)
      options.onRequest?.()
      if (options.delay === 'infinite') await new Promise(() => undefined)
      else if (options.delay !== undefined) await delay(options.delay)
      const status = options.status ?? 204
      if (status === 204) return new HttpResponse(null, { status })
      return HttpResponse.json(options.response ?? {}, { status })
    })
  )
  return requests
}
