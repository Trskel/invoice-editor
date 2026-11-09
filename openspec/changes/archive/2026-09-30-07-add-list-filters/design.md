# Design: filter the invoices list by status and customer

## Context

See proposal.md for motivation. Facts about the API and the code that shape this change:

- `GET /invoices` takes `filter`, a URL-encoded JSON array of `{ field, operator, value }` conditions, all ANDed. The generated client types it as a string: `api.getInvoices({ page, per_page, filter })`.
- The API ignores what it does not understand: an unknown field, an unknown operator (`gte` instead of `gteq`) or invalid JSON in `filter` returns `200` with the unfiltered list. A mistake in the query cannot be told from a filter that matches everything.
- Checked on the live API 2026-09-30 (read-only requests, 21 invoices, 300 customers):
  - `finalized eq false` returns the 14 drafts; `finalized eq true` + `paid eq false` the 5 finalized unpaid invoices; `finalized eq true` + `paid eq true` the 2 paid ones. `paid eq true` alone would also return a paid draft (none today, the API allows them), which the app shows as "Draft".
  - `customer_id eq 157` returns that customer's 4 invoices; with `finalized eq false` added, its 1 draft. An unknown id (`999999`) returns `total_entries: 0`.
  - `customer.last_name eq "Upton"` and `customer.first_name eq "Vincent"` also filter, but only on the exact, case-sensitive name: `"upton"` finds nothing, and the partial operators (`like`, `ilike`, `cont`, `start`, `matches`) are ignored.
  - `GET /customers/search?query=` matches part of one first or last name, case-insensitive (`vinc` finds Vincent Upton and Vincenzo Smitham), and not a full name (`Vincent Upton` finds nothing) or an id.
  - There is no `GET /customers/{id}`. Every invoice embeds its `customer`, so `GET /invoices` with `customer_id eq <id>` and `per_page=1` gives the customer's name when the customer has at least one invoice.
  - Filter and pagination combine: `finalized eq false`, `page=2`, `per_page=5` returns drafts 6 to 10 with `total_entries: 14`.
