# Proposal: filter the invoices list by status and customer

## Why

The list shows every invoice in id order, 10 per page. To find the drafts still to finalize, the finalized invoices not paid yet, or the invoices of one customer, the user has to page through all of them and read each row.

The API can filter on the server, across all pages: `filter` is a JSON array of conditions, ANDed, on the invoice's own fields (`finalized`, `paid`, `customer_id`). It also ignores silently what it does not understand (an unknown field or operator returns the full list), so a wrong query would look like a filter that does not work. The client has to build the query from a small, tested set of values.

A customer is found by name, but the invoice filter only matches exact names. The customer search that the invoice form already uses matches part of a first or last name, so the filter picks a customer through the same search and filters by its id.

## What Changes

- A "Status" control above the table offers "All", "Draft", "Finalized" and "Paid", the same labels as the status column. Choosing one shows only the invoices with that status.
- A "Customer" picker next to it searches customers by name, like the one in the invoice form. Choosing a customer shows only that customer's invoices; clearing it shows all customers again. Both filters combine.
- The filters are kept in the URL (`/?status=draft&customer=20&page=2`), like the page: a refresh, a shared link or the browser history show the same list. Defaults have no parameter, and a value the app does not know is ignored. A customer opened from the URL shows its name in the picker.
- Changing a filter goes back to page 1. Changing the page, the "Go to the first page" link and the previous-page rule after a deletion keep the filters.
- When no invoice matches the filters, the list says so and offers to clear them, instead of "No invoices yet".

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `invoices-list`: adds the status and customer filters, synced to the URL, and changes the empty state so it tells an empty filter from an empty invoice list.

## Non-goals

- No column sort: the API supports it on number, date and deadline, but it is moved to `NOTES.md` so the customer filter fits the timebox.
- No date range filter: left for `NOTES.md` with the timebox as the reason.
- No filter on several statuses or several customers at once, no free text search over the whole invoice.
- No search by full name ("Vincent Upton"): the customer search matches one word of the first or last name. It is the existing behavior of the form's picker, left unchanged.
- No page size choice.

## Impact

- No new dependency.
- New files: `src/model/listQuery.ts` (reading the filters and page from the URL, writing them back, and building the API filter, with unit tests); it replaces `src/model/pageParam.ts`, whose page rules move into it. `src/hooks/useFilterCustomer.ts` (the name of a customer known only by its id).
- Changed files: `src/hooks/useInvoices.ts` and `src/api/queryKeys.ts` (the filters are part of the request and of the cache key), `src/ui/CustomerAutoComplete/CustomerAutoComplete.tsx` and `src/ui/InfiniteScrollSelect.tsx` (optional clear button and a label for a value known by id), `src/pages/InvoicesList/index.tsx` (filter controls, empty state, search kept on page changes), the list tests, `src/specs/mocks` if a helper is missing, `NOTES.md`, and `README.md` and `CLAUDE.md` if the structure sections change.
