# Design: release documentation

## Context

See proposal.md for motivation. State at the start of this change:

- Pull requests #9 and #11 to #16 are merged (#10, the foundation archive, was closed and folded into #11 as its first commit). Their specification changes are archived under `openspec/changes/archive/`, one folder per pull request.
- `README.md` (the foundation skeleton) already has the live link, run, test, verify and deploy commands, and a project structure list. `NOTES.md` is a running list of 19 entries written during the features.
- The only runtime dependencies are the starter's. Development dependencies added beyond the starter: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals` and `wrangler`, all justified in the foundation change design. Unused since the start: `react-table` (the tables use antd), and `babel.config.cjs` with `@babel/preset-env` and `babel-plugin-transform-import-meta` (the Jest `transform` sends every source file to `ts-jest`, which does not read the Babel configuration).
- Accessibility so far rests on tests that query by role and accessible name. The keyboard and screen reader check of the list filters (task 3.5 of `07-add-list-filters`) was left open and is folded into this change's pass.

## Goals / Non-Goals

**Goals:**

- A reviewer can judge the project from the README in about ten minutes and go deeper through links (pull requests, specifications, `NOTES.md`) only where they want to.
- Every claim in the documentation can be checked in the repository or on the live app.

**Non-Goals:**

- Repeating the specifications or the code in prose: the README summarizes and links.
- Fixing accessibility findings that need a redesign; they are recorded instead.

## Decisions

### 1. README structure: reviewer first

Sections in this order, so the first screen answers "what is it and does it work":

