# Design: invoices list

## Context

See proposal.md for motivation. Facts about the API and the starter code that shape this change:

- `GET /invoices` takes `page` and `per_page` and returns `invoices` plus `pagination` (`page`, `page_size`, `total_pages`, `total_entries`). Each invoice embeds its `customer` and its `invoice_lines`, so one request fills the list.
- A page past the end returns `200` with an empty `invoices` array and the real `total_pages`. `page=0` is treated as page 1.
- The first request after a period of inactivity takes 3 to 6 seconds (the API host wakes up); later requests take under half a second.
- The seeded invoices have `total: null` and `tax: null`. Invoices written through the API get both computed by the server: `total` is the sum of the line prices (tax included).
- The starter list page renders `src/data` and ignores the API response; its only test passes because of that hardcoded data. Rows are clickable `div`s with `role="button"` and no keyboard handling.
- `formatAmount` takes a JavaScript `number`, so every call site converts the API's decimal strings to floating point first.

## Goals / Non-Goals

**Goals:**

- The URL alone decides what the list shows; server data lives only in the query cache.
- Every state of the request (loading, error, empty, out of range, success, next page loading) is visible and tested.
- Money never passes through a floating-point number, from API string to screen.

**Non-Goals:**

- Filters, sorting, row actions, tax (later changes).
- A generic data-table abstraction: one page uses one table.

## Decisions

### 1. One query hook per resource, with a key factory

- `src/api/queryKeys.ts` exports `invoiceKeys`: `all = ['invoices']`, `lists() = [...all, 'list']`, `list({ page, perPage }) = [...lists(), { page, perPage }]`. Later mutations invalidate `invoiceKeys.all` or `invoiceKeys.lists()` without knowing the exact parameters of each cached page.
- `src/hooks/useInvoices.ts`: `useInvoices({ page, perPage })` calls `api.getInvoices({ page, per_page: perPage })` through `useQuery` and returns the query result. The page passes its page size in, so `src/hooks` does not import from `src/pages`, and the page size is part of the cache key. It passes `placeholderData: keepPreviousData`, so while page 2 loads the table keeps page 1's rows and `isPlaceholderData` drives a loading indicator on top of them, instead of an empty table flashing between pages.
- The page component never calls the API client directly and never copies the response into component state.
- Alternative considered: keep the starter's `useEffect` plus `useState`. Rejected: it re-implements caching, request deduplication, retries and the race where a slow page 1 response overwrites page 2.

### 2. Query client defaults

- `staleTime: 30_000`: navigating back to the list within 30 seconds shows the cached page without a new request; after that the cached page is shown immediately and refreshed in the background.
- `retry: 1` (library default is 3 with exponential backoff, which delays the error state by about 7 seconds). One retry covers a transient network failure; the slow first request after inactivity is not a failure and needs no retry.
- No request timeout: a request timeout under the wake-up delay would turn a slow response into an error.
- Tests keep `retry: false` (existing test utility) so error scenarios fail fast.

### 3. Page number in the URL

- `src/model/pageParam.ts` (pure): `parsePage(value: string | null): number` returns the value when it is a positive integer written in decimal digits, otherwise 1. `pageSearch(page: number)` returns the query string, empty for page 1 so that `/` and `/?page=1` do not become two history entries for the same page.
- The page reads it with `useSearchParams`; changing page calls `setSearchParams`, which pushes a history entry, so the browser's back button returns to the previous page.
- Alternative considered: page in component state. Rejected: lost on refresh, not shareable, back button leaves the list.

### 4. Out-of-range page: message, not redirect

- When the response has no invoices and the requested page is greater than 1, the page shows "This page does not exist" with a link to the first page. When `total_entries` is 0, it shows the empty state.
- Alternative considered: redirect to the last page automatically. Rejected for now: it hides a stale link from the user and needs a second request; a later change that deletes invoices can revisit it (deleting the last invoice of the last page lands here).

### 5. Totals derived from line prices, big.js, strings in and out

