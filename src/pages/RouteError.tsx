import { useEffect } from 'react'
import { Link, useRouteError } from 'react-router'
import { Result } from 'antd'

// Shown by the router in place of a page that threw while rendering. The
// router resets it on the next navigation, so the link recovers without a
// reload. The user sees a generic text; the error goes to the console.
const RouteError = () => {
  const error = useRouteError()
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Result
      status="error"
      title="Something went wrong"
      subTitle="An unexpected error occurred while showing this page."
      extra={<Link to="/">Back to invoices</Link>}
    />
  )
}

export default RouteError
