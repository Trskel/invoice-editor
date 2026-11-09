# Tasks

## 1. Pure logic

- [x] 1.1 Add `lineId` to the form lines and the schema, and add `invoiceToForm` to `src/model/invoiceForm.ts` (Decisions 1, 2), with unit tests; verify the tests fail first, then pass, and the creation tests still pass
- [x] 1.2 Add `toUpdatePayload` to `src/model/invoiceForm.ts` (Decision 3), with unit tests for every line rule, removed lines, nothing changed and the invoice fields; verify the tests fail first, then pass, and `yarn typecheck` rejects a call with unvalidated values

## 2. Shared loading states

- [x] 2.1 Move the detail page's id parsing, loading, not found and error states into `src/pages/InvoiceLoader.tsx` and use it from the detail page (Decision 7); verify the detail page tests pass unchanged

## 3. Form and page

- [x] 3.1 Add an invoice fixture with Toyota lines and known line ids, and a `putInvoice` mock helper; verify `yarn typecheck` passes
- [x] 3.2 Write page tests for every `invoice-editing` scenario, the line order after saving and the move between two edit URLs (Decision 10); verify they fail against the starter page
- [x] 3.3 Add `cancelTo` to `InvoiceForm` and pass `/` from the creation page (Decision 6); verify the creation tests pass
- [x] 3.4 Add `src/hooks/useUpdateInvoice.ts`, storing the answer with its lines sorted by id (Decision 5); verify `yarn typecheck` and `yarn lint` pass
- [x] 3.5 Rewrite `src/pages/InvoiceEdit/index.tsx` (Decisions 4, 8, 9); verify the tests from 3.2 pass
- [x] 3.6 Stop Enter in the date and deadline fields from submitting the form (`InvoiceForm`, shared with creation); verify the test fails first, then passes

## 4. Documentation

- [x] 4.1 Add a `NOTES.md` entry for concurrent edits (last save wins, what the API would need) and update the unsaved-changes entry to cover the edit form; verify each entry states the reason and what is missing
- [x] 4.2 Check the structure sections of `README.md` and `CLAUDE.md` against the tree; verify both match

## 5. Integration

- [x] 5.1 `yarn deploy:preview`; verify on the preview URL against the live API, on a draft created for the purpose: "Edit" on its detail page opens the filled form, change a quantity, change a product, remove a line, add a line, clear the deadline, save; the toast and the detail page appear and match the form; Back does not show the form; the list shows the new total; "Cancel" returns to the detail page; `/invoices/100417/edit` shows the finalized message; a refresh on an edit URL shows the form
- [ ] 5.2 `yarn verify:pr` comment passing on the pull request head; scenario-to-test table filled in the pull request description
- [ ] 5.3 After merge, `yarn deploy`; verify the 5.1 checks on the production URL
