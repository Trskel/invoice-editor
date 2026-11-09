import {
  Link,
  Outlet,
  RouteObject,
  RouterProvider,
  createBrowserRouter,
} from 'react-router'
import { Layout, Typography } from 'antd'
import InvoiceCreate from './pages/InvoiceCreate'
import InvoiceEdit from './pages/InvoiceEdit'
import InvoiceShow from './pages/InvoiceShow'
import InvoicesList from './pages/InvoicesList'
import NotFound from './pages/NotFound'
import RouteError from './pages/RouteError'

export function AppLayout() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/">
          <Typography.Text strong style={{ color: '#fff', fontSize: 18 }}>
            Invoice Editor
          </Typography.Text>
        </Link>
      </Layout.Header>

      <Layout.Content style={{ padding: '24px 48px' }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}

// The route table, exported so that tests mount the same routes in a memory
// router. The error boundary sits on a pathless route below the layout: an
// error replaces the page, not the header.
export const routes: RouteObject[] = [
  {
    Component: AppLayout,
    children: [
      {
        ErrorBoundary: RouteError,
        children: [
          { path: '/', Component: InvoicesList },
          { path: '/invoices/new', Component: InvoiceCreate },
          { path: '/invoices/:id/edit', Component: InvoiceEdit },
          { path: '/invoices/:id', Component: InvoiceShow },
          { path: '*', Component: NotFound },
        ],
      },
    ],
  },
]

// One router for the life of the app.
const router = createBrowserRouter(routes)

function App() {
  return <RouterProvider router={router} />
}

export default App
