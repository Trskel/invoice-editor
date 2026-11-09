# Design: finalize, delete and mark invoices as paid

## Context

See proposal.md for motivation. Facts about the API and the code that shape this change:

- `PUT /invoices/{id}` with `{ invoice: { id, finalized: true } }` finalizes a draft, and with `{ invoice: { id, paid } }` changes the paid flag. It answers `200` with the full invoice. Fields left out are kept.
- A finalized invoice refuses any change except `paid`, and refuses `paid` sent together with any other field: `422` with a `message` (in French, "Une facture finalisée ne peut pas être modifiée"). A draft can be flagged as paid.
- `DELETE /invoices/{id}` answers `204` with an empty body for a draft, `404` with an empty body for an unknown id, and `422` `{ message: "Une facture finalisée ne peut pas être supprimée" }` for a finalized invoice. The generated client exposes it as `api.deleteInvoice({ id })`.
- The API finalizes a draft whatever it holds: no lines, no customer, no date, a quantity of 0.
- Checked on the live API 2026-09-30 (task 1.1, draft 100742, which stays finalized in the dataset): `PUT` with only `{ id, finalized: true }` answers `200` and sets `finalized` while keeping every other field (customer, date, lines, `paid: false`), then `{ id, paid: true }` and `{ id, paid: false }` each answer `200` and change only `paid`. `DELETE` of the finalized invoice answers `422` `{ message: "Une facture finalisée ne peut pas être supprimée" }`, confirming it cannot be removed.
- The `PUT` answer does not always list the lines in id order; `GET` does. `useUpdateInvoice` sorts them before storing the answer.
- The invoice form rules live in one yup schema (`invoiceFormSchema`), and `invoiceToForm(invoice)` turns a stored invoice into form values; together they tell whether a stored draft could be saved from the edit form.
- The detail page shows "Edit" for drafts in its header (`ButtonLink`). The list columns are defined in `src/pages/InvoicesList/structure.tsx`. Both pages use `invoiceStatus(invoice)`.
- Toasts go through `useToast()` (antd `notification`), with a `title`. The app does not wrap antd's `App` component, so antd's static `Modal.confirm` cannot read the app's context (antd warns about it); `Modal.useModal()` returns a `confirm` that renders inside the component tree.
- TanStack Query runs a mutation's own callbacks (given to `useMutation`) before those given to `mutate`. A mounted `useQuery` whose cache entry was removed builds a new one and fetches it on its next render.

## Goals / Non-Goals

**Goals:**

- One component offers the actions of an invoice, the same on the list and the detail page, and derives them from the status only.
- An incomplete draft is never finalized from this app: the same rules as the form decide it.
- Every action ends with a toast, and the list and detail caches agree with the server afterwards, including after a failure.
- The paid toggle feels instant; the irreversible actions only show a result the server confirmed.

**Non-Goals:**

- Actions on the edit page, a paid flag on drafts, bulk actions, undo (see proposal).

## Decisions

### 1. One actions component: `InvoiceActions`

- `src/ui/InvoiceActions.tsx` takes an `invoice`, an optional `showEdit` (the detail page passes it, the list does not) and an optional `onDeleted` callback. It renders the buttons of the invoice's status (`invoiceStatus`), in a small horizontal group, and the confirmation dialogs.
- Each button has the visible label ("Finalize", "Delete", "Mark as paid", "Mark as unpaid") and an `aria-label` of the label followed by ", invoice #<id>". The visible text is kept at the start of the accessible name, so a user who says the label to voice control still reaches it.
- The detail page's "Edit" moves into the component (`showEdit`), so it can be disabled with the other actions while one runs (Decision 7).
- The list gets an "Actions" column rendering the component per row. Each row mounts its own instance, so each row has its own mutation state: progress and disabling are per invoice without any bookkeeping.
- It sits in `src/ui` although it calls mutation hooks: like the pickers, it is a reusable component that fetches through hooks, and the pages keep composing.
- Alternative considered: an antd `Dropdown` menu per row. Rejected: one more click for one or two actions, and a menu is harder to reach by name in tests and with voice control.

### 2. Confirmations: `Modal.useModal()`

