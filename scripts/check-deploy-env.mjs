// Refuses to deploy a build without an API token.
// Uses Vite's own loader so it sees exactly what `vite build` will see
// (.env, .env.local, .env.production, and the process environment).
import { loadEnv } from 'vite'

const PLACEHOLDER = 'YOUR_API_TOKEN'

const env = loadEnv('production', process.cwd(), 'VITE_')
const token = env.VITE_API_TOKEN?.trim()

if (!token || token === PLACEHOLDER) {
  console.error(
    [
      'Deployment aborted: VITE_API_TOKEN is not set.',
      'The token is inlined into the build, so it must be configured before building.',
      'Create a .env.local file at the repository root (it is git-ignored) containing:',
      '',
      '  VITE_API_TOKEN=<your token>',
      '',
    ].join('\n')
  )
  process.exit(1)
}

console.log('VITE_API_TOKEN is set.')
