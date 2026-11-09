# Proposal: release documentation

## Why

Every required feature is implemented and deployed. A reviewer now needs to understand, run and judge the project quickly, and the repository does not help yet: the README is still the skeleton from the foundation change, a disclosure of AI usage is expected but missing, and the keyboard, screen reader and narrow-screen behavior was only checked through tests, never in a browser across the whole app.

## What Changes

- Rewrite `README.md` for a reviewer: overview and feature list with screenshots, live link, run, test and deploy, an architecture and data flow diagram, key decisions and trade-offs, testing approach, how the project was built (the whole workflow: spec-driven development, test-first development, review with `verify:pr` instead of CI and a preview deployment, archive, merge and release; one feature followed end to end; every pull request and its archived spec change), AI usage (tools, tasks, how the output was validated, examples of AI output corrected in review), dependency changes from the starter, and known limitations with a pointer to `NOTES.md`.
- Edit `NOTES.md`: check every entry against the current code, update or remove stale ones, and add the missing items the work surfaced (end-to-end tests, error monitoring, localization).
- Add screenshots under `docs/screenshots/`.
- Run an accessibility and narrow-screen pass on the deployed app: keyboard only, a screen reader, a 375 px wide viewport and a browser accessibility audit, on every page and flow. The pass found three issues that are fixed in this change: text that failed the contrast rule (the design theme is overridden one step darker), pages that scrolled sideways at 375 px (tables and the form grid now scroll inside their own container), and the list had no top-level heading. Remaining findings are recorded as known limitations.
- Check that `README.md`, `CLAUDE.md`, `openspec/config.yaml` and `openspec/specs/` agree with the code.
- Scan the full repository history for the API token and local environment files.
- Remove the unused starter dependencies and configuration: `react-table`, `babel.config.cjs`, `@babel/preset-env` and `babel-plugin-transform-import-meta`. Every page is done, and none of them is used: the tables use antd and Jest compiles with `ts-jest`.

## Capabilities

### New Capabilities

- `project-documentation`: what a reviewer or maintainer can learn and do from the repository's documentation: run the app, understand its design, trace each change to its specification, and see how AI was used.

### Modified Capabilities

- `app-shell`: text contrast meets the 4.5:1 rule after the theme override, and no page scrolls horizontally at 375 px because tables and the form grid scroll inside their own container.
- `invoices-list`: the list is introduced by a level-one heading "Invoices".

## Non-goals

- No new features. Column sort and the date range filter stay in `NOTES.md`.
- No automated accessibility tooling as a dependency; the audit uses the browser's built-in tools.
- No CI and no automatic deployment (see `NOTES.md`).
- No documentation site or separate architecture document: `README.md` is the entry point, `NOTES.md` holds improvements, `openspec/` holds behavior.

## Impact

- Changed files: `README.md`, `NOTES.md`, `package.json`, `yarn.lock`, and `CLAUDE.md` if the consistency check finds drift.
- New files: `docs/screenshots/*.png`, `openspec/specs/project-documentation/spec.md` (on archive).
- Removed files: `babel.config.cjs`.
- Fixed files in `src/`: `theme.ts` (new, the contrast overrides), `main.tsx` (applies the theme), `pages/InvoicesList/index.tsx` (heading and table scroll), `pages/InvoiceShow/index.tsx` (table scroll and stacked details), `ui/InvoiceForm/InvoiceForm.tsx` and `ui/InvoiceForm/InvoiceLinesEditor.tsx` (form header and line grid), `ui/StatusTag.tsx` (the paid tag text). Each fix has a test where the test environment can observe it (the heading); the rest are checked in the browser.
- No new dependency; one runtime and two development dependencies removed.
