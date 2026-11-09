import React from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ApiProvider } from './api'
import { shouldRetry } from './api/errors'
import { ToastProvider } from './contexts/ToastContext'
import { theme } from './theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data shown within 30 seconds of its last fetch is not refetched.
      staleTime: 30_000,
      // One retry for a transient failure, none after a client error such as
      // "not found"; the default (3, with backoff) delays the error state by
      // several seconds.
      retry: shouldRetry,
    },
  },
})

const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? ''
if (!API_TOKEN) {
  console.warn('VITE_API_TOKEN is not set — API calls will fail')
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <ApiProvider url="https://jean-test-api.herokuapp.com/" token={API_TOKEN}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </QueryClientProvider>
      </ApiProvider>
    </ConfigProvider>
  </React.StrictMode>
)
