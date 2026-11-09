# Proposal: finalize, delete and mark invoices as paid

## Why

An invoice can be created and edited, but it stays a draft forever: nothing in the app finalizes it, marks it as paid or deletes it. A draft created by mistake cannot be removed, and a sent invoice cannot be recorded as paid. The list shows the status of each invoice but offers no way to change it.

The API supports all three: finalizing and marking as paid are updates of `finalized` and `paid`, and deleting is its own request. It also enforces the rules: a finalized invoice refuses every change except `paid` (sent alone), and cannot be deleted. It accepts almost anything else, including finalizing a draft without lines, without a date or with a quantity of 0, which would freeze an invoice that cannot be corrected any more.

## What Changes

- Each invoice offers the actions its status allows, on the detail page and in a new "Actions" column of the list:
  - a draft: "Finalize" and "Delete";
  - a finalized, unpaid invoice: "Mark as paid";
  - a paid invoice: "Mark as unpaid".
- "Finalize" asks for confirmation ("A finalized invoice can no longer be edited or deleted."), then finalizes the invoice. A draft that breaks a rule of the invoice form (no lines, no date, a quantity of 0...) cannot be finalized: the dialog lists what to fix and links to the edit page.
- "Delete" asks for confirmation ("This cannot be undone."), then deletes the draft. From the detail page, the list is shown next; in the list, the row disappears, and when it was the only row of a page after the first, the previous page is shown.
- "Mark as paid" and "Mark as unpaid" need no confirmation (both can be undone). The new status is shown at once, before the server answers, and reverted if the server refuses.
- While an action runs, its button shows progress and the other actions of that invoice cannot be activated. Every action ends with a toast: a success message, or the reason for the failure. After a failure, the invoice is reloaded, so the actions shown match what the server holds.
- The list and the detail page show the new status after every action, without a manual refresh.

## Capabilities

### New Capabilities

- `invoice-lifecycle`: the actions that change the status of an invoice or delete it, where they are offered, their confirmations, and the states of the requests they send.

### Modified Capabilities

- None. The list and the detail page keep their requirements; the actions are added next to them.

## Non-goals

- No lifecycle actions on the edit page: it is left for the detail page after saving.
- No "Mark as paid" on a draft, although the API accepts it: payment only applies to a finalized invoice (the status shown already treats a paid draft as a draft).
- No bulk actions (select several rows, finalize them all).
- No undo after deleting: the confirmation is the safeguard. Credit notes instead of deleting are a product idea for `NOTES.md`, not for this change.
- No payment date or amount: the API only stores a flag.

## Impact

- No new dependency.
- New files: `src/model/finalizeBlockers.ts` (what prevents a draft from being finalized, from the form rules, with tests), `src/hooks/useFinalizeInvoice.ts`, `src/hooks/useDeleteInvoice.ts`, `src/hooks/useSetInvoicePaid.ts`, `src/api/invoiceCache.ts` (storing an invoice answered by the API, shared with `useUpdateInvoice`), `src/ui/InvoiceActions.tsx`.
- Changed files: `src/hooks/useUpdateInvoice.ts` (uses the shared cache helper), `src/pages/InvoiceShow/index.tsx` (actions in the header), `src/pages/InvoicesList/index.tsx` and `structure.tsx` (actions column, page after deleting the last row), their tests, `src/specs/mocks` or fixtures if a helper is missing, `NOTES.md`, and `README.md` and `CLAUDE.md` if the structure sections change.
