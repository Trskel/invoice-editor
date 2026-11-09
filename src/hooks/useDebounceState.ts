import { useEffect, useState } from 'react'

const DEFAULT_DEBOUNCE = 300

const useDebounceState = <T>(value: T, timeout: number = DEFAULT_DEBOUNCE) => {
  const [state, setState] = useState<T>(value)

  useEffect(() => {
    if (timeout === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a timeout of 0 disables debouncing; the value is copied without a timer
      setState(value)
      return
    }

    const handler = setTimeout(() => setState(value), timeout)

    return () => clearTimeout(handler)
  }, [value, timeout])

  return state
}

export default useDebounceState