- "Finalize" and "Delete" open a confirmation through `Modal.useModal()`; the component renders the returned context holder. The delete dialog's confirm button is marked dangerous.
- The dialog closes when the user confirms, and the request runs with progress on the action's button (Decision 7), not in the dialog. Failures are then reported by the same toast for every action (Decision 8). antd keeps the dialog open when its `onOk` promise rejects, and rethrows the error; the dialog would need its own error display.
- Alternative considered: antd `Popconfirm`. Rejected: it is a popover anchored to the button, not a modal dialog; focus handling and the Escape key are weaker, and it crowds a table cell.
- Alternative considered: a declarative `<Modal open={...}>` per action. Rejected: an open state and a component per dialog for the same result.

### 3. Only complete drafts are finalized: `finalizeBlockers(invoice)`

- `src/model/finalizeBlockers.ts`: `finalizeBlockers(invoice: Invoice): string[]` validates `invoiceToForm(invoice)` with `invoiceFormSchema` (`abortEarly: false`) and returns the messages of every broken rule, in the schema's order, without duplicates. A message whose path is `lines[i].<field>` gets the prefix "Line <i + 1>: ". An empty array means the draft can be finalized.
- It is called when "Finalize" is activated, not while rendering: the list would otherwise validate every row on every render.
- When it returns messages, the component opens an information dialog "Invoice #<id> cannot be finalized yet" with the list, a link "Edit invoice" and a "Close" button, and sends nothing.
- Pure and unit tested (no lines, no date, no customer, a quantity of 0 on line 2, a complete draft).
- Alternative considered: no check, the server accepts it. Rejected: a finalized invoice cannot be edited or deleted, so an empty or wrong invoice would be frozen.
- Alternative considered: a disabled "Finalize" with a tooltip. Rejected: a disabled button cannot be focused, so keyboard and screen reader users would not learn why.

### 4. Three mutation hooks

