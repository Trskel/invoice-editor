# Proposal: create an invoice

## Why

"Create invoice" in the list opens a form that does nothing: the customer and product pickers ignore the selection, the date fields and the quantity are not connected to anything, "Add Line" and "Remove" have no effect, "Save invoice" reloads the page and "Cancel" goes nowhere. Its labels are not tied to their fields, so a screen reader announces unnamed inputs. The edit page is a copy of the same markup.

The API also accepts input a user should not be able to send: a quantity of zero, a negative quantity, a fractional quantity (silently truncated), a deadline before the date, an invoice without a date or without lines. It only rejects a missing customer or an unknown product. Validation therefore has to live in the client.

## What Changes

- The page at `/invoices/new` becomes a working form: customer, date, deadline and lines (product and quantity), with "Add line" and "Remove" on the lines.
- Each line shows the unit, unit price and VAT rate of the chosen product and the line amount (unit price × quantity), updated as the user types. A totals block shows the total excluding VAT, the VAT and the total including VAT, computed the same way as on the detail page.
- Validation before any request: a customer, a date and at least one line are required; each line needs a product and a whole quantity from 1 to 1 000 000; the deadline, when given, cannot be before the date. Each message is shown next to its field.
- Saving sends only the customer, the dates and, for each line, the product and quantity. The server derives labels, prices and taxes from the product; sending them would store client values instead.
- While saving, the save button shows progress and cannot be pressed again. On success: a toast "Invoice #<id> created" and the detail page of the new invoice. On failure: an error message on the form, with the server's explanation when it gives one; the values entered are kept.
- "Cancel" returns to the invoices list.
- Every field has an accessible name, including the product and quantity fields of each line.
- The form is a component the edit change will reuse; this change only wires it to the creation page.

## Capabilities

### New Capabilities

- `invoice-creation`: creating an invoice from a form, including validation, live amounts and every state of the save request.

### Modified Capabilities

- `invoice-amounts`: adds the line amount derived from the product's unit price and the quantity.

## Non-goals

- No editing of existing invoices: the edit page stays as it is and the edit change rewrites it on top of the same form.
- No finalizing or marking as paid at creation: new invoices are drafts. Finalizing is planned in the lifecycle change.
- No warning when leaving the form with unsaved input (listed in `NOTES.md`).
- No mapping of server validation details to individual fields: the server's message is shown once, on the form (see design.md, Decision 7).
- No change to the customer and product search components beyond what labels, validation display and a "search failed" message need (their loading and pagination stay as they are).
- No new product or customer creation from the form.

## Impact

- No new dependency: `react-hook-form`, `@hookform/resolvers` and `yup` are already installed and unused.
- New files: `src/model/invoiceForm.ts` (form values, validation schema, payload mapper, with tests), `src/model/lineAmount.ts` (with tests), `src/hooks/useCreateInvoice.ts`, `src/ui/InvoiceForm/*` (form, lines editor, totals), `src/pages/InvoiceCreate/index.spec.tsx`.
- Changed files: `src/pages/InvoiceCreate/index.tsx` (rewritten), `src/api/errors.ts` (error message helper, with tests), `src/ui/InfiniteScrollSelect.tsx` and the two autocompletes (accept an id, an accessible name and an error status), `src/specs/fixtures` (customer and product fixtures), `NOTES.md`, `README.md` and `CLAUDE.md` if the structure sections change.
