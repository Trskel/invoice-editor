# Design: invoice detail

## Context

See proposal.md for motivation. Facts about the API and the code that shape this change:

- `GET /invoices/{id}` returns the full invoice with its `customer` and its `invoice_lines` (each with its `product`). An unknown or non-numeric id returns `404` with an empty body.
- Line prices are tax-inclusive. On writes the server computes `line.tax = round2(price - price / (1 + rate / 100))` and `invoice.tax = sum(line.tax)`. The seeded lines store `price × rate / 100` instead, and seeded invoices have `total` and `tax` null (recorded in `NOTES.md` by the list change).
- The starter detail page reads `src/data` and falls back to the first hardcoded invoice for any unknown id. It is the last user of `src/data`.
- The app uses `<BrowserRouter>` with `<Routes>`. Route-level error handling (`ErrorBoundary` on a route) only exists in the router's data mode (`createBrowserRouter`). Tests already mount the app with `createMemoryRouter`, the data-mode router for tests.
- The query client retries a failed query once (`retry: 1`), whatever the error.

## Goals / Non-Goals

**Goals:**

- The id in the URL alone decides what the page shows; server data lives only in the query cache.
- Every state of the request (loading, not found, error, success) is visible and tested.
- VAT and totals match the server's formula, for seeded invoices too, without floating-point numbers.
- No blank screen: unknown URLs and unexpected errors show a way back.

**Non-Goals:**

- Invoice actions (finalize, delete, mark as paid) and the edit form (later changes).
- A generic error-message mapping for API errors (the create and edit changes need it; they introduce it).

## Decisions

### 1. `useInvoice(id)` and a detail key

- `invoiceKeys.detail(id) = [...invoiceKeys.all, 'detail', id]`. Invalidating `invoiceKeys.all` after a later mutation refreshes lists and details together; `invoiceKeys.lists()` still targets lists only.
- `src/hooks/useInvoice.ts`: `useInvoice(id: number)` calls `api.getInvoice({ id })` through `useQuery` and returns the query result, like `useInvoices`.

### 2. Invalid ids never reach the hook

- `src/model/positiveInteger.ts` (pure): `parsePositiveInteger(value: string | null | undefined): number | null` returns the value when it is written in decimal digits only and is a safe integer of at least 1, and `null` otherwise. This is the rule `parsePage` already applied; `parsePage` becomes `parsePositiveInteger(value) ?? 1`, so page and id follow one rule. Leading zeros stay accepted (`/invoices/0100389` opens invoice 100389), as `?page=02` already did.
- `InvoiceShow` parses `useParams().id`. When it is `null` it renders the not-found state; otherwise it renders an inner `InvoiceDetails` component with a numeric `id` prop, which calls `useInvoice(id)`. Splitting the component keeps hooks unconditional (a hook cannot be called inside an `if`) without an `enabled` flag or a non-null assertion.
- Alternative considered: `useInvoice(id | null)` with `enabled: id !== null`. Rejected: the page would then need a fourth state ("disabled", `isPending` forever) and every consumer would repeat the `null` check.

### 3. No placeholder from the list cache

- The list response already contains every field the detail page shows, so the detail query could start from the cached list row (`placeholderData`) and open instantly.
- Rejected for now: it couples the detail cache to the list's page structure (search every cached page for the id), and the gain is one fast request after the API is awake. Revisit if the detail page feels slow in use; it is a local change to `useInvoice`.

### 4. Not found versus other errors, and the retry rule

