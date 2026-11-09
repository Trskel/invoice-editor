import { Typography } from 'antd'

// A validation message; the field points at it with `aria-describedby`, so a
// screen reader reads it with the field.
const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <Typography.Text id={id} type="danger">
      {message}
    </Typography.Text>
  ) : null

export default FieldError
