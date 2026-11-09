# Proposal: project foundation

## Why

Before building features, every change needs the same automated quality bar and a working deployment, so later pull requests stay small and are judged on behavior only. Today the repository has no lint, no CI, a Prettier configuration that cannot check non-TypeScript files, and no deployed environment.

## What Changes

- Add a quality gate: ESLint (TypeScript and React hooks rules), a working Prettier check, and one `verify` script that runs format check, lint, typecheck, tests and build. Each pull request carries a comment with the `verify` output for its head commit, posted by a `verify:pr` script.
- Fix the Prettier configuration (global TypeScript parser forced on every file) and the existing formatting and lint findings in the starter code, without changing behavior.
- Add a reproducible manual deployment to Cloudflare Pages (`deploy` script) that refuses to deploy a build without an API token. Deep links are served by the host's single-page application fallback.
- Add a preview deployment (`deploy:preview` script) that publishes the same production build to a fixed preview URL, so a change can be checked on the real host before it reaches the production URL.
- Set up OpenSpec (project context, Claude Code commands) and a short `CLAUDE.md` with repository conventions.
- Documentation skeleton: new `README.md` skeleton (run, test, deploy), `NOTES.md` as a running list of improvements, and a pull request template with a scenario-to-test table.
- Backlog: one GitHub issue per planned pull request.

## Capabilities

### New Capabilities

- `quality-gate`: the automated checks every change must pass, and how their result is recorded on each pull request.
- `hosting`: how the application is built, deployed and served, including deep links and token configuration.

### Modified Capabilities

- None.

## Non-goals

- No product behavior change. The starter pages still show placeholder data after this change.
- No GitHub Actions: CI is not enabled for this project, so a workflow would only show a failed status on every pull request. See design.md, Decision 3.
- No automatic deployment from CI: deploy integrations and repository secrets are not available, so deployment uses the host's CLI.
- No separate development environment or automatic per-pull-request previews: there is a single API instance, so a second environment would not isolate data. The preview deployment is manual, on one fixed URL, and shares the production API.
- No removal of unused starter dependencies or configuration (for example `react-table`, `babel.config.cjs`); listed in `NOTES.md` instead.

## Impact

- New dev dependencies: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `wrangler` (justified in design.md).
- New files: `eslint.config.mjs`, `.github/pull_request_template.md`, `scripts/check-deploy-env.mjs`, `scripts/verify-pr.mjs`, `openspec/`, `.claude/`, `CLAUDE.md`, `NOTES.md`.
- Changed files: `package.json` (scripts, dev dependencies), `.prettierrc.json`, `.prettierignore`, `README.md`, and small lint and format fixes in `src/` (no behavior change).
