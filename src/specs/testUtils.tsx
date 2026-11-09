import React, { useState } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router'

import { serverBaseURL } from './mocks/server'
import { ApiProvider } from '../api'
import { ToastProvider } from '../contexts/ToastContext'
import { routes } from '../App'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

interface ProvidersProps {
  children: React.ReactNode
}

const Providers = ({ children }: ProvidersProps) => {
  // One client per rendered tree: no cache shared between tests.
  const [queryClient] = useState(createTestQueryClient)

  return (
    <ApiProvider url={serverBaseURL} token={''}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ApiProvider>
  )
}

const AllTheProviders = ({ children }: ProvidersProps) => (
  <Providers>
    <MemoryRouter>{children}</MemoryRouter>
  </Providers>
)

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Renders the whole application at `url` with an in-memory history. The
// returned router exposes the current location (`router.state.location`) and
// history navigation (`router.navigate(-1)` is the browser's back button).
export const renderApp = (url = '/') => {
  const router = createMemoryRouter(routes, {
    initialEntries: [url],
  })
  const result = render(<RouterProvider router={router} />, {
    wrapper: Providers,
  })
  return { router, ...result }
}

export * from '@testing-library/react'
export { customRender as render }
