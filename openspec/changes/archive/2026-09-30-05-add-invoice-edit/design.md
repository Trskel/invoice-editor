# Design: edit a draft invoice

## Context

See proposal.md for motivation. Facts about the API and the code that shape this change:

- `PUT /invoices/{id}` takes `{ invoice: { id, customer_id?, date?, deadline?, finalized?, paid?, invoice_lines_attributes? } }` and answers `200` with the full invoice. The generated client exposes it as `api.putInvoice({ id }, body)`. Fields left out are kept; `invoice_lines_attributes` left out keeps every line.
- Line instructions, verified on the live API in one request: `{ id, quantity }` updates a line and recomputes its price and tax; `{ id, _destroy: true }` deletes it; `{ product_id, quantity }` creates one. Deleting every line is accepted (the invoice then has no lines).
- The API cannot move a saved line to another product in one update (checked on 2026-09-30, moving a Toyota Camry line to the Toyota Corolla product):
  - `{ id, product_id }`, with or without the same quantity, changes only `product_id`: the line still says "Toyota Camry", VAT 20 %, 22 840,00 €.
  - `{ id, product_id, quantity }` with a new quantity recomputes the price from the new product, but keeps the old label and VAT rate, so the VAT is wrong.
  - Adding `label`, `unit` and `vat_rate` to the update stores them, but the price is only recomputed when the quantity changes.
