import { Link } from 'react-router'
import { Result } from 'antd'

const NotFound = () => (
  <Result
    status="404"
    title="Page not found"
    extra={<Link to="/">Back to invoices</Link>}
  />
)

export default NotFound
