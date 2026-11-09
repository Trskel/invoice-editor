# Design: create an invoice

## Context

See proposal.md for motivation. Facts about the API and the code that shape this change:

- `POST /invoices` takes `{ invoice: { customer_id, date, deadline, finalized, paid, invoice_lines_attributes: [{ product_id, quantity }] } }` and answers `200` with the full invoice (customer, lines with their product, computed `total` and `tax`). The generated client exposes it as `api.postInvoices(null, body)`.
- The server computes `line.price = quantity × product.unit_price` and the VAT with the formula the detail page already uses (`invoiceTax`).
- The server accepts line fields outside the schema (`label`, `vat_rate`, `unit`) and stores them: sending `vat_rate: "0"` zeroes the tax of the line. `price` is ignored.
- Server validation is thin: a missing customer or an unknown product answers `422`, but zero, negative and fractional quantities (truncated), a deadline before the date, a missing date and an invoice without lines are all accepted.
- Error bodies come in several shapes: `{ message, details? }` for validation, `{ status, error }` for some not-found answers, plain text for a missing `invoice` key or token, and an empty body for plain 404s.
- `react-hook-form`, `@hookform/resolvers` (5.x, whose `yupResolver` types the submitted values as the schema's output type) and `yup` are installed and unused. The starter create and edit pages are identical static markup.
- `CustomerAutoComplete` and `ProductAutoComplete` wrap `InfiniteScrollSelect` (an antd `Select` with server search and infinite scroll). They accept only `value`, `onChange` and `placeholder`: no id, no accessible name, no error status, and a failed search shows "No results".
- The query client does not retry mutations (TanStack Query's default); the test client sets the same explicitly.

## Goals / Non-Goals

**Goals:**

- Nothing the product considers invalid reaches the API, and the rules are pure functions with unit tests.
- The amounts shown while typing are the amounts the server will store.
- The form is one component that the edit change can reuse with different default values and a different submit handler.
- Every state of the save request is visible: invalid, saving, failed (with the server's reason), saved.

**Non-Goals:**

- Editing, finalizing and deleting (later changes).
- Mapping server validation `details` to fields.
- An unsaved-changes guard.

## Decisions

### 1. Form state in react-hook-form, rules in a yup schema

- `react-hook-form` holds the form state; antd inputs are controlled components, so each one is connected through `Controller`. Lines are a `useFieldArray`, which gives each line a stable key for adding and removing.
- The rules live in `src/model/invoiceForm.ts` as a yup schema (`invoiceFormSchema`), connected with `yupResolver`. The schema is pure and unit tested on its own, without rendering anything.
- Validation runs on the first submit, then again on every change (the library's default `onSubmit` mode with `reValidateMode: 'onChange'`), so the user is not shown errors before trying to save, and a message goes away as soon as it is fixed.
- On an invalid submit, the library focuses the first invalid field through the `ref` that `Controller` passes to each input (`shouldFocusError`, on by default). The select and date picker forward `focus()` through their ref.
- Alternative considered: antd's own `Form` store with its `rules`. Rejected: the rules would be spread across JSX props instead of one testable schema, and react-hook-form and yup are already installed and named in the project's stack (`openspec/config.yaml`).

### 2. Form values keep what the form shows

- `InvoiceFormValues = { customer: Customer | null; date: string | null; deadline: string | null; lines: { product: Product | null; quantity: number | null }[] }`.
- The whole customer and product are kept, not only their ids: the pickers show their label, and the line shows the product's unit, price and VAT rate without another request.
- Dates are `YYYY-MM-DD` strings, the format the API uses. The `DatePicker` works with `dayjs` objects; its `Controller` converts at the boundary (`dayjs(value)` in, `value?.format('YYYY-MM-DD') ?? null` out). The schema and the mapper then compare and send plain strings (ISO dates compare correctly as strings), and `src/model` does not depend on `dayjs`.
- `emptyInvoiceForm(today: string)` builds the initial values (no customer, date `today`, no deadline, one empty line). The page passes `dayjs().format('YYYY-MM-DD')`; tests pass a fixed date.

### 3. The payload is built only from validated values

- The schema's output type (`ValidInvoiceForm`) has a non-null customer, date and products and numeric quantities. `toCreatePayload(values: ValidInvoiceForm)` accepts only that type, so the compiler refuses a call with unvalidated values.
- The payload is `{ customer_id, date, deadline, finalized: false, invoice_lines_attributes: [{ product_id, quantity }] }`. `finalized: false` is explicit, so that "new invoices are drafts" is written in the code rather than left to a server default. No `label`, `unit`, `vat_rate` or `price` is sent (see Context).
- The mapper is unit tested, including the "nothing else is sent" case (exact object equality).

### 4. Quantity rule

- A whole number from 1 to 1 000 000. The lower bound and "whole" are product rules the server does not enforce. The upper bound keeps the quantity well inside the range where a JavaScript number is an exact integer (the value travels as a JSON number) and catches mistyped extra digits; 1 000 000 is far above any invoice seen in the data.
- The quantity input does not round (no `precision`): typing 1.5 shows 1.5 and an error, instead of silently becoming 2 as the server would silently make it 1.

### 5. Amounts while typing

- `src/model/lineAmount.ts`: `lineAmount(unitPrice: string, quantity: number): string` is `Big(unitPrice).times(quantity).toFixed()`, the server's formula.
- `pricedLines(lines)` in `src/model/invoiceForm.ts` keeps the complete lines (a product and a quantity that passes the quantity rule) and returns `{ price, vat_rate }` for each. The totals block feeds them to the existing `invoiceTotal` and `invoiceTax`, so the form and the detail page compute totals with the same functions.
- The lines and totals read the current values with `useWatch`, so only they re-render on each keystroke, not the whole form.

### 6. Save mutation

- `src/hooks/useCreateInvoice.ts` wraps `useMutation`: it sends `api.postInvoices(null, { invoice: payload })` and returns the created invoice.
- On success it stores the response under `invoiceKeys.detail(id)` (`setQueryData`), so the detail page opens without a loading state or a second request, and invalidates `invoiceKeys.lists()`, so every cached list page is refetched when next shown. It does not invalidate `invoiceKeys.all`: that would also mark the detail just stored as stale.
- No retry: creating is not idempotent, and a request that timed out may still have created the invoice.
- The page does the user-facing part in the `mutate` call's own `onSuccess`: toast, then `navigate('/invoices/<id>', { replace: true })`. With `replace`, the form's history entry becomes the detail page, so Back returns to the list and cannot resubmit or show a blank form.
- While `isPending`, the save button has `loading` (antd disables it); the form's submit handler also returns early when a save is pending, which covers an Enter key press in a field.

### 7. One message for a failed save

- `apiErrorMessage(error: unknown): string` in `src/api/errors.ts` returns, in order: the `message` field of a JSON body; the `error` field of a `{ status, error }` body; a non-empty plain-text body; "The server could not be reached. Check your connection and try again." when there is no response; otherwise "The server answered with an error (status <n>). Try again in a moment."
- The form shows an antd `Alert` (type error, role `alert`) with the title "The invoice could not be saved" and that message, above the actions. It stays until the next save attempt. A toast would disappear while the user is still reading or correcting the form.
- Mapping `details` to fields is left out: keys such as `invoice_lines.product` and `base` do not name a field or a line. Listed in `NOTES.md`.

### 8. Components

- `src/ui/InvoiceForm/InvoiceForm.tsx`: props `title`, `defaultValues`, `submitLabel`, `onSubmit(values: ValidInvoiceForm)`, `isSubmitting`, `submitError` (the message, or undefined). It renders the header row (title as `h1`, "Cancel" link to `/`, submit button), the customer and date fields, the lines editor, the totals and the error alert.
- `src/ui/InvoiceForm/InvoiceLinesEditor.tsx`: the column headers (Product, Quantity, Unit, Unit price, VAT rate, Amount), one row per line, "Add line". The starter's "Unit Tax Price" column is dropped: the VAT of a unit is not something the user needs to fill in or check here, and the totals show the VAT.
- `src/ui/InvoiceForm/InvoiceFormTotals.tsx`: the three totals, laid out like the detail page's totals block.
- `src/pages/InvoiceCreate/index.tsx`: composes `InvoiceForm` with `emptyInvoiceForm(today)`, `useCreateInvoice`, the toast and the navigation. The edit change will compose the same form with the invoice's values.
- `InfiniteScrollSelect` and the two autocompletes gain optional `id`, `aria-label`, `aria-describedby`, `status` (antd's error outline) and a forwarded `ref`, passed to the antd `Select`; the form sets `aria-invalid` on fields in error and ties each message to its field with `aria-describedby`. The select also receives `isError` and shows "Search failed" instead of "No results". Invoice fields have a visible `label` element tied with `htmlFor`; line fields, laid out as a grid under column headers, get their name from `aria-label` ("Product, line 2").

### 9. Tests

- Unit: `invoiceFormSchema` (every rule and message, a valid form, deadline equal to the date, no deadline), `toCreatePayload`, `pricedLines`, `lineAmount`, `emptyInvoiceForm`, `apiErrorMessage` (each body shape, no response, empty body).
- Page (`src/pages/InvoiceCreate/index.spec.tsx`), through `renderApp('/invoices/new')` with MSW mocks for `getSearchCustomers`, `getSearchProducts` and `postInvoices` (the received requests give the payload and the request count): every `invoice-creation` scenario except the screen reader walk, which is checked through accessible names and manually.
- "Form opens with defaults" fixes today's date with Jest's fake timers limited to `Date`, so user-event and the query client keep real timers.
- antd's `Select` renders its options in a virtual list that measures heights, which are zero in jsdom. If options do not render in tests, the select sets `virtual={false}`: pages hold 10 results, so virtualization brings nothing here.

## Risks / Trade-offs

- [antd components in jsdom (select popups, date picker typing) make page tests slow or brittle] → interact through roles and typing, not through CSS classes; keep rules in unit tests so page tests stay few.
- [The quantity limit of 1 000 000 is a product guess] → one constant in the schema, easy to change.
- [No unsaved-changes guard] → a click on "Cancel" or the header link loses the input; recorded in `NOTES.md`, planned with the edit change if time allows.
- [The server message may be in French or technical ("Validation failed: ...")] → shown as is under a plain-language title; mapping messages is listed in `NOTES.md`.
- [A slow first request after the API sleeps (several seconds)] → the button shows progress, and a second press is ignored.

## Migration Plan

- No data or API change. Deployed with `yarn deploy:preview` and checked against the live API (create an invoice, compare its detail page totals with the form's, check it appears in the list), then `yarn deploy` after merge. Invoices created during checks stay as drafts and can be deleted once deleting exists.

## Open Questions

- None.
