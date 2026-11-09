# Proposal: edit a draft invoice

## Why

The detail page of a draft offers "Edit", which opens a static copy of the old creation markup: it shows "INVOICE-<id>" and empty fields, and "Update invoice" reloads the page. A draft cannot be corrected once saved, so a typo in a quantity means deleting the invoice and creating it again (and deleting does not exist yet either).

The API updates lines through one list of instructions: a line with an id is updated, a line with an id and `_destroy` is deleted, a line without an id is created. It does not refresh a line whose product changes: the line keeps its old label, VAT rate and price (checked on the live API). The client therefore has to work out, from the invoice as loaded and the form as submitted, which instructions to send.

## What Changes

- The page at `/invoices/:id/edit` loads the invoice and shows the creation form, titled "Edit invoice #<id>" and filled with the invoice's customer, date, deadline and lines. The line amounts and totals are shown from the start.
- The same validation rules as creation apply, including to values that were saved before those rules existed (a seeded or API-created draft with a quantity of 0 cannot be saved until it is fixed).
- Saving ("Save changes") sends the customer, the date and the deadline, and for the lines only what changed: a new line is created, a removed line is deleted, a line whose quantity changed is updated, and a line whose product changed is deleted and created again, so the server derives its label, VAT rate and price from the new product. Unchanged lines are not sent.
- While saving, the button shows progress and cannot be pressed again. On success: a toast "Invoice #<id> updated" and the detail page in place of the form. On failure: the same inline error as creation, values kept.
- "Cancel" returns to the detail page of the invoice.
- A finalized invoice cannot be edited: the page says so and links to the detail page, without showing the form. The server refuses such changes anyway; the page does not offer them.
- While loading, for an unknown or invalid id, and when the invoice cannot be loaded, the page behaves like the detail page (same messages, retry). The detail page and the edit page share that code.

## Capabilities

### New Capabilities

- `invoice-editing`: editing a draft invoice with the invoice form, the changes sent to the API, and the states of loading and saving.

### Modified Capabilities

- None. The detail page keeps its behavior; only its loading code is shared.

## Non-goals

- No warning when leaving the form with unsaved changes (already listed in `NOTES.md`; stays out of the four-day scope).
- No detection of concurrent edits: if the invoice changed on the server after the form was opened, the last save wins, or the server refuses a line that no longer exists. Listed in `NOTES.md`.
- No reordering of lines. A line whose product changed is recreated, so it moves to the end of the invoice after saving (the server orders lines by creation).
- No finalizing, marking as paid or deleting from the edit page: planned in the lifecycle change.
- No "Edit" action in the invoices list: the entry point stays on the detail page.

## Impact

- No new dependency.
- New files: `src/hooks/useUpdateInvoice.ts`, `src/pages/InvoiceLoader.tsx` (loading, not found and error states shared with the detail page), `src/pages/InvoiceEdit/index.spec.tsx`.
- Changed files: `src/model/invoiceForm.ts` (lines keep the id of the saved line; `invoiceToForm`, `toUpdatePayload`, with tests), `src/ui/InvoiceForm/InvoiceForm.tsx` (where "Cancel" leads), `src/pages/InvoiceEdit/index.tsx` (rewritten), `src/pages/InvoiceShow/index.tsx` (uses the shared loader), `src/specs/fixtures`, `NOTES.md`, and `README.md` and `CLAUDE.md` if the structure sections change.
