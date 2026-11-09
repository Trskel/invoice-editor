# Tasks

## 0. Dependency cleanup

- [x] 0.1 Remove `react-table`, `@babel/preset-env`, `babel-plugin-transform-import-meta` and `babel.config.cjs` (Decision 9); verify `grep` finds no reference in `package.json`, the configuration files or `src/` (the lockfile may keep them as dependencies of other packages), and `yarn verify` passes after deleting `node_modules` and running `yarn install --frozen-lockfile`
- [x] 0.2 Search by the full product label in the create and edit page specs, and make the `choose` helpers (and the list page's `chooseCustomer`) refuse a search text already sent in the test (Decision 10); verify `yarn verify` passes three times in a row, where the create page specs failed in two of three runs before

## 1. Checks (their findings feed the documentation)

- [x] 1.1 Scan the full history for the API token value and for committed environment files other than `.env` (Decision 8); verify zero matches, with the value never printed
- [x] 1.2 Keyboard pass on the production URL over every page and flow, including the list filters (task 3.5 of `07-add-list-filters`) (Decision 6); verify each step works without a mouse and record the findings
- [x] 1.3 Screen reader pass on the same flows (Decision 6); verify controls, errors and results are announced by name and record the findings
- [x] 1.4 Narrow-screen pass at 375 px and 768 px (Decision 6); verify no page scrolls horizontally and record the findings
- [x] 1.5 Fix the findings of the automated pass (Decision 11): the theme overrides in `src/theme.ts` applied in `main.tsx`, the darker paid tag, the list and detail table scroll, the stacked detail labels and the scrolling form line grid, and the "Invoices" heading; verify axe-core has no violation, Lighthouse scores 1.0 on the list, detail and form, no page scrolls horizontally at 375 px or 768 px, and `yarn verify` passes with a test for the heading
- [x] 1.6 Write the findings of the manual keyboard and screen reader passes (1.2, 1.3) into the pull request, with an outcome for each, and any that stays open into `NOTES.md` (Decision 6)

## 2. NOTES

- [x] 2.1 Check every `NOTES.md` entry against the code and the live app, update or remove stale ones, including the unused starter dependencies entry (Decisions 7, 9); verify each remaining entry has the three parts and matches the behavior
- [x] 2.2 Add the entries for end-to-end tests, error monitoring and localization (Decision 7); verify each states what led to it, why it matters and what is missing

## 3. README

- [x] 3.1 Take the screenshots from the release build (Decision 3); verify each file opens and shows the intended screen
- [x] 3.2 Write the overview, features and screenshots sections, and keep the run, test, verify and deploy commands (Decision 1); verify on a fresh clone in a temporary directory that `yarn install`, `yarn verify` and `yarn start` work as written and the app shows invoices
- [x] 3.3 Write the architecture section with the Mermaid diagram and the project structure (Decision 2); verify every path named exists and every `src/` folder is described
- [x] 3.4 Write the key decisions and testing sections; verify each decision links to the design note that argues it
- [x] 3.5 Write the "How it was built" section: workflow diagram and steps, evidence table, the list filters end to end, and the pull request table (Decision 4); verify every step names an artifact that exists, every test-first claim matches the archived tasks, and every pull request and specification link resolves
- [x] 3.6 Write the AI usage section with the tools table and the two corrected examples (Decision 5); verify each example links to evidence in the repository
- [x] 3.7 Write the dependency changes and known limitations sections; verify the added and removed packages match the manifest compared with the starter, and every limitation links to its `NOTES.md` entry
- [x] 3.8 Open the README on the repository host from the pushed branch; verify the diagram renders as a figure, the screenshots show, and every relative link works

## 4. Consistency

- [x] 4.1 Check `CLAUDE.md`, `openspec/config.yaml` and `openspec/specs/` against the code and the README; verify no removed file or name is referenced outside the archive and the three agree on commands and structure

## 5. Integration

- [x] 5.1 `openspec validate "08-add-release-documentation" --strict`; verify it passes
- [x] 5.2 `yarn deploy:preview` (the dependency cleanup changes the build inputs); verify the app loads on the preview URL and any accessibility fixes work there
- [ ] 5.3 `yarn verify:pr` comment passing on the pull request head; scenario-to-verification table and accessibility findings in the pull request description
- [ ] 5.4 After merge, `yarn deploy`; smoke test on the production URL against the live API: list, filters, detail, create, edit, finalize, mark as paid, delete a draft, and a refresh on a deep link; verify each works and delete the invoice created for the test
