# Proposal: invoice detail

## Why

Opening an invoice from the list shows hardcoded data: any id, known or not, falls back to the first starter invoice. The page never calls the API, shows the tax stored on the seeded lines (computed on top of tax-inclusive prices, so it is wrong), splits the status into two tags that can contradict each other ("Draft" and "Paid"), and uses an invalid layout value (`justify="between"`). An unknown address (`/invoices/abc`, `/foo`) shows a blank page, and an unexpected error while rendering leaves a blank screen.

## What Changes

- The detail page loads the invoice from the API by the id in the URL and shows: invoice number, status, date, deadline, customer (name and address) and its lines (item, quantity, unit, unit price, VAT rate, amount).
- A totals block shows the total excluding VAT, the VAT and the total including VAT, all derived from the lines with decimal arithmetic. VAT is extracted from the tax-inclusive line prices with the formula the server uses on writes, so seeded and new invoices show consistent figures.
- One status tag, shared with the list ("Draft", "Finalized", "Paid").
- A "Back to invoices" link above the title.
- An "Edit" link for drafts only; a finalized invoice cannot be modified (the API enforces it).
- States: loading, not found (unknown id, or an id that is not a positive integer, answered without a request), error with retry.
- Failed requests are retried once only when a retry can help: a "not found" or another client error is shown immediately.
- The router moves to a route table with a shared layout, which gives: a "Page not found" page for unknown URLs, and a route-level error screen for unexpected errors, with the header still visible and a way back to the list.
- The hardcoded starter data (`src/data`) is removed; no page uses it any more.

## Capabilities

### New Capabilities

- `invoice-detail`: viewing one invoice, including every state of the request that loads it.

### Modified Capabilities

- `invoice-amounts`: adds VAT and total excluding VAT derived from the lines.
- `app-shell`: adds the "Page not found" page and the route-level error screen.

## Non-goals

- No actions on the invoice (finalize, delete, mark as paid): planned in a later change. The "Edit" link leads to the existing edit page, which the edit change rewrites.
- No reuse of the list's cached data to show the invoice before its own request answers (see design.md, Decision 3).
- No date formatting change: dates stay in the ISO form the list uses.
- No PDF, print or share action.
- No mapping of API error messages; the detail page only distinguishes "not found" from other failures.

## Impact

- No new dependency.
- New files: `src/hooks/useInvoice.ts`, `src/api/errors.ts` (with tests), `src/model/invoiceTax.ts` (with tests), `src/model/positiveInteger.ts` (with tests), `src/pages/InvoiceShow/index.spec.tsx`, `src/pages/NotFound.tsx`, `src/pages/RouteError.tsx`.
- Changed files: `src/App.tsx` (route table and layout route), `src/main.tsx` (retry rule), `src/api/queryKeys.ts` (detail key), `src/model/pageParam.ts` (reuses the positive integer parser), `src/pages/InvoiceShow/*`, `src/specs/testUtils.tsx` (renders the route table), `src/App.spec.tsx`, `NOTES.md`, `README.md` if the structure section changes.
- Removed: `src/data/index.ts`.
