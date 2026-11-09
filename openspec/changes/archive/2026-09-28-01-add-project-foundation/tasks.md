# Tasks

## 1. Formatting

- [x] 1.1 Remove the global `parser` from `.prettierrc.json` and update `.prettierignore` (Decision 2); verify `prettier --check .` reports only real formatting differences, no parser errors
- [x] 1.2 Add `format` and `format:check` scripts and format the repository; verify `yarn format:check` passes and `git diff` shows whitespace-only changes in `src/`

## 2. Lint

- [x] 2.1 Add ESLint 10, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals` as pinned dev dependencies and `eslint.config.mjs` (Decision 1); add `lint` script with `--max-warnings 0`; verify `yarn lint` runs and lists the starter findings
- [x] 2.2 Fix or suppress, with an inline reason, every starter finding without behavior change (Decision 5); verify `yarn lint`, `yarn typecheck` and `yarn test --ci` pass
- [x] 2.3 Verify the rules-of-hooks scenarios: a temporary conditional hook call and a temporary missing effect dependency each make `yarn lint` fail; revert both

## 3. Verification command and pull request result

- [x] 3.1 Add the `verify` script (Decision 3); verify it passes on the branch and that a temporary type error makes it fail with `typecheck` named in the output
- [x] 3.2 Add `scripts/verify-pr.mjs` and the `verify:pr` script (Decision 3); verify it posts a passing comment with the head commit, Node and yarn versions on this pull request
- [x] 3.3 Verify the failing and refusal scenarios: a temporary type error makes `yarn verify` fail on `tsc --noEmit` and a temporary unformatted file on `prettier --check` (reverted); `yarn verify:pr` with uncommitted changes and with an unpushed commit exits 1 without posting

## 4. Deployment

- [x] 4.1 Add pinned `wrangler` dev dependency, `scripts/check-deploy-env.mjs`, and the `deploy` and `deploy:preview` scripts (Decision 4); verify the check fails for both scripts with a clear message when `VITE_API_TOKEN` is unset, empty or the placeholder, and never prints the value
- [x] 4.2 Create the Cloudflare Pages project with `main` as production branch and run `yarn deploy:preview` from this branch; verify the command prints the preview URL, the site loads there, and the production URL has no deployment yet
- [x] 4.3 Verify the deep link scenarios on the preview URL: `curl -I` on `/invoices/new` returns 200 with the HTML shell, a refresh in the browser shows the creation page, and a built asset URL returns JavaScript, not HTML
- [x] 4.4 After merge, run `yarn deploy` from `main`; verify the command prints the production URL and repeat the 4.3 checks there
- [x] 4.5 Verify the production build succeeds without a token: `VITE_API_TOKEN=` overriding `.env.local`, `yarn build` exits 0

## 5. Conventions and documentation

- [x] 5.1 Commit the OpenSpec setup (`openspec/`, generated `.claude/` commands and skills); verify `openspec validate add-project-foundation --strict` passes
- [x] 5.2 Add `CLAUDE.md` (Decision 6); verify it contains only reviewer-appropriate project conventions
- [x] 5.3 Write the `README.md` skeleton: overview, requirements, run, test, verify, deploy (preview, then production), project structure placeholder; verify every command in the README runs as written
- [x] 5.4 Add `NOTES.md` with the first entries (token in the bundle, unused starter dependencies and Babel configuration, accessibility lint, automatic deployments); verify each entry states the reason and what is missing
- [x] 5.5 Add `.github/pull_request_template.md` with the scenario-to-test table; verify it renders on this pull request
- [x] 5.6 Create one GitHub issue per planned pull request and link this pull request to its issue; verify the issues list matches the roadmap

## 6. Integration

- [x] 6.1 `yarn verify:pr` comment passing on the pull request head; scenario-to-test table filled in the pull request description