1. What it is, live link, screenshots
2. Features (the brief's requirements, then what was added: filters, validation, lifecycle rules)
3. Run, test, verify, deploy (kept from the skeleton, checked on a fresh clone)
4. Architecture: layers, data flow diagram, project structure
5. Key decisions and trade-offs (short list, each linking to the design note that argues it)
6. Testing approach
7. How it was built (the whole workflow: spec-driven, test-first, review, release; one feature end to end; pull request table)
8. AI usage
9. Dependency changes from the starter (added and removed)
10. Known limitations (summary, link to `NOTES.md`)

Target: under 350 lines. Long arguments stay in the change designs and are linked.

### 2. Architecture diagram in Mermaid

- The repository host renders Mermaid blocks as figures, the source is reviewable text in the diff, and nothing needs regenerating when it changes.
- Content: page, hook, query cache, API client, REST API, and the URL as the source of list state; one diagram, no more than about ten nodes.
- Alternatives considered: an image (drifts from the code, not reviewable in a diff); ASCII art (renders everywhere but is hard to read beyond a few boxes).

### 3. Screenshots of the deployed application

- PNG files in `docs/screenshots/`, taken from the release build with a headless browser at a fixed width (1280 px) so they are reproducible: the list with a filter, the detail of a finalized invoice, the invoice form with a validation message, and the list at 375 px from the narrow-screen pass. The release build is the one `yarn deploy:preview` serves; production only changes after the merge, so it cannot be the source before the pull request is written.
- The API data is the shared test data set; no personal data is involved.
- Alternative considered: an animated recording. Rejected: heavier, and a reviewer can use the live app instead.

### 4. How it was built: the whole workflow, then one row per pull request

The section explains the workflow once, shows where each step leaves evidence, walks one feature through it, and ends with the pull request table.

- **The loop**, as a short Mermaid flow (issue, specification, failing tests, implementation, review, archive and merge, deployment) followed by one paragraph per step:
  1. **Plan:** a fixed roadmap, one GitHub issue per pull request. New ideas during the work go to `NOTES.md`, not into the current change.
  2. **Specify (spec-driven development):** an OpenSpec change per pull request: the proposal (why, what, non-goals), the spec delta (requirements with Given/When/Then scenarios describing what the user sees), the design (decisions, each with the alternatives rejected) and the tasks (each with how it is verified). When the API's behavior was unclear, a small experiment against it came first and its result is written into the design. The change is drafted with AI, then reviewed, corrected and approved before any code.
  3. **Test first (test-driven development):** every scenario becomes at least one test before the code exists: unit tests for the pure logic in `src/model`, page tests that drive the UI as a user would, with the network mocked. The tests are run and seen failing for the right reason, then the code is written until they pass, then cleaned up under green tests. The scenario-to-test table in each pull request maps every scenario to its test, or to a manual check when a test environment cannot observe it.
  4. **Build:** small conventional commits; `yarn verify` (format, lint, types, tests, build) passes before each one.
  5. **Review:** every line read and understood before the pull request; `yarn verify:pr` posts the verification output for the exact head commit (there is no CI); the preview deployment is checked by hand against the live API.
  6. **Archive and merge:** the change is archived as the last commit, which folds its spec delta into `openspec/specs/` (the current behavior); squash merge, which closes the issue.
  7. **Release:** `yarn deploy` to production and the same checks on the production URL. Findings go back into the design (as findings) or into `NOTES.md`.
- **Where the evidence is:** a table from step to artifact (issue, `openspec/changes/archive/<change>/`, tests in the diff, the `verify:pr` comment, the preview checks in the pull request, `openspec/specs/`).
- **One feature end to end:** the list filters, from issue #7 to #16: the change folder, one scenario, the test that covers it, the pull request with its table and `verify:pr` comment. Concrete beats a description of the process.
- **What the history does not show:** tests and code land in the same commit, and pull requests are squash merged, so the failing test runs are not visible in `main`. They are recorded in each change's tasks ("verify the tests fail first, then pass") and in the pull requests. The foundation change (#9) is tooling only and has no test-first step.
- **The pull request table:** pull request (link), what it delivered, its archived specification change (link). This change's own row points to its archive folder, which exists only after `openspec archive`; that link is added in the archive commit and checked then.
- The README describes the workflow as it was actually followed; it does not claim practices that were not used.

### 5. AI usage: tools, controls, corrected examples

- A table with tool, model, tasks, and how the output was validated:

  | Tool        | Model              | Used for                                                                 |
  | ----------- | ------------------ | ------------------------------------------------------------------------ |
  | Claude Code | Claude Opus 5.5    | Planning and architecture: specification changes, designs, review passes |
  | Claude Code | Claude Sonnet 5.5  | Implementation: tests from the scenarios, code, documentation drafts     |
  | OpenCode    | DeepSeek 4.1 Flash | Implementation                                                           |
  | OpenSpec    | (not an AI model)  | Structure and lifecycle of the specification changes                     |

- The controls are the same whatever the tool: the specification is approved before any code, tests come from its scenarios, `yarn verify` gates every commit, every line is reviewed, and the preview deployment is checked by hand before merge. `CLAUDE.md` holds the conventions given to the assistants.
- Two examples of AI output corrected during review, each linked to the evidence in the repository:
  - The customer picker kept its search after a selection, so clearing a filter left it listing one customer. Found by hand on the preview, not by the tests; fixed in the shared component with a regression test (#16).
  - The first edit design updated saved invoice lines in place; two API experiments showed the server then stores wrong labels and VAT, and the design changed to delete and recreate lines, with the evidence written into the design (#14).

### 6. Accessibility and narrow-screen pass

- Where: the deployed app in Chrome (production for the first audit, the preview of this branch for the manual passes).
- What, on every page and flow (list with filters and pagination, detail, create, edit, finalize, delete, mark as paid, not found):
  - Keyboard only: every action reachable with Tab, operable with Enter, Space or the arrow keys, visible focus, no focus lost after a dialog or a navigation.
  - Screen reader (NVDA on Windows, the most used free screen reader, with Chrome): controls announced by name and role, errors and results announced.
  - Chrome device emulation at 375 px and 768 px: no content cut off; a wide table may scroll inside its own container.
  - The browser's built-in accessibility audit (Lighthouse) on the list, detail and form pages.
- Rule for findings: a fix that takes under about 30 minutes and stays within an existing requirement is made in this change, with a test where the behavior is observable in the test environment. Anything larger goes to `NOTES.md` and the README's known limitations. The findings and their outcome are listed in the pull request.
- Amended 2026-10-01: the automated pass (axe, Lighthouse) and the 375 px check found color contrast, horizontal overflow and a missing list heading. Javi chose to fix all three in this change instead of documenting them, which is why this change modifies `app-shell` and `invoices-list` (Decision 11).
- Alternative considered: an accessibility library as a test dependency, running in jsdom with the rest of the suite. Rejected: it is a new dependency, and it would have missed the failures that mattered here, because jsdom has no layout so axe cannot evaluate color contrast, and a static lint such as `jsx-a11y` only sees the source's plain HTML, not the antd DOM. The audit was instead run once in a real browser outside the repository (axe-core and Lighthouse in a temporary directory, nothing added to `package.json`), which does evaluate the rendered page; the manual pass stays for focus order, focus visibility and screen reader output, which no automated audit observes.

### 7. `NOTES.md`: edit, do not rewrite

- Check each entry against the current code and the live app; update or remove stale ones.
- Add only entries grounded in something seen during the work:
  - End-to-end tests: several behaviors could only be checked by hand because the test environment differs from a browser (antd radio buttons ignore pointer events on the input, virtual lists have no height, deep links depend on the host).
  - Error monitoring: failures are shown to the user but never reported anywhere.
  - Localization: server messages can arrive in French while the interface is in English, and dates and amounts use one fixed format.
- Order within each group: most useful first.

### 8. History scan for secrets

- Search every commit on every branch for the API token value and for `.env.local` or other environment files beyond the tracked placeholder `.env`, without printing the value. This checks the hosting requirement that the token is never committed. The result goes in the pull request.

### 9. Remove the unused starter dependencies

- Remove `react-table` from the dependencies, `@babel/preset-env` and `babel-plugin-transform-import-meta` from the development dependencies, and delete `babel.config.cjs`. Proof that nothing uses them, before and after: no import of `react-table` in `src/`, no Babel reference in the Jest, Vite or ESLint configuration, and `yarn verify` passes after a clean install (`node_modules` deleted, `yarn install --frozen-lockfile` after the lockfile update).
- Done first, in its own commit, so the rest of the change is checked on the final dependency set.
- The `NOTES.md` entry "Unused starter dependencies and configuration" is removed, and the README lists the removals with the reason.
- The Node version pinned in `.tool-versions` stays: the engine range that forced it came from `@babel/preset-env`, but other packages may need it too and changing the runtime is not part of this change.

### 10. Search helper in the page specs: one request per search text

- Finding: the `choose` helper of the create page spec waits for a new search request before it clicks an option, so that no request is sent after the test ends. Both products searched by the first six characters of their label, "Toyota", so the second choice repeated a search the query cache already held and there was no new request to wait for. It passed or timed out depending on timing: two of three full `yarn verify` runs failed, and the failure reproduced under CPU load with the log showing one "Toyota" request for two choices.
- Fix: products are searched by their full label, so every search text in a test is distinct, in the create and edit page specs. The helpers (and the list page's `chooseCustomer`) now throw a clear error if a test repeats a search text, instead of waiting five seconds for a request that cannot come.
- Not changed: the application code (the cache behavior is correct), the 10 second test timeout, and the worker count. The slowest form tests take about 4 to 5 seconds on a quiet machine; a machine loaded far beyond normal (ten busy loops on eight cores) can still exceed the timeout, which is not a race.

### 11. Accessibility and narrow-screen fixes

The pass ran axe-core (WCAG 2.1 A/AA) and the Lighthouse accessibility audit on the list, the detail page and the form on the deployed app, and measured the page width at 375 px and 768 px. Everything else (accessible names, roles, focus order, focus visibility) was already correct.

- **Contrast:** the only axe and Lighthouse failure on every page was `color-contrast`, all from default design tokens: the placeholder grey (`#bfbfbf` on white, 1.83:1), the primary blue used by links, primary buttons and the selected status filter (`#1677ff`, 4.1:1), the danger red (`#ff4d4f` on `#f5f5f5`, 2.99:1), the tertiary grey used by the detail labels (`#878787` on `#f5f5f5`, 3.29:1) and the green paid tag (`#389e0d` on `#f6ffed`, 3.37:1). Fix: a `ConfigProvider` theme in `src/theme.ts` that darkens the blue, the red, the tertiary text and the placeholder to the next step of the same palette (`#0958d9`, `#cf1322`, `rgba(0, 0, 0, 0.65)`, `rgba(0, 0, 0, 0.55)`), and a darker text color on the green paid tag. The look is unchanged; the audit then passes with Lighthouse 1.0 on the three pages.
- **Horizontal overflow:** at 375 px the page itself scrolled sideways (list 418 px, detail 174 px, form 12 px), because the tables and the fixed 24-column form grid widened the page instead of scrolling. Fix: `scroll={{ x: 'max-content' }}` on the list and detail tables, the detail `Descriptions` stack below the `sm` breakpoint, and the form line grid is wrapped in a container that scrolls (`overflow-x: auto`, minimum width 720 px). The add-line button and the field errors stay outside that container.
- **List heading:** the list had no top-level heading, so axe reported `page-has-heading-one` (best practice, not a WCAG rule). Fix: a level-one "Invoices" heading above the filter row, which also matches the detail and form pages.
- Alternative considered for contrast: leave it to `NOTES.md`. Rejected by Javi: the audit result is visible to any reviewer and the override is contained to one file.
- Alternative considered for the tables: hide the overflow with `overflow-x: hidden`. Rejected: it would cut content instead of letting it scroll.