- `src/hooks/useFinalizeInvoice.ts`: `api.putInvoice({ id }, { invoice: { id, finalized: true } })`.
- `src/hooks/useSetInvoicePaid.ts`: `api.putInvoice({ id }, { invoice: { id, paid } })`, taking `{ id, paid }`. Only these two fields: the server refuses `paid` with any other field on a finalized invoice.
- `src/hooks/useDeleteInvoice.ts`: `api.deleteInvoice({ id })`.
- None is retried (TanStack Query's default for mutations), as for creation and update.
- Alternative considered: one hook with an action parameter. Rejected: the three differ in their cache work (Decisions 5, 6), and a union parameter would mix them in one function.

### 5. Cache after finalizing: store the answer

- New `src/api/invoiceCache.ts` with `storeInvoice(queryClient, invoice)`: it sorts the lines by id and stores the invoice under `invoiceKeys.detail(id)`. `useUpdateInvoice` switches to it (its behavior does not change), and the finalize and paid hooks use it.
- `useFinalizeInvoice` on success: `storeInvoice`, then invalidate `invoiceKeys.lists()`, so the detail page shows the new status without a request and the list pages are refetched when shown.
- On error (every hook): invalidate the detail entry and the lists, so the page refetches and the actions shown match the server (for example a draft finalized in another tab).

### 6. Optimistic update for the paid flag only

- `useSetInvoicePaid`:
  - `onMutate`: cancel the running queries of the detail entry and the lists (a refetch in flight would overwrite the new value), keep their current data, write the new `paid` into the detail entry and into the invoice's row in every cached list page, and return the kept data.
  - `onError`: put the kept data back.
  - `onSuccess`: `storeInvoice` with the answer.
  - `onSettled`: invalidate the lists (and, after an error, the detail entry, Decision 5).
- Why only here: marking as paid is reversible, needs no confirmation, and almost never fails; on a cold API it takes several seconds, and a status that does not move for that long looks broken. Finalizing and deleting cannot be undone and are confirmed; showing them done before the server agrees would mislead, and undoing them on screen after a refusal would be worse.
- Alternative considered: plain invalidation with progress on the button, like the other actions. Kept as the fallback if the optimistic version does not fit the timebox; it is a smaller hook with the same spec except the scenario "status shown before the server answers".

### 7. Progress and disabling

- The component is busy while any of its three mutations is pending. While busy, every button of the invoice, and "Edit" when shown, is disabled, and the pending action's button shows antd's loading state.
- A paid toggle shows the new label at once (Decision 6), disabled until the server answers, so a second click cannot race the first.

### 8. Toasts

- Success, from the `mutate` call's `onSuccess` in the component: `toast.success({ title })` with "Invoice #<id> finalized", "deleted", "marked as paid" or "marked as unpaid".
- Failure, from the `mutate` call's `onError`: `toast.error({ title: "Invoice #<id> could not be <action>", description: apiErrorMessage(error) })`. `apiErrorMessage` already gives the server's `message`, or the "could not be reached" and "answered with an error" texts.
- The component stays mounted during the request (the dialog is already closed), so the callbacks of `mutate` run. For a deletion from the detail page, the component unmounts only after the navigation that follows success.

### 9. Deleting: leave the page, then forget the invoice

- `useDeleteInvoice` on success invalidates the lists. It returns the mutation and a `forget(id)` function that removes `invoiceKeys.detail(id)` from the cache.
- The component's success handler awaits `onDeleted()` first, then calls `forget(id)`. On the detail page, `onDeleted` navigates to `/` with `replace: true`: the history is then list, list, and Back does not reopen the deleted invoice.
- The order matters: removing the entry while the detail page is still mounted makes its `useQuery` fetch the deleted invoice on its next render, and "Invoice not found" would flash before the list. A page test asserts that no `GET` of the invoice follows the deletion. If that test passes with the removal done in the hook's own `onSuccess`, the simpler form is used and noted as a deviation.
- Forgetting the entry also covers a deletion from the list of an invoice opened earlier: its URL, typed again, asks the server and shows "Invoice not found" instead of the cached copy.

### 10. The list after deleting the last row of a page

- The list passes `onDeleted` to the actions of each row: when the page shown has one row and is not the first, it sets the URL to the previous page (`pageSearch(page - 1)`). The row count is the one before the deletion, known when the handler runs; no second request decides it.
- The "page past the end" message stays for stale links and bookmarks, as `NOTES.md` explains; this change removes the case where the app itself leads there.

### 11. Tests

- Unit: `finalizeBlockers` (Decision 3); `storeInvoice` through the existing `useUpdateInvoice` page tests (line order after saving), which must pass unchanged.
- Page, through `renderApp` with MSW mocks for `getInvoice`, `getInvoices`, `putInvoice` and `deleteInvoice`; the received requests give the bodies and the counts:
  - detail page (`src/pages/InvoiceShow/index.spec.tsx`): actions per status, finalize (confirm, cancel, Escape, blocked draft and its "Edit invoice" link), delete (list shown, Back, no `GET` after the deletion), mark as paid (status before the answer with a delayed mock, then the toast; refused with a rollback), progress and disabled buttons, failures with the server message and the refetch;
  - list (`src/pages/InvoicesList/index.spec.tsx`): the actions column per row, finalize, delete, last row of page 2, mark as unpaid, other rows available while one row's request runs, the detail page after an action in the list.
- Every `invoice-lifecycle` scenario is covered by at least one of them. The keyboard walk through a dialog (focus inside it, Escape, focus back on the button) is also checked by hand on the preview.

## Risks / Trade-offs

- [Finalizing through `PUT` behaves unlike creation with `finalized: true`] → checked first (task 1.1) on a draft created for the purpose; the finalized invoice stays in the dataset, since it can no longer be deleted.
- [Two sources of truth during the optimistic paid update] → the kept data is restored on error and the lists are invalidated when the request ends; the button is disabled meanwhile, so updates of one invoice cannot overlap.
- [`finalizeBlockers` follows the form rules, which are client-side only] → another client of the API can still finalize an incomplete invoice; already listed in `NOTES.md` ("The server checks little").
- [Checked at click time, a draft edited in another tab is judged on the cached copy] → the cache is refetched on focus after 30 seconds; the server refuses nothing here anyway, so the worst case is a dialog that is out of date by one refetch.
- [The detail page's "Edit" moves into a shared component] → the existing detail tests for "Edit" guard the move.

## Migration Plan

- No data or API change. Deployed with `yarn deploy:preview` and checked against the live API on drafts created for the purpose (finalize, mark as paid, mark as unpaid, delete from the detail page and from the list), then `yarn deploy` after merge. The finalized test invoices stay in the dataset.

## Open Questions

- None.