- The list page reads the page from the URL with `parsePage` and writes it with `pageSearch` (`src/model/pageParam.ts`); only the list uses them. `useInvoices({ page, perPage })` uses `invoiceKeys.list(params)` and `keepPreviousData`.
- `CustomerAutoComplete` (the form's customer field) takes `value: Customer | null` and `onChange`, and searches through `useGetCustomers` (cache key `['customers', search]`) with a debounce. It renders `InfiniteScrollSelect`, an antd `Select` that shows "No results" or "Search failed" and takes the field props (`aria-label` among them). It has no clear button.
- The status labels come from `invoiceStatus` (`draft`, `finalized`, `paid`) and `StatusTag`. antd `Radio.Group` renders `role="radiogroup"` and passes `aria-*` props.

## Goals / Non-Goals

**Goals:**

- The URL alone determines the list: status, customer and page.
- The API filter is built from a closed set of values in one pure module, with the exact query strings pinned by unit tests.
- The customer is found the way the form finds it: one picker, one search.

**Non-Goals:**

- Column sort, date range, several statuses or customers, full-name search (see proposal).

## Decisions

### 1. One pure module for the list query: `src/model/listQuery.ts`

- `ListQuery = { page: number; status?: InvoiceStatus; customerId?: number }`.
- `parseListQuery(params: URLSearchParams): ListQuery`: the page with the rule `parsePage` has today; a `status` in the list or none; a `customer` read with `parsePositiveInteger` or none.
- `listSearch(query: ListQuery): string`: the search string, parameters in a fixed order `status`, `customer`, `page`, defaults left out (`''` for the unfiltered first page), so one list has one URL.
- `hasFilter(query)`: a status or a customer is set.
- `toApiFilter(query: ListQuery): string | undefined` (Decision 2); `undefined` when no filter is set, so the parameter is not sent.
- `src/model/pageParam.ts` and its tests are folded into it: its two functions would otherwise be a second place that knows the URL format.
- Pure and unit tested: every status, customer ids valid and invalid, the parameter order, the exact `filter` JSON sent.
- Alternative considered: keeping each parameter in its own `useSearchParams` call in the page. Rejected: the page-1 rule and "keep the others" would be repeated at each writer (status control, customer picker, pagination, first-page link, deletion, clear button).

### 2. Filters to the API `filter`

| Query                  | Conditions sent, in this order                     |
| ---------------------- | -------------------------------------------------- |
| no status, no customer | `filter` not sent                                  |
| status `draft`         | `finalized eq false`                               |
| status `finalized`     | `finalized eq true`, `paid eq false`               |
| status `paid`          | `finalized eq true`, `paid eq true`                |
| customer `<id>`        | `customer_id eq <id>`, after the status conditions |

- Each condition is `{"field":...,"operator":"eq","value":...}`; the array is `JSON.stringify`-ed and the client URL-encodes it. Only `eq` is used, one of the operators checked on the live API.
- The options are the three statuses the list shows, so a row never appears under a label other than its tag. The issue's "unpaid" is the "Finalized" status: finalized and not paid. Payment only applies to a finalized invoice, so "Paid" includes the `finalized` condition, and a paid draft is listed under "Draft" as its tag says.
- The customer filters by id, not by name: the picker gives an exact customer, and two customers can share a name.
- Alternative considered: four status options "Draft", "Finalized", "Unpaid", "Paid", with "Finalized" meaning finalized whether paid or not. Rejected: "Finalized" would then list rows tagged "Paid", and "Unpaid" would list the rows tagged "Finalized".
- Alternative considered: a text box sending `customer.last_name eq <text>`. Rejected: exact and case-sensitive, so typing part of a name would show nothing, and a typo cannot be told from a customer without invoices.

### 3. Status control

- An antd `Radio.Group` with `optionType="button"`, options "All", "Draft", "Finalized", "Paid", `aria-label="Status"`, in the toolbar next to "Create invoice". Arrow keys move between the options, as in any radio group.
- Its value comes from the URL. On change it writes `listSearch({ page: 1, status, customerId })`.
- Alternative considered: an antd `Select`. Rejected: four short options fit on screen, and a select hides them behind a click.
- Alternative considered: antd `Segmented`. Rejected: it looks the same, and `Radio.Group` is a plain radio group whose name and roles are known.

### 4. Customer picker: the form's `CustomerAutoComplete`

- The list uses `CustomerAutoComplete` with `aria-label="Customer"`, a placeholder "Filter by customer" and a fixed width, next to the status control. Same search hook, debounce, "No results" and "Search failed" as the form.
- Two optional props are added and passed down to `InfiniteScrollSelect` and the antd `Select`:
  - `allowClear`: antd's clear icon, which calls `onChange(null)` (the `Select` calls its `onChange` with `undefined`, turned into `null` by `InfiniteScrollSelect`). The form does not pass it, so the form is unchanged. The icon is mouse-only: in `@rc-component/select` it is a plain element with an `onMouseDown` handler, not focusable and without a role, and Backspace clears a value only in multiple mode. Keyboard users clear with "Clear filters" (Decision 7).
  - `valueLabel`: the label shown for the selected value, used when the page knows only the id (Decision 5). Without it, the label is the customer's name, as today.
- On change: `listSearch({ page: 1, status, customerId: customer?.id })`.
- The picker resets its search text when a customer is chosen or cleared. antd empties its own input on a single selection but does not call `onSearch`, so without this the next open would search the previous text again and list only that customer (found when clearing a filter). The reset lives in the shared component, so the form gets it too.
- Alternative considered: a new picker for the list. Rejected: a second copy of the search and its states for the same job.

### 5. The name of a customer known by id: `useFilterCustomer(id)`

- The URL holds the id only. The picker needs a name, and the API has no customer-by-id endpoint (Context).
- `src/hooks/useFilterCustomer.ts`: a query under `['filterCustomer', id]`, enabled when an id is set, that requests `GET /invoices` with `customer_id eq <id>` and `per_page=1` and returns `invoices[0]?.customer ?? null`. It does not depend on the status or the page, so it finds the name even when the combination shows nothing.
- When the user picks a customer, the page writes it into that cache entry (`setQueryData`) before changing the URL, so no request is made for a name it already has. The query sets `staleTime: Infinity`: with the default `staleTime` of 0 the seeded entry would count as stale and the observer would still refetch on mount, so the request would not be saved (finding while implementing).
- The picker gets the customer as `value` when known. Otherwise (loading, failed, or no invoice for that customer) it gets a stand-in value with the id and `valueLabel="Customer #<id>"`. A failure here only affects the label, so it shows no error.
- Alternative considered: the name in the URL (`?customer=20&customerName=...`). Rejected: two parameters to keep in agreement, and an edited URL could show one name and filter on another customer.
- Alternative considered: the name from the rows of the current page. Rejected: a status and customer combination with no invoice, or a page past the end, has no rows to take it from.

### 6. Request and cache key

- `useInvoices(query: ListQuery, perPage)` sends `page`, `per_page` and `filter` when `toApiFilter` gives one.
- `invoiceKeys.list(params)` takes `{ page, perPage, status, customerId }`, so every combination has its own cache entry. The lifecycle hooks invalidate and update `invoiceKeys.lists()`, the prefix, so they keep working on filtered lists unchanged.
- `keepPreviousData` stays: while a new filter loads, the current rows stay visible under the table's loading indicator, as for a page change.

### 7. "Clear filters" and the empty states

- While `hasFilter(query)`, the toolbar shows a "Clear filters" button after the two controls. It writes `''` (the unfiltered first page). A real `Button`, so Tab reaches it and Enter or Space activates it: the keyboard way to remove the customer, since antd's clear icon is mouse-only (Decision 4). It also clears the status, which the radio group can already do; one button for both keeps the toolbar small.
- With `total_entries === 0` and no filter: "No invoices yet", as today.
- With `total_entries === 0` and a filter: an `Empty` with "No invoices match these filters" and no button of its own; "Clear filters" is right above it. Two buttons with the same name on one page would be ambiguous for screen reader users and for tests.
- Alternative considered: a "Clear customer" button next to the picker only. Rejected: one more control for the same result, and the status has its "All" option already.
- Alternative considered: a "Clear filters" button in the empty state only (the first version of this design). Rejected: keyboard users could not remove a customer from a list that is not empty.
- "This page does not exist" keeps its link, now to `listSearch({ page: 1, status, customerId })`.
- The filter controls are shown in every state except the first load (no data yet), so the user can leave an empty filter or a failed request with another choice.

### 8. Deletion and actions on a filtered list

- The previous-page rule after deleting the only row of a page writes `listSearch({ ...query, page: page - 1 })`.
- A lifecycle action can take a row out of the status filter (marking as paid under "Finalized", finalizing under "Draft"). The row shows its new status (at once for the paid toggle), then disappears when the list is refetched. If that empties a page past the first, the list shows "This page does not exist" with its link. Only deletion gets the previous-page rule, as in the `invoice-lifecycle` change: an action that changes a status does not change the page.
- The existing list test "shows the previous page after deleting the last row of page 2" keeps answering page 2 with its row after the deletion, which the real API does not do. The new test for a filtered page answers page 2 with no invoices once the `DELETE` arrived, and the existing test is changed the same way.

### 9. Tests

- Unit (`src/model/listQuery.spec.ts`): parsing (each valid value, unknown values, invalid page and customer), `listSearch` (defaults, order, each combination used in the spec), `hasFilter`, `toApiFilter` (the rows of the Decision 2 table, compared as exact strings).
- Page (`src/pages/InvoicesList/index.spec.tsx`): one test per scenario. The `getInvoices` mock captures the query parameters, so each test asserts the exact `filter` sent; the customer search is mocked as in the form tests. The name lookup (Decision 5) is told apart from the list request by its `per_page=1`.
- The form tests for the customer field pass unchanged (the new props are optional).
- The pointer clear is tested by clicking antd's clear icon (it has no role or name, so it is found by its `ant-select-clear` class, and clicked with `pointerEventsCheck: 0` as the PR 5 tests do for the date picker's clear button); the keyboard clear by `user.tab()` to "Clear filters" and `user.keyboard('{Enter}')`.
- The button-style `Radio.Group` puts `pointer-events: none` on the radio input (antd style), so the tests click the wrapping label (the part a user clicks) and keep asserting `toBeChecked()` on the radio (finding while implementing).
- The list renders the customer picker, which searches on mount with an empty query, as the form does; every list test mocks that search in `beforeEach` and the tests that need results override it.
- A regression test covers the picker search reset: after choosing a customer and clearing the filter, opening the picker offers every customer again (Decision 4).

## Risks / Trade-offs

- [The API ignores a wrong query] -> Only constant conditions with `eq` are sent, pinned by unit tests; the preview check (task 5.1) compares the counts on the live API with the Context figures.
- [One extra request for the name when a customer is opened from the URL] -> Small (`per_page=1`), cached, and skipped when the customer was picked in the page.
- [A customer without invoices shows "Customer #<id>"] -> Accepted: the list is empty anyway, and "Clear filters" is offered.
- [A row leaves a filter after an action and the page may become empty] -> Accepted (Decision 8); the out-of-range message has a link back.
- [Timebox] -> Planned at 2 hours for the status filter; the customer filter adds about 1 to 1.5 hours and replaces the column sort. If it runs over, the customer name lookup (Decision 5) is simplified to "Customer #<id>" first; the status filter and the URL rules stay.

## Migration Plan

- None: no stored data, no API change. Existing links (`/`, `/?page=2`) show the same list as before.

## Open Questions

- None.
