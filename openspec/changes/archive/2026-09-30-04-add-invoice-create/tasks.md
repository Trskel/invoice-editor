# Tasks

## 1. Pure logic

- [x] 1.1 Add `src/model/lineAmount.ts` with unit tests for both "Line amount derived from the product" scenarios (Decision 5); verify the tests fail first, then pass
- [x] 1.2 Add `src/model/invoiceForm.ts`: form value types, `emptyInvoiceForm`, `invoiceFormSchema`, `pricedLines`, `toCreatePayload` (Decisions 2 to 5), with unit tests for every validation rule and message, the request content and the priced lines; verify the tests fail first, then pass, and `yarn typecheck` rejects a `toCreatePayload` call with unvalidated values
- [x] 1.3 Add `apiErrorMessage` to `src/api/errors.ts` with unit tests for each body shape, an empty body and no response (Decision 7); verify the tests fail first, then pass

## 2. Pickers

- [x] 2.1 Let `InfiniteScrollSelect` and both autocompletes take an id, an accessible name, a description, an error status, a ref and a failed-search state (Decision 8); verify `yarn typecheck`, `yarn lint` and the existing tests pass

## 3. Form and page

- [x] 3.1 Add customer and product fixtures and a `postInvoices` mock helper for the page tests; verify `yarn typecheck` passes
- [x] 3.2 Write page tests for every `invoice-creation` scenario (Decision 9); verify they fail against the starter page
- [x] 3.3 Add `src/hooks/useCreateInvoice.ts` (Decision 6); verify `yarn typecheck` and `yarn lint` pass
- [x] 3.4 Add `src/ui/InvoiceForm` (form, lines editor, totals) and rewrite `src/pages/InvoiceCreate/index.tsx` on top of it (Decisions 1, 6, 8); verify the tests from 3.2 pass
- [x] 3.5 Check the form with the keyboard only (tab order, opening and choosing in the pickers, typing dates, "Add line", "Remove line N", submitting with Enter) and read the names in the browser's accessibility tree; verify each field and action is reachable and named as the "Named fields" requirement says

## 4. Documentation

- [x] 4.1 Add `NOTES.md` entries: no unsaved-changes guard, server validation details not mapped to fields, the client-side rules the server does not enforce (quantity, deadline, date, at least one line) and the quantity limit; verify each entry states the reason and what is missing
- [x] 4.2 Check the structure sections of `README.md` and `CLAUDE.md` against the tree (`src/ui/InvoiceForm`); verify both match

## 5. Integration

- [x] 5.1 `yarn deploy:preview`; verify on the preview URL against the live API: open the form from "Create invoice", an invalid submit sends nothing, create an invoice with two lines, the toast and the detail page appear, the detail page totals equal the form's totals, Back leads to the list, the new invoice is in the list, a refresh on `/invoices/new` shows the form
- [ ] 5.2 `yarn verify:pr` comment passing on the pull request head; scenario-to-test table filled in the pull request description
- [ ] 5.3 After merge, `yarn deploy`; verify the 5.1 checks on the production URL
