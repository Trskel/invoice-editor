# Tasks

## 1. Pure logic

- [x] 1.1 Add `src/model/positiveInteger.ts` with unit tests (`1`, `42`, `01`, `abc`, `0`, `-1`, `1.5`, `1e3`, a value above the safe integer range, empty, missing) and make `parsePage` use it (Decision 2); verify the new tests and the existing `pageParam` tests pass
- [x] 1.2 Add `src/model/invoiceTax.ts` with unit tests for every `invoice-amounts` VAT and total-excluding-VAT scenario (Decision 5); verify the tests fail first, then pass
- [x] 1.3 Add `src/api/errors.ts` (`httpStatus`, `isNotFound`, `shouldRetry`) with unit tests for both "Retry only when it can help" scenarios, and use `shouldRetry` in `src/main.tsx` (Decision 4); verify the tests and `yarn typecheck` pass

## 2. Router

- [x] 2.1 Move `App.tsx` to a route table with a layout route, a pathless error boundary route and a catch-all route; add `src/pages/NotFound.tsx` and `src/pages/RouteError.tsx`; make `renderApp` use the route table (Decision 7); verify the existing list and header tests pass unchanged
- [x] 2.2 Add `App.spec.tsx` tests for "Unknown URL", "Page fails to render" and "Recover by leaving the page"; verify they pass and the test output shows no error logs

## 3. Detail page

- [x] 3.1 Add `invoiceKeys.detail` and `src/hooks/useInvoice.ts` (Decision 1); verify `yarn typecheck` and `yarn lint` pass
- [x] 3.2 Write page tests for every `invoice-detail` scenario except the retry rule (Decision 8); verify they fail against the starter page
- [x] 3.3 Rewrite `src/pages/InvoiceShow` (id parsing, not-found, loading, error with retry, header with status and draft-only "Edit" link, details, lines table, totals block; Decisions 2, 6); verify the tests from 3.2 pass
- [x] 3.4 Delete `src/data` (Decision 9); verify `yarn verify` passes
- [x] 3.5 Add the "Back to invoices" link to the detail page (scenario "Return to the list", Decision 6): test first and verify it fails, then implement; verify `yarn verify` passes

## 4. Documentation

- [x] 4.1 Update the `NOTES.md` seeded-invoices entry (VAT is now derived with the server's formula, stored tax ignored; half-cent rounding not observed); add an entry for the retry rule (4xx never retried, 408 and 429 included); verify each entry states the reason and what is missing
- [x] 4.2 Check the structure sections of `README.md` and `CLAUDE.md` against the tree (router in `App.tsx`, `src/data` gone); verify both match

## 5. Integration

- [x] 5.1 `yarn deploy:preview`; verify on the preview URL against the live API: open an invoice from the list, refresh on `/invoices/<id>`, a seeded invoice's totals (VAT extracted, not the stored tax), a finalized invoice without "Edit", `/invoices/999999` and `/invoices/abc` show "Invoice not found", `/unknown` shows "Page not found", header link and the "Back to invoices" link return to the list
- [ ] 5.2 `yarn verify:pr` comment passing on the pull request head; scenario-to-test table filled in the pull request description
- [ ] 5.3 After merge, `yarn deploy`; verify the 5.1 checks on the production URL
