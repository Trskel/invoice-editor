# Tasks

## 1. Pure logic

- [x] 1.1 Write `src/model/listQuery.spec.ts` (Decisions 1, 2, 9), moving the `pageParam` cases into it; verify the tests fail first
- [x] 1.2 Add `src/model/listQuery.ts` and delete `src/model/pageParam.ts` and its tests; verify the unit tests pass and `yarn typecheck` passes

## 2. Requests

- [x] 2.1 `useInvoices` takes the `ListQuery` and sends `toApiFilter`; `invoiceKeys.list` takes status and customer (Decision 6); verify the existing list, detail and lifecycle tests pass unchanged
- [x] 2.2 Add `useFilterCustomer` (Decision 5); verify `yarn typecheck` and `yarn lint` pass

## 3. List page

- [x] 3.1 Let the `getInvoices` mock capture the query parameters if it does not already; write page tests for every scenario of the `invoices-list` delta, and change the existing "last row of page 2" test to answer an empty page after the `DELETE` (Decisions 8, 9); verify the new tests fail against the current page and the changed one still passes
- [x] 3.2 Add the "Status" control (Decision 3)
- [x] 3.3 Add `allowClear` and `valueLabel` to `CustomerAutoComplete` and `InfiniteScrollSelect`, and the "Customer" picker to the list (Decisions 4, 5); verify the form tests pass unchanged
- [x] 3.4 Add "Clear filters" and the empty filter state (Decision 7), and keep the filters in the first-page link and the previous-page rule after deletion (Decisions 7, 8); verify the tests from 3.1 and the existing ones pass
- [ ] 3.5 Keyboard and screen reader check in a browser: reach the "Status" group by Tab and change it with the arrow keys; reach the "Customer" picker, search, choose with the arrow keys and Enter, then Tab to "Clear filters" and press Enter; verify no step needs a mouse and both controls are announced by name

## 4. Documentation

- [x] 4.1 Add `NOTES.md` entries for the column sort (moved out for the timebox; what the API supports: `date`, `deadline`, `id`, a second key as tie-breaker, no sort by customer name or by total), the date range filter (timebox, the `gteq` and `lteq` operators it would use), the customer search matching one word only, and rows leaving a filter after an action (Decision 8); verify each entry states the reason and what is missing
- [x] 4.2 Check the structure sections of `README.md` and `CLAUDE.md` against the tree (`pageParam.ts` removed, `listQuery.ts` added); verify both match

## 5. Integration

- [ ] 5.1 `yarn deploy:preview`; verify on the preview URL against the live API: each status shows the count of matching invoices and only rows with that tag; choosing customer 157 shows its 4 invoices, and with "Draft" its 1 draft; opening `/?customer=157` by URL shows the customer's name; a filtered page 2 survives a refresh and Back; `/?status=overdue` shows every invoice
- [ ] 5.2 `yarn verify:pr` comment passing on the pull request head; scenario-to-test table filled in the pull request description
- [ ] 5.3 After merge, `yarn deploy`; verify the 5.1 checks on the production URL
