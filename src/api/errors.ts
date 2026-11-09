import { isAxiosError } from 'axios'

// The status of a failed API call, when the server answered at all.
export const httpStatus = (error: unknown): number | undefined =>
  isAxiosError(error) ? error.response?.status : undefined

export const isNotFound = (error: unknown): boolean => httpStatus(error) === 404

// A non-blank string, or undefined.
const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined

// The reason to show for a failed call. The API answers in several shapes:
// `{ message }` for validation, `{ status, error }` for some not-found answers,
// plain text for a missing key or token, and nothing at all for plain 404s.
export const apiErrorMessage = (error: unknown): string => {
  if (!isAxiosError(error) || !error.response) {
    return 'The server could not be reached. Check your connection and try again.'
  }
  const { status, data } = error.response
  const fromBody =
    typeof data === 'object' && data !== null
      ? (text((data as { message?: unknown }).message) ??
        text((data as { error?: unknown }).error))
      : text(data)
  return (
    fromBody ??
    `The server answered with an error (status ${status}). Try again in a moment.`
  )
}

// Retry once, and never after a client error (4xx): the server would give the
// same answer again.
export const shouldRetry = (failureCount: number, error: unknown): boolean => {
  const status = httpStatus(error)
  const isClientError = status !== undefined && status >= 400 && status < 500
  return failureCount < 1 && !isClientError
}
