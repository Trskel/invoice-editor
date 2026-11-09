# Tasks

## 1. API check and pure logic

- [x] 1.1 On the live API, on a draft created for the purpose: `PUT` with only `{ id, finalized: true }`, then `{ id, paid: true }`, then `{ id, paid: false }`; verify each answers `200` with the full invoice and the expected flags, and record the result in the design Context (done 2026-09-30, draft 100742; `DELETE` of the finalized invoice answers `422`)
- [x] 1.2 Add `src/model/finalizeBlockers.ts` (Decision 3), with unit tests for no lines, no date, no customer, a quantity of 0 on line 2 and a complete draft; verify the tests fail first, then pass

## 2. Cache and mutations

- [x] 2.1 Add `src/api/invoiceCache.ts` with `storeInvoice` and use it in `useUpdateInvoice` (Decision 5); verify the edit page tests pass unchanged
- [x] 2.2 Add `useFinalizeInvoice`, `useDeleteInvoice` (with `forget`) and `useSetInvoicePaid` (optimistic, Decisions 4, 6, 9) in `src/hooks`; verify `yarn typecheck` and `yarn lint` pass

## 3. Actions and pages

- [x] 3.1 Add `putInvoice` and `deleteInvoice` mock helpers and fixtures for a finalized, a paid and an incomplete draft invoice if missing; verify `yarn typecheck` passes
- [x] 3.2 Write page tests for every `invoice-lifecycle` scenario on the detail page and the list (Decision 11); verify they fail against the current pages
- [x] 3.3 Add `src/ui/InvoiceActions.tsx` (Decisions 1, 2, 7, 8, 9)
- [x] 3.4 Use it in the detail page header with `showEdit` and `onDeleted` (navigate to `/` with `replace`); verify the detail tests from 3.2 and the existing ones pass
- [x] 3.5 Add the "Actions" column to the list and the previous-page rule after deleting the last row (Decision 10); verify the list tests from 3.2 and the existing ones pass
- [x] 3.6 Keyboard check in a browser: reach each action by Tab, open and confirm or cancel each dialog with the keyboard, Escape closes it and focus returns to the button; verify no action needs a mouse

## 4. Documentation

- [x] 4.1 Update the `NOTES.md` entries "A page past the end" (deleting no longer leads there) and "The server checks little" (finalizing uses the form rules); add product entries for credit notes instead of deleting and for payment details (date, amount); verify each entry states the reason and what is missing
- [x] 4.2 Check the structure sections of `README.md` and `CLAUDE.md` against the tree; verify both match

## 5. Integration

- [x] 5.1 `yarn deploy:preview`; verify on the preview URL against the live API, on drafts created for the purpose: finalize a complete draft from its detail page (Edit and Delete disappear), mark it as paid then unpaid from the list, try to finalize a draft without lines (dialog, no change), delete a draft from its detail page (list shown, Back does not reopen it) and another from the list; the list and detail page agree after each action; a refresh shows the same state
- [x] 5.2 `yarn verify:pr` comment passing on the pull request head; scenario-to-test table filled in the pull request description
- [x] 5.3 After merge, `yarn deploy`; verify the 5.1 checks on the production URL
