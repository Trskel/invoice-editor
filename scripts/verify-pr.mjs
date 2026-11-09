// Runs `yarn verify` and posts its output as a comment on the current
// branch's pull request, so every pull request carries the result of the
// checks for its head commit. Requires the GitHub CLI (`gh`), logged in.
import { spawnSync } from 'node:child_process'
import { stripVTControlCharacters } from 'node:util'

const run = (cmd, args) => {
  const result = spawnSync(cmd, args, { encoding: 'utf8' })
  if (result.status !== 0) {
    console.error(result.stderr || `${cmd} ${args.join(' ')} failed`)
    process.exit(1)
  }
  return result.stdout.trim()
}

// The output must describe the commit reviewers see on the pull request.
if (run('git', ['status', '--porcelain', '--untracked-files=no'])) {
  console.error('Uncommitted changes: commit them before verifying.')
  process.exit(1)
}
const head = run('git', ['rev-parse', 'HEAD'])
const pr = JSON.parse(run('gh', ['pr', 'view', '--json', 'number,headRefOid']))
if (pr.headRefOid !== head) {
  console.error(
    `HEAD ${head.slice(0, 7)} is not the head of pull request #${pr.number}: push first.`
  )
  process.exit(1)
}

// One stream (2>&1) keeps the output of each check in the order it ran.
const verify = spawnSync('yarn verify 2>&1', { shell: true, encoding: 'utf8' })
// Some tools color their output regardless of FORCE_COLOR; keep the comment plain text.
const output = stripVTControlCharacters(verify.stdout)
  .replaceAll('\r', '')
  .trim()
process.stdout.write(`${output}\n`)
const passed = verify.status === 0

const body = [
  `## \`yarn verify\` on ${head.slice(0, 7)}: ${passed ? 'passes' : 'fails'}`,
  '',
  `Node ${process.versions.node}, yarn ${run('yarn', ['--version'])}.`,
  '',
  '<details><summary>Output</summary>',
  '',
  '```',
  output,
  '```',
  '',
  '</details>',
].join('\n')

run('gh', ['pr', 'comment', String(pr.number), '--body', body])
console.log(`Posted the result on pull request #${pr.number}.`)
process.exit(verify.status ?? 1)
