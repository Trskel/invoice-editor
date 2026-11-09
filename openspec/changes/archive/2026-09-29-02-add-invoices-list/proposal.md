# Proposal: invoices list

## Why

The home page is the entry point of the application, but it shows three hardcoded invoices and discards the API response it requests. Users cannot see their real invoices, rows can only be opened with a mouse, and the header link back to the list has no visible label or accessible name.

## What Changes

- The list shows the invoices of the API, one page at a time, with the page number in the URL (`?page=2`) so a page can be shared, refreshed and reached with the browser's back button.
- Columns: invoice number, customer, date, deadline, status (draft, finalized, paid) and total. Address and tax move out of the list; they belong to the detail page.
- The total is derived from the invoice lines with decimal arithmetic, so invoices without a stored total (the seed data) show a correct amount.
- Loading, empty, error (with retry) and page-out-of-range states.
- Each row has a real link to the invoice detail page, usable from the keyboard; the non-accessible clickable row (`role="button"` without keyboard support) is removed. "Create invoice" becomes a link as well.
- The header shows an "Invoice Editor" wordmark linking to the list, replacing the empty placeholder box.
- Test infrastructure: the starter test (which passed because of hardcoded data) is replaced by tests against mocked API responses; the mock helper gains error responses and request inspection.

## Capabilities

### New Capabilities

- `invoices-list`: browsing invoices page by page and opening one.
- `invoice-amounts`: how invoice totals are derived and how amounts are displayed.
- `app-shell`: the layout around every page (header and home link).

### Modified Capabilities

- None.

## Non-goals

- No filters or sorting (planned in a later change).
- No actions on rows (finalize, delete, mark as paid); planned in a later change.
- No tax amount in the list and no tax derivation yet: the detail page change introduces it, together with the fix for the seed data's tax values (see design.md, Decision 5).
- No page size selector: a fixed page size of 10.
- No removal of the hardcoded data in `src/data`: the detail page still uses it until its own change.
- No move to a feature-folder layout; the existing `src/pages`, `src/hooks`, `src/helpers` layout is kept (see design.md, Decision 8).

## Impact

- No new dependency (`big.js` and TanStack Query are already installed).
- New files: `src/hooks/useInvoices.ts`, `src/api/queryKeys.ts`, `src/model/invoiceTotal.ts`, `src/model/invoiceStatus.ts`, `src/model/pageParam.ts`, their unit tests, `src/ui/StatusTag.tsx`, `src/ui/ButtonLink.tsx`, `src/specs/fixtures/invoices.ts`, `src/specs/normalizeSpaces.ts`, `src/App.spec.tsx`.
- Changed files: `src/pages/InvoicesList/*`, `src/App.tsx`, `src/main.tsx` (query defaults), `src/helpers/formatAmount.ts` (takes a decimal string), `src/pages/InvoiceShow/structure.tsx` (call sites only), `src/pages/InvoiceShow/index.tsx` (row key on the lines table, so tests that open that page print no React warning), `src/specs/mocks/server.ts`, `src/specs/testUtils.tsx`, `index.html` (placeholder style removed), `NOTES.md`, `README.md`, `CLAUDE.md`.