- `src/api/errors.ts`: `httpStatus(error: unknown): number | undefined` reads the status of a failed API call (the client throws the HTTP library's error, which carries the response). `isNotFound(error)` is `httpStatus(error) === 404`.
- The page shows "Invoice not found" (with a link to the list, no retry) for a 404, and the generic error state with "Retry" for anything else.
- `shouldRetry(failureCount, error)` in the same file: retry when `failureCount < 1` and the status is not 4xx. It replaces `retry: 1` in `src/main.tsx`, for every query. A 4xx answer is the same on a second try, and retrying a 404 would delay "Invoice not found" by a second request. Unit tested directly, because the test query client disables retries so that error scenarios fail fast.

### 5. VAT derived with the server's formula

- `src/model/invoiceTax.ts` (pure): `lineTax(line): string` computes `price - price / (1 + rate / 100)` with `big.js` and rounds to 2 decimals half up (`Big.roundHalfUp`). `invoiceTax(lines): string` sums the rounded line taxes, like the server. `invoiceTotal` (list change) is reused for the total; the total excluding VAT is `total - tax`, so the three figures always add up.
- Stored `tax` values are ignored, like stored totals: one code path for seeded and new invoices.
- The half-up rule matches the server on every line checked; a half-cent case was not observed. If the server rounds half-cents differently, one line in a rare case differs by one cent. Listed under Risks.

### 6. Page layout

- A "Back to invoices" link (`Link` to `/`, plain text: `@ant-design/icons` is not a direct dependency and an arrow character would change the accessible name) above the header row, shown with the invoice; the not-found and error screens have their own link to the same place. A link and not a button: it is navigation, so it keeps Ctrl-click and middle-click.
- Header row: title "Invoice #<id>", `StatusTag`, and the "Edit" link (drafts only) as a `ButtonLink`, like "Create invoice" in the list. The two starter tags (paid/unpaid, draft/finalized), which could read "Draft" and "Paid" together, are replaced by the single status.
- `Descriptions` block: date, deadline, customer name, address (`getCustomerAddress`, with the country appended; empty parts are left out, and an address with nothing left is shown as a dash).
- Lines table columns: item (`line.label`), quantity, unit, unit price (`product.unit_price`), VAT rate (`line.vat_rate` formatted like the amounts, `5,5 %`), amount (`line.price`). The amount is the stored line price, the same value the total sums; the starter recomputed it as `unit_price × quantity`, which disagrees with the total if the product price changed after the invoice was written.
- Totals block under the table, aligned right: total excluding VAT, VAT, total including VAT.
- `justify="between"` (not a valid value, ignored by the layout) disappears with the rewrite; the header row uses `justify="space-between"`.

### 7. Router in data mode, with a layout route

- `App.tsx` exports `routes`: one layout route (`AppLayout`, header and an `<Outlet />`) whose child is a pathless route with `ErrorBoundary: RouteError`, itself parent of the four pages and a catch-all `*` route rendering `NotFound`. `App` renders `createBrowserRouter(routes)` through `RouterProvider`. The boundary sits below the layout, so the header stays visible on the error screen.
- `RouteError` shows "Something went wrong" with a link to the list. The router resets the boundary on the next navigation, so following the link recovers without a reload.
- Test utility: `renderApp(url)` builds `createMemoryRouter(routes, { initialEntries: [url] })`, so tests exercise the real route table, including the catch-all and the boundary.
- This is also the router the edit change needs for an unsaved-changes guard (`useBlocker` exists only in data mode); doing it here avoids a second router change.
- Alternative considered: a hand-written error boundary component around `<Routes>`. Rejected: React only offers error boundaries as class components, it would need its own reset-on-navigation logic, and the router provides both once in data mode.

### 8. Tests

- Unit: `parsePositiveInteger`, `lineTax`, `invoiceTax`, `httpStatus`, `isNotFound`, `shouldRetry`.
- Page (`src/pages/InvoiceShow/index.spec.tsx`): every `invoice-detail` scenario except the retry rule, with `mockEndpoint` on `getInvoice` (`status: 404`, `status: 500`, `delay: 'infinite'`, received requests for the "no request" case).
- App (`src/App.spec.tsx`): "Unknown URL" and the error screen. The error scenario uses an invoice response without `invoice_lines`; the test silences the error the boundary reports to the console, so the output stays clean.
- The "Totals of a seeded invoice" scenario uses the real seeded line values (105340.0 at 20 %, stored tax 21068.0).

### 9. Remove `src/data`

- The detail page was its last import. Deleting it removes the fallback to a hardcoded invoice and the risk of tests passing against fake data.

## Risks / Trade-offs

- [Half-cent rounding might differ from the server's] → affects one cent on rare lines; the rule is in one function with unit tests, easy to change once observed.
- [Deriving VAT ignores stored values] → if the server's formula changes, the page disagrees with it; same trade-off as totals, recorded in `NOTES.md`.
- [Router migration touches every route] → the route table and all page tests run through it; the list, detail and header tests cover each route.
- [No retry on 4xx] → a 408 or 429 (timeout, rate limit) would not be retried. The API was not seen returning either; the rule can add them if needed.

## Migration Plan

- No data or API change. Deployed with `yarn deploy:preview`, checked (deep link to an invoice, unknown invoice, unknown URL, refresh), then `yarn deploy` after merge.

## Open Questions

- None.