- A line id that no longer exists answers `404` `{ status: 404, error: "Not Found" }`. A finalized invoice refuses any change except `paid` with `422` and a message (sometimes in French).
- `deadline: null` clears the deadline.
- The `PUT` answer does not always list the lines in id order; `GET` does (lines in creation order).
- React keeps a component's state when the same component renders at the same place: going from `/invoices/1/edit` to `/invoices/2/edit` matches the same route and keeps the page mounted.
- The creation change built `src/ui/InvoiceForm` for reuse: it takes `title`, `defaultValues` (read once), `submitLabel`, `onSubmit`, `isSubmitting` and `submitError`. Its "Cancel" link always leads to `/`.
- `useFieldArray` gives each row a generated key named `id`, and that name would collide with the id of a saved line.
- The detail page (`src/pages/InvoiceShow/index.tsx`) parses the id from the URL and handles loading, not found and load errors with retry; the edit page needs the same states.
- Mutations are not retried (TanStack Query's default).

## Goals / Non-Goals

**Goals:**

- The update sends exactly the changes, computed by a pure, unit-tested function from the invoice as loaded and the validated form.
- After saving, the stored invoice matches what the form showed: no line keeps the label or price of a product it no longer has.
- The edit and creation pages differ only in their default values, labels, submit handler and "Cancel" target.
- A finalized invoice never shows an editable form.

**Non-Goals:**

- An unsaved-changes guard, concurrent edit detection, line reordering (see proposal).

## Decisions

### 1. Form lines remember the saved line they came from

- A form line gains an optional `lineId: number`: the id of the saved line it was filled from, absent for a line added in the form. It is not called `id`, which `useFieldArray` uses for its own row keys.
- The yup schema accepts `lineId` as an optional number, so `ValidInvoiceForm` carries it to the mapper. It is never shown and never validated beyond its type.
- Creation is unchanged: `emptyInvoiceForm` and "Add line" produce lines without `lineId`, and `toCreatePayload` does not read it.

### 2. Filling the form: `invoiceToForm(invoice)`

- In `src/model/invoiceForm.ts`: `invoiceToForm(invoice: Invoice): InvoiceFormValues` returns the customer (or null), the date, the deadline (or null) and, for each line in the API's order, `{ lineId: line.id, product: line.product, quantity: line.quantity }`.
- The product comes from the line's embedded product, so the line shows its unit, unit price and VAT rate without a search request. The amounts and totals are then computed as in creation.
- Values that break a rule (a quantity of 0, a missing date) are kept as they are, so validation shows them instead of hiding them.

### 3. The update payload: `toUpdatePayload(invoice, values)`

- In `src/model/invoiceForm.ts`: `toUpdatePayload(invoice: Invoice, values: ValidInvoiceForm)` returns `{ id, customer_id, date, deadline, invoice_lines_attributes? }`.
- The invoice fields are always sent: three values, idempotent, and no second diff to test. `finalized` and `paid` are never sent, so saving cannot change the status.
- Line instructions, in form order, then the deletions of lines removed from the form:
  - no `lineId`: `{ product_id, quantity }`;
  - `lineId` with a different product: `{ id, _destroy: true }` then `{ product_id, quantity }` (the API does not refresh a line's product fields, see Context);
  - `lineId` with the same product and a different quantity: `{ id, quantity }`;
  - `lineId` with the same product and quantity: nothing;
  - a saved line whose id is in no form line: `{ id, _destroy: true }`.
- `invoice_lines_attributes` is left out when there is no line instruction, which the API treats as "keep every line".
- Like `toCreatePayload`, it only accepts `ValidInvoiceForm`. It is unit tested case by case with exact object equality, including "nothing changed".
- Alternative considered: send every line on every save (updates for all, deletions for the removed). Rejected: it sends updates the server does not need, and still needs the product-change rule.
- Alternative considered: update the saved line in place, which would keep its id and its position. Rejected: no single update gives a correct line (see Context). Sending the new `product_id` leaves the old label, VAT rate or price. Also sending `label`, `unit` and `vat_rate` would store values supplied by the client (the creation change sends none for that reason), and the price would still be stale unless the quantity changes too, which would take a second request that changes the quantity and changes it back. Deleting and creating lets the server derive every field from the product; the cost is a new line id and the line moving to the end.

### 4. The form is built from one snapshot of the invoice

- The page renders the form only once the invoice is loaded, and keeps that invoice in state (`useState(() => invoice)`) as the base of both the default values and the diff.
- The component that holds the snapshot is keyed by the invoice id (`key={invoice.id}`). When the URL moves to another invoice that is already cached, the loader shows it without a loading state; the key makes React mount a new form with a new snapshot instead of keeping the previous invoice's values.
- A background refetch (for example on window focus) can bring a newer invoice while the user edits. The form already ignores it (default values are read once); the diff must use the same snapshot, or it would compare the user's edits with lines the form never showed.
- A change made elsewhere in the meantime is not detected (see Non-goals). A line deleted elsewhere makes the save fail with the server's "Not Found", shown in the form's alert.

### 5. Save mutation

- `src/hooks/useUpdateInvoice.ts` wraps `useMutation`: it sends `api.putInvoice({ id }, { invoice: payload })` and returns the updated invoice.
- On success it stores the response under `invoiceKeys.detail(id)` and invalidates `invoiceKeys.lists()`, like creation, so the detail page shows the saved invoice without a request and the list is refetched when next shown.
- Before storing it, the lines of the response are sorted by id, the order `GET` returns (see Context). Without it, the detail page could show the lines in one order right after saving and in another after a refresh.
- Alternative considered: invalidate the detail entry instead of storing the response. Rejected: the detail page would show a loading state and send a request for data the `PUT` answer already holds.
- No retry: an update that creates lines is not idempotent; a request that timed out may have created them.
- The page shows the toast "Invoice #<id> updated" and navigates to `/invoices/<id>` with `replace: true` in the `mutate` call's own `onSuccess`. The history is then list, detail, detail: Back shows the detail page again, not the form. Without `replace`, Back would reopen the form on values that are already saved.

### 6. Where "Cancel" leads

- `InvoiceForm` gains a `cancelTo` prop (a path). Creation passes `/`, editing passes `/invoices/<id>`. The prop is required, so each page states where Cancel leads.

### 7. Shared loading states: `InvoiceLoader`

- `src/pages/InvoiceLoader.tsx` takes a render function: it parses the id from the URL (`parsePositiveInteger`), calls `useInvoice(id)`, renders "Loading invoice", "Invoice not found" (with "Back to invoices") or "Invoice could not be loaded" with "Retry", and otherwise calls `children(invoice)`.
- The detail page moves its current code there without changing behavior; its existing tests guard the move. The edit page uses the same component. It sits in `src/pages` next to `NotFound` and `RouteError` because it reads the route and fetches.
- Alternative considered: copy the states into the edit page. Rejected: two copies of the retry and not-found logic would drift.

### 8. Finalized invoices

- The edit page checks `invoiceStatus(invoice) !== 'draft'` (finalized, paid or not) and then shows an antd `Result` titled "Invoice #<id> is finalized", with "A finalized invoice can no longer be edited." and a "View invoice" link to the detail page. No form is mounted.
- A draft flagged as paid (possible through the API) is still a draft and stays editable. Saving does not send `paid`, so the flag is kept.

### 9. Page composition

- `src/pages/InvoiceEdit/index.tsx`: `InvoiceLoader`, whose render function returns a component keyed by the invoice id (Decision 4), then the finalized screen or `InvoiceForm` with title "Edit invoice #<id>", `invoiceToForm(snapshot)`, submit label "Save changes", `cancelTo` the detail page, `useUpdateInvoice` and the save error message (`apiErrorMessage`, as in creation).

### 10. Tests

- Unit: `invoiceToForm` (lines in order with `lineId`, no customer, no deadline, a quantity of 0 kept), `toUpdatePayload` (each line rule, removed lines, nothing changed, invoice fields, no `finalized` or `paid`), the schema accepting `lineId`.
- Page (`src/pages/InvoiceEdit/index.spec.tsx`), through `renderApp('/invoices/<id>/edit')` with MSW mocks for `getInvoice`, `putInvoice` and the searches; the received requests give the payload and the request count. Every `invoice-editing` scenario is covered there.
- A fixture builds an invoice with Toyota lines and known line ids, so the payload assertions name them.
- Page tests beyond the scenarios: the detail page after saving lists the lines by id when the `PUT` mock answers them in another order; moving from one edit URL to another with both invoices cached shows the second invoice's values.
- The detail page tests run unchanged against the shared loader.

## Risks / Trade-offs

- [The line shows the product's current price and VAT rate, while a saved line keeps the values it was saved with] → they differ only if a product changed after the line was saved; the catalogue is fixed in this API. The detail page after saving shows the stored values.
- [A line whose product changed moves to the end after saving] → recorded in the proposal's Non-goals; the server orders lines by creation.
- [Last save wins when two people edit the same draft] → listed in `NOTES.md`, with what the API would need (a version or `updated_at` check).
- [Refactoring the detail page inside a feature change] → behavior-preserving, covered by its existing tests, and in its own commit.

## Migration Plan

- No data or API change. Deployed with `yarn deploy:preview` and checked against the live API on a draft created for the purpose (change a quantity, change a product, remove a line, add a line, clear the deadline; compare the detail page with the form), then `yarn deploy` after merge.

## Open Questions

- None.
