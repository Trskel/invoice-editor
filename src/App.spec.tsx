import userEvent from '@testing-library/user-event'
import { renderApp, screen } from './specs/testUtils'
import { mockEndpoint } from './specs/mocks/server'
import { buildInvoice, buildInvoicesPage } from './specs/fixtures/invoices'

describe('App layout', () => {
  it('returns to the invoices list from the header link', async () => {
    const user = userEvent.setup()
    mockEndpoint({
      endpointName: 'getInvoice',
      params: { pathParams: { id: '100389' } },
      response: buildInvoice({ id: 100389 }),
    })
    mockEndpoint({
      endpointName: 'getInvoices',
      response: buildInvoicesPage([buildInvoice({ id: 100389 })]),
    })
    const { router } = renderApp('/invoices/100389')

    await user.click(screen.getByRole('link', { name: 'Invoice Editor' }))

    expect(router.state.location.pathname).toBe('/')
    expect(
      await screen.findByRole('link', { name: '#100389' })
    ).toBeInTheDocument()
  })
})

describe('Unknown URL', () => {
  it('shows "Page not found" with a link to the list, under the header', async () => {
    renderApp('/unknown')

    expect(await screen.findByText('Page not found')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to invoices' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Invoice Editor' })
    ).toBeInTheDocument()
  })
})

describe('Route error screen', () => {
  // The invoice has no `invoice_lines`, which the detail page cannot render.
  const mockBrokenInvoice = () =>
    mockEndpoint({
      endpointName: 'getInvoice',
      params: { pathParams: { id: '100389' } },
      response: { ...buildInvoice({ id: 100389 }), invoice_lines: undefined },
    })

  // React and the router report the render error to the console; silence it
  // so that the test output stays readable.
  let consoleError: jest.SpyInstance
  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    consoleError.mockRestore()
  })

  it('replaces a page that fails to render, keeping the header', async () => {
    mockBrokenInvoice()
    renderApp('/invoices/100389')

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Back to invoices' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Invoice Editor' })
    ).toBeInTheDocument()
  })

  it('recovers when the user follows the link to the list', async () => {
    const user = userEvent.setup()
    mockBrokenInvoice()
    mockEndpoint({
      endpointName: 'getInvoices',
      response: buildInvoicesPage([buildInvoice({ id: 100390 })]),
    })
    renderApp('/invoices/100389')

    await user.click(
      await screen.findByRole('link', { name: 'Back to invoices' })
    )

    expect(
      await screen.findByRole('link', { name: '#100390' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})
