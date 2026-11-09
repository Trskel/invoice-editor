# Tasks

## 1. Pure logic

- [x] 1.1 Add `src/model/invoiceTotal.ts` with unit tests for the `invoice-amounts` total scenarios (Decision 5); verify the tests fail first, then pass
- [x] 1.2 Change `formatAmount` to take a decimal string and update its call sites in the detail page; unit test for "Large amount keeps its cents"; verify `yarn typecheck` and the test pass
- [x] 1.3 Add `src/model/invoiceStatus.ts` with unit tests for the status scenarios, including the paid draft (Decision 6); verify the tests pass
- [x] 1.4 Add `src/model/pageParam.ts` with unit tests for valid, invalid (`abc`, `0`, `-1`, `1.5`, empty) and page 1 values (Decision 3); verify the tests pass

## 2. Test infrastructure

- [x] 2.1 Extend `mockEndpoint` with `status` and received requests, add `src/specs/fixtures/invoices.ts`, let the test render utility take an initial URL (Decision 9); verify the existing test suite still passes

## 3. Data fetching

- [x] 3.1 Add `src/api/queryKeys.ts` and `src/hooks/useInvoices.ts` (Decision 1); set the query client defaults in `src/main.tsx` (Decision 2); verify `yarn typecheck` and `yarn lint` pass

## 4. List page

- [x] 4.1 Replace the starter test with page tests for every `invoices-list` scenario except "Open in a new tab"; verify they fail against the starter page
- [x] 4.2 Rewrite the list page and its columns: data from `useInvoices`, page from the URL, loading, error with retry, empty, out-of-range and next-page-loading states, invoice number links, "Create invoice" link (Decisions 3, 4, 7); verify the tests from 4.1 pass
- [x] 4.3 Add `src/ui/StatusTag.tsx` and use it in the status column; verify the status scenarios pass
- [x] 4.4 Give the detail page's lines table a row key (the list tests navigate to that page, and React warned about missing keys in the test output); verify the test output has no warnings

## 5. Header

- [x] 5.1 Replace the header placeholder with the "Invoice Editor" wordmark link and remove the `.demo-logo` CSS from `index.html` (Decision 10); page test for "Return to the list"; verify it passes

## 6. Documentation

- [x] 6.1 Add `NOTES.md` entries: seed invoices without stored totals and with tax computed on top of tax-inclusive prices; out-of-range page handled by a message rather than a redirect; verify each entry states the reason and what is missing
- [x] 6.2 Add `src/model` to the structure sections of `README.md` and `CLAUDE.md`; verify both match the tree

## 7. Integration

- [x] 7.1 `yarn deploy:preview`; verify on the preview URL against the live API: invoices load, page 2 through the control and through `/?page=2` directly, back button, `/?page=99` shows the out-of-range message, Ctrl-click and Cmd-click on an invoice number open a new tab, Tab and Enter open an invoice, header link returns to the list
- [x] 7.2 `yarn verify:pr` comment passing on the pull request head; scenario-to-test table filled in the pull request description
- [ ] 7.3 After merge, `yarn deploy`; verify the 7.1 checks on the production URL
