import '@testing-library/jest-dom'
import { configure } from '@testing-library/dom'
import './mocks'
import { server } from './mocks/server'

// `waitFor` and `findBy*` poll up to 1s by default. The page tests fill antd
// fields and wait on debounced searches with real timers, so under parallel
// load (several jsdom workers on one machine) a correct app can need longer
// than that. Five seconds only affects how long a genuinely failing wait
// takes; a passing one resolves as soon as its condition holds.
configure({ asyncUtilTimeout: 5000 })

// React DOM prints this in development mode when DevTools are not installed.
// It's noise in the test output, so we silence it.
jest.spyOn(console, 'info').mockImplementation((...args) => {
  if (typeof args[0] === 'string' && args[0].includes('react-devtools')) return
  console.info(...args)
})

const { getComputedStyle } = window
window.getComputedStyle = (elt) => getComputedStyle(elt)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