- `src/model/invoiceTotal.ts` (pure): `invoiceTotal(lines): string` sums `line.price` with `big.js` and returns a decimal string. It always derives, even when the invoice has a stored total: one code path, and it matches the server's own formula for invoices written through the API.
- `formatAmount(value: string)` passes the decimal string to `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`, which formats numeric strings exactly (ECMAScript Intl.NumberFormat v3, supported by every browser in the build targets and by Node 24). The detail page call sites are updated to pass the strings they already have.
- Tax is not shown in the list. The seeded lines store a tax computed as if prices excluded tax (`price × rate`), which the server itself does not do for new invoices (it extracts the tax from the tax-inclusive price). Deriving tax correctly belongs with the detail page, which shows it; the inconsistency is recorded in `NOTES.md` here.
- French formatting uses a narrow no-break space as thousands separator and a no-break space before the euro sign; tests normalize both to plain spaces before comparing.
- Alternative considered: `Number(total).toFixed(2)`. Rejected: binary floats cannot represent most cent values, and large amounts lose cents (spec scenario "Large amount keeps its cents").

### 6. Status as a pure function

- `src/model/invoiceStatus.ts`: `invoiceStatus(invoice): 'draft' | 'finalized' | 'paid'`, rendered as a colored tag in a `StatusTag` component (`src/ui/StatusTag.tsx`), reused by the detail page later.
- A draft flagged as paid (the API accepts it) shows "Draft": payment only means something for a finalized invoice.

### 7. Links instead of clickable rows

- The invoice number cell renders a router `Link` to `/invoices/:id` with the text `#<id>`. Native link behavior gives keyboard focus, Enter, middle-click, Ctrl-click and Cmd-click, and "copy link address" with no custom code; the starter's `onRow` handler, `role="button"` and `window.open` logic are removed.
- "Create invoice" becomes a link styled as a primary button, for the same reasons. A `<Link>` wrapping an antd `Button` would put a button inside a link (invalid HTML, two focus stops), so `src/ui/ButtonLink.tsx` renders the antd button as an `<a>` (`href`) and uses the router's `useLinkClickHandler`, which navigates in the app on a plain click and leaves modifier clicks to the browser, like `Link`.
- Alternative considered: keep the whole row clickable in addition to the link. Rejected: two ways to do the same thing, a click handler that must ignore clicks on the link inside it, and rows that look like buttons to assistive technology.

### 8. File layout

- Keep the starter layout: `src/pages/InvoicesList/index.tsx` composes the states, `structure.tsx` defines the columns, hooks in `src/hooks`, pure logic in a new `src/model` folder (as in the architecture rules in `openspec/config.yaml`).
- Alternative considered: feature folders (`src/features/invoices/...`). Rejected for this change: moving every starter file adds a large, behavior-free diff to a feature pull request.

### 9. Test infrastructure

- `mockEndpoint` gains an optional `status` (to answer with errors), an optional `delay` (`'infinite'` keeps a request pending, to observe loading states deterministically), accepts a function of the request as `response`, and returns the list of received requests, so a test can assert the `page` and `per_page` query parameters. Query parameters are matched in the test assertions or in the response function, not in the mock URL (the mock library ignores query strings when matching). The response function is needed when one test loads two pages and the first is refetched in the background (going back to page 1).
- `src/specs/fixtures/invoices.ts`: `buildInvoice(overrides)` and `buildInvoicesPage(invoices, pagination)` so each test states only the fields it cares about.
- `App.tsx` exports `AppLayout` (header and route table, everything inside the router). The test utility `renderApp(url)` mounts it in a memory router at `url` and returns the router, whose location and history (`navigate(-1)` for the back button) the tests observe.
- Unit tests for the three `src/model` functions and `formatAmount`; page tests for every scenario of `invoices-list` and `app-shell`. The "Open in a new tab" scenario is verified manually on the preview deployment (it is browser behavior, not application code).

### 10. Header wordmark

- The empty `.demo-logo` box and its CSS in `index.html` are replaced by the text "Invoice Editor" inside the header link, styled with the antd typography in white. Visible text is also the accessible name, so no `aria-label` is needed.

## Risks / Trade-offs

- [The first load after inactivity takes several seconds] → the loading state is shown immediately; no timeout turns it into an error.
- [Deriving the total ignores the stored value] → if the server ever computed totals differently (discounts, rounding), the list would disagree with it. Today both are the same sum; the risk is noted with the tax inconsistency in `NOTES.md`.
- [`keepPreviousData` shows page 1 rows while the URL already says page 2] → mitigated by the loading indicator over the table; the pagination control also shows page 2 as current.

## Migration Plan

- No data or API change. Deployed with `yarn deploy:preview`, checked, then `yarn deploy` after merge.

## Open Questions

- None.
