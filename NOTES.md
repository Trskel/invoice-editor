# Notes

Improvements, trade-offs and known limitations, kept as a running list while the app is built. For each: what led to it, why it matters, and what is missing to do it.

## Technical

### The API token is visible in the deployed bundle

- **What led to it:** Vite inlines `VITE_*` variables at build time, and the browser calls the API directly with the `X-SESSION` header.
- **Why it matters:** anyone who opens the deployed app can read the token from the JavaScript bundle and use the API with it.
- **What is missing:** a backend (or an edge function) that holds the credential and authenticates users, with the browser talking only to it. Out of scope for a browser-only prototype on a shared test API.

### No browser-level end-to-end tests

- **What led to it:** the page tests run in jsdom with the network mocked by MSW, which is enough for most behavior but not all of it: the antd calendar and dropdowns differ in a real browser (the button-style radio input ignores pointer events, a virtual list has no height), and deep links depend on the host's single-page-app fallback. These were checked by hand on the preview and production instead.
- **Why it matters:** a change to routing, the deployment fallback or a third-party component can pass every test and still break in a browser.
- **What is missing:** a Playwright or Cypress smoke run against the deployed app (open the list, follow a deep link, create and delete a draft), in CI. Not added here to keep the manual pass and no new dependency.

### No error monitoring

- **What led to it:** a failed request or a failed action is shown to the user and then forgotten: there is no place where errors are collected.
- **Why it matters:** a user can hit an error that nobody else ever learns about; there is no way to see how often a request or an action fails.
- **What is missing:** a reporting tool (Sentry or similar) and an error boundary that reports, plus the consent and privacy work that goes with sending data to a third party.

### No accessibility lint

- **What led to it:** `eslint-plugin-jsx-a11y`, the usual accessibility lint for React, does not support ESLint 10, and it only inspects plain HTML elements, not the antd components most pages use.
- **Why it matters:** static checks catch missing labels or non-interactive click targets early.
- **What is missing:** a plugin release that supports ESLint 10. Meanwhile, tests query elements by role and accessible name, and the release pass ran the browser's accessibility audit (axe-core and Lighthouse, no violation left) plus a manual keyboard and screen reader check. The audit found contrast failures in the default theme; they are fixed with the overrides in `src/theme.ts`, rather than by a lint rule.

### Deployments are manual

- **What led to it:** deploying from the CLI keeps the project free of deploy integrations and repository secrets.
- **Why it matters:** a merge to `main` does not update the live app until someone runs `yarn deploy`, so the two can drift.
- **What is missing:** permission to store a Cloudflare API token as a repository secret; with it and Actions enabled (see below), a workflow could deploy previews for pull requests and production on merge.

### No CI: checks run locally and are posted on the pull request

- **What led to it:** CI is not configured for this project, so checks run locally instead. `yarn verify:pr` runs `yarn verify` on the pushed head and posts the output as a pull request comment.
- **Why it matters:** the result comes from the author's machine, not from a clean runner, so a reviewer relies on the recorded commit and versions, and nothing blocks a merge when a check fails.
- **What is missing:** CI enabled for the repository. Then a workflow running the same five checks on pull requests and `main` (a checkout, `setup-node` with `.tool-versions`, `yarn install --frozen-lockfile`, one step per check), with branch protection requiring it.

### Hosting on classic Cloudflare Pages

- **What led to it:** Cloudflare is merging Pages into Workers; Wrangler now creates new Pages projects as Workers unless `--force` is passed. This project was created as a classic Pages project.
- **Why it matters:** classic Pages may stop receiving new features, and a later migration changes the deployment commands and URLs.
- **What is missing:** a migration to Workers static assets (a `wrangler.jsonc` with the `dist` assets directory and the single-page application fallback, previews through version aliases). Small, but kept out of the foundation change to match the current hosting.

### Seeded invoices: no stored totals, and tax computed differently

- **What led to it:** the invoices seeded in the API have `total` and `tax` set to null, and their lines store a tax computed as if prices excluded tax (`price × rate`). Invoices written through the API get both computed by the server, which treats line prices as tax-inclusive and extracts the tax from them.
- **Why it matters:** reading the stored values would show empty totals for the seeded invoices, and their line taxes disagree with the server's own formula. The list and the detail page therefore derive the total and the VAT from the lines, with the server's formula (`price - price / (1 + rate / 100)`, rounded to the cent per line, half up), so every invoice shows correct figures whatever its origin. The stored `tax` values are ignored. If the server ever computed totals differently (discounts, other rounding rules), the derived figures would disagree with it; the half-up rule matches every line checked, but a half-cent case was not observed.
- **What is missing:** a data migration on the API side that recomputes `total` and `tax` for the seeded invoices. The client then reads the stored values instead of deriving them.

### Failed requests are retried once, never after a client error

- **What led to it:** the query client retried every failed request once. A "not found" answer is the same on the second try, so "Invoice not found" appeared one request late.
- **Why it matters:** `shouldRetry` (`src/api/errors.ts`) retries once, and not after any 4xx answer. That includes 408 (timeout) and 429 (rate limit), which a retry could fix; the API was not seen returning either.
- **What is missing:** a retry rule for 408 and 429, with a delay, if the API starts returning them.

### The server checks little, so the form checks more

- **What led to it:** the API accepts a quantity of 0, a negative or fractional one (truncated), a deadline before the date, a missing date and an invoice without lines. Only a missing customer or an unknown product is refused.
- **Why it matters:** the form refuses those before sending (`src/model/invoiceForm.ts`): a whole quantity from 1 to 1 000 000, a deadline not before the date, a date, at least one line. The upper limit is a guess (far above any invoice seen); it is one constant. The lifecycle actions reuse the same rules before finalizing (`src/model/finalizeBlockers.ts`): a draft that breaks one is not finalized, because a finalized invoice can no longer be edited or deleted, so it would be frozen as is. These rules live only in the client, so another client of the API can still store or finalize such invoices.
- **What is missing:** the same rules on the server.

### Server validation details are not mapped to fields

- **What led to it:** a refused invoice comes back with a `message` and `details` such as `invoice_lines.product` or `base`, which do not name a field or a line of the form.
- **Why it matters:** the form shows the server's `message` in an alert above the form and keeps every value. It works, but the user must find the culprit themselves. Messages may also be technical or in French, and are shown as they come.
- **What is missing:** stable error codes per field from the API, then a mapping to the form's fields.

### No unsaved-changes guard on the invoice form

- **What led to it:** "Cancel" and the header link leave the creation and edit forms at once.
- **Why it matters:** a click loses everything typed. Guarding it means blocking navigation (`useBlocker`, available now that the router is in data mode) and a confirmation dialog; it was left out of the four-day scope.
- **What is missing:** the guard, for both forms.

### Concurrent edits: the last save wins

- **What led to it:** the edit form works from the invoice as it was loaded, and sends only the differences (changed quantities, added and removed lines, the three invoice fields).
- **Why it matters:** if someone else changes the same draft meanwhile, the save does not notice: the invoice fields overwrite theirs, and a line they deleted makes the save fail with the server's "Not Found".
- **What is missing:** a version or `updated_at` check on `PUT /invoices/{id}` (optimistic concurrency), answered with a conflict error the form could explain.

## Product

### A page past the end shows a message instead of redirecting

- **What led to it:** a bookmarked or shared list URL such as `/?page=7` can point past the last page once invoices are deleted. The API answers with an empty page and the real number of pages.
- **Why it matters:** redirecting to the last page silently would hide that the link is stale; showing a message with a link to the first page keeps the user informed at the cost of one extra click.
- **What is missing:** nothing technical. Redirecting to the last page (known from the response) is a small change if users prefer it. Deleting an invoice no longer leads here: when it empties a page past the first, the list opens the previous page (`onDeleted` in `src/pages/InvoicesList`), so only a stale link or bookmark reaches this message.

### Credit notes instead of deleting

- **What led to it:** a draft can be deleted for good, and the API refuses to delete a finalized invoice (`422`), so a sent invoice can never be removed.
- **Why it matters:** the only way to cancel a finalized invoice today is to leave it as is; deleting is only for mistakes made while drafting.
- **What is missing:** a credit note (a document that references and cancels another invoice), which the API does not model. A product idea for later; deletion was the small, safe step for this change.

### Payment: only a flag is stored

- **What led to it:** the API stores `paid` as a boolean and nothing else, so "Mark as paid" records that an invoice was paid, not how or when.
- **Why it matters:** a user cannot reconcile payments (date, amount, method) from the app, and marking an invoice unpaid erases the only trace that it was paid.
- **What is missing:** payment records on the API (at least a date and an amount, ideally a method); the app would then offer a payment form and a payment history instead of a toggle.

### No column sort in the list

- **What led to it:** the list was timeboxed to two hours and the customer filter fitted it; column sort did not, so it was left here. The API sorts server-side with `sort` (comma-separated, `-field` for descending): `id`, `date`, `deadline` and `customer_id` work, and a second key serves as a tie-breaker (`-date,id`).
- **Why it matters:** finding the most recent or the most overdue invoice means reading the page; with a filter the list is short, but an unfiltered list of hundreds is not.
- **What is missing:** a control that serializes the sort to the URL and the `sort` parameter. The API cannot sort by customer name (`customer.last_name` is ignored) and `total` is not stored (null on the seeded invoices), so those two headers would stay unsortable.

### No date range filter

- **What led to it:** the API filters dates with the `gteq` and `lteq` operators on `date`, so a "from"/"to" pair would work; the customer filter took the timebox slot instead.
- **Why it matters:** an accounting period (a month, a quarter) is a common way to look at invoices.
- **What is missing:** two date pickers added to the `filter` and serialized to the URL like the other filters, with the same page-1 rule.

### The customer search matches one word only

- **What led to it:** `/customers/search` matches part of a single first or last name, case-insensitive, and not a full name ("Vincent Upton" finds nothing) or an id. This is the behavior of the picker already used by the invoice form, reused for the filter.
- **Why it matters:** typing a full name is natural, and the empty result then looks like the customer does not exist.
- **What is missing:** a full-name or multi-word match on the API. The client could split the input on spaces and search each word, but that is a second search strategy to keep in sync with the form's picker, so it is left to the API.

### A row can leave a filter after an action

- **What led to it:** marking a finalized invoice as paid under the "Finalized" filter (or finalizing a draft under "Draft") changes its status, so the row stops matching the active filter once the list refetches.
- **Why it matters:** the row shows its new status first, then disappears; that is honest, but an action that removes the last row of a page past the first leaves the page empty, and only deletion has the previous-page rule.
- **What is missing:** nothing technical; paging back automatically would need the new total, known only after the refetch. Left as is, with "This page does not exist" and a link back when a page empties.

### Server messages and formats are not localized

- **What led to it:** the interface is in English, but the API can answer with a French message (for example "Une facture finalisée ne peut pas être supprimée"), which is shown to the user as it comes. Dates and amounts are also rendered in one fixed format (ISO dates, French number format).
- **Why it matters:** a user can read a message in another language or a date that does not match their locale, and there is no single place a translator could work from.
- **What is missing:** stable message codes from the API that the client maps to its own translated strings, and a formatting layer driven by a locale instead of the fixed French format.
