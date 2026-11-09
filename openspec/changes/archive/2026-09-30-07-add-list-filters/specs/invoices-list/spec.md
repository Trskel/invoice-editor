# Spec Delta

## Purpose

Adds a status filter and a customer filter to the invoices list, both kept in the URL, and tells an empty filter from an empty invoice list.

## ADDED Requirements

### Requirement: Status filter

Above the table, the list SHALL offer a "Status" control with the options "All", "Draft", "Finalized" and "Paid", one selected at a time, "All" by default. Choosing an option other than "All" SHALL show only the invoices whose status (as defined in "Invoice status") has that label, filtered by the API across all pages. The control SHALL be a group of radio buttons named "Status", usable with the keyboard.

#### Scenario: Show drafts only

- **GIVEN** the list is shown with every invoice
- **WHEN** the user chooses "Draft" in the "Status" control
- **THEN** the invoices that are not finalized are requested from the API, and only they are listed

#### Scenario: Show finalized invoices

- **WHEN** the user chooses "Finalized"
- **THEN** the invoices that are finalized and not paid are requested, and only they are listed

#### Scenario: Show paid invoices

- **WHEN** the user chooses "Paid"
- **THEN** the invoices that are finalized and paid are requested; a draft flagged as paid is not among them

#### Scenario: Back to all invoices

- **GIVEN** the "Draft" option is selected and no customer is chosen
- **WHEN** the user chooses "All"
- **THEN** the invoices are requested without any filter

### Requirement: Customer filter

Next to the "Status" control, the list SHALL offer a picker named "Customer" that searches customers by name, with the same search, loading, "No results" and "Search failed" behavior as the customer field of the invoice form. Choosing a customer SHALL show only that customer's invoices, filtered by the API across all pages. The picker SHALL offer a clear control for pointer users, which removes the customer choice and keeps the status; keyboard users clear it with "Clear filters". The customer filter and the status filter SHALL combine: only the invoices matching both are shown.

#### Scenario: Choose a customer

- **GIVEN** the list is shown with every invoice
- **WHEN** the user types "upt" in the "Customer" picker and chooses "Vincent Upton"
- **THEN** only the invoices of customer 20 are requested and listed, and the picker shows "Vincent Upton"

#### Scenario: Customer and status together

- **GIVEN** customer 157 is chosen
- **WHEN** the user chooses "Draft"
- **THEN** the drafts of customer 157 are requested, and only they are listed

#### Scenario: Clear the customer

- **GIVEN** customer 20 is chosen and "Draft" is selected
- **WHEN** the user clears the "Customer" picker with its clear control
- **THEN** the drafts of every customer are requested, "Draft" stays selected and the picker is empty

#### Scenario: Customer search fails

- **GIVEN** the customer search answers with a server error
- **WHEN** the user types in the "Customer" picker
- **THEN** the picker says "Search failed" and the list stays as it was

### Requirement: Filters synced to the URL

The status SHALL be stored in the URL query parameter `status` (`draft`, `finalized` or `paid`) and the customer in the parameter `customer` (the customer id, a positive integer), so that the URL alone determines the list shown. "All" and "no customer" SHALL be represented by the absence of the parameter. A value not in these lists SHALL be treated as absent. Each change of a filter SHALL add a browser history entry.

When the list is opened with a `customer` parameter, the picker SHALL show that customer's name, taken from the API. While the name is not known, or when no invoice of that customer exists to tell it, the picker SHALL show "Customer #<id>".

#### Scenario: Open a filtered list from its URL

- **WHEN** the user opens `/?status=finalized&customer=157&page=2`
- **THEN** page 2 of the finalized unpaid invoices of customer 157 is requested, "Finalized" is selected, and the picker shows that customer's name

#### Scenario: Choosing filters writes the URL

- **GIVEN** the user is on `/`
- **WHEN** the user chooses "Paid", then customer 157
- **THEN** the URL becomes `/?status=paid`, then `/?status=paid&customer=157`

#### Scenario: Back to the previous filter

- **GIVEN** the user chose "Draft" from the unfiltered list
- **WHEN** the user goes back in the browser history
- **THEN** the URL is `/`, "All" is selected and every invoice is listed

#### Scenario: Unknown values

- **WHEN** the user opens `/?status=overdue&customer=abc`
- **THEN** the invoices are requested without filter, "All" is selected and the picker is empty

#### Scenario: Customer without invoices

- **GIVEN** customer 999 has no invoices
- **WHEN** the user opens `/?customer=999`
- **THEN** the picker shows "Customer #999" and the list says no invoice matches the filters

### Requirement: Page when a filter changes

Changing a filter SHALL show page 1, since the previous page number may not exist in the new list. Changing the page SHALL keep the filters. Every link or navigation of the list to another page of it, including "Go to the first page" when a page does not exist and the previous page shown after deleting the only row of a page, SHALL keep the filters.

#### Scenario: New status starts at page 1

- **GIVEN** the user is on `/?page=3`
- **WHEN** the user chooses "Draft"
- **THEN** the URL becomes `/?status=draft` and page 1 of the drafts is shown

#### Scenario: New customer starts at page 1

- **GIVEN** the user is on `/?status=draft&page=2`
- **WHEN** the user chooses customer 157
- **THEN** the URL becomes `/?status=draft&customer=157` and page 1 is shown

#### Scenario: Paging keeps the filters

- **GIVEN** the user is on `/?status=draft&customer=157` and there are 2 pages of matching invoices
- **WHEN** the user selects page 2
- **THEN** the URL becomes `/?status=draft&customer=157&page=2`

#### Scenario: Page out of range keeps the filters

- **GIVEN** there is 1 page of paid invoices
- **WHEN** the user opens `/?status=paid&page=4`
- **THEN** the message says the page does not exist and its link leads to `/?status=paid`

#### Scenario: Deleting the last row of a filtered page

- **GIVEN** the user is on `/?status=draft&page=2` and that page lists one draft
- **WHEN** the user deletes it, and the API then answers page 2 with no invoices
- **THEN** the URL becomes `/?status=draft` and page 1 of the drafts is shown

### Requirement: Clear filters

While a filter is active, the list SHALL offer a "Clear filters" button next to the filter controls, reachable and activatable from the keyboard, that removes both filters and shows page 1. While no filter is active, the button SHALL not be shown. There SHALL be one such button on the page.

#### Scenario: Clear both filters

- **GIVEN** the user is on `/?status=draft&customer=157&page=2`
- **WHEN** the user activates "Clear filters"
- **THEN** the URL becomes `/`, "All" is selected, the picker is empty and every invoice is listed

#### Scenario: Clear the customer with the keyboard

- **GIVEN** customer 157 is chosen
- **WHEN** the user moves focus to "Clear filters" with Tab and presses Enter
- **THEN** the picker is empty and the invoices are requested without any filter

#### Scenario: No filter, no button

- **WHEN** the user opens `/` or `/?page=2`
- **THEN** no "Clear filters" button is shown

### Requirement: Empty filter

When a filter is active and no invoice matches, the list SHALL say "No invoices match these filters" instead of the table. The filter controls and "Clear filters" SHALL stay visible.

#### Scenario: No paid invoices

- **GIVEN** the API returns no invoices and a total of zero entries for the "Paid" filter
- **WHEN** the user opens `/?status=paid`
- **THEN** "No invoices match these filters" and the "Clear filters" button are shown, and "No invoices yet" is not

#### Scenario: Leave an empty filter

- **GIVEN** "No invoices match these filters" is shown on `/?status=paid&customer=157`
- **WHEN** the user activates "Clear filters"
- **THEN** the URL becomes `/` and every invoice is listed

## MODIFIED Requirements

### Requirement: Empty state

When there are no invoices at all, the list SHALL say so and offer to create one. This state SHALL only be shown when no filter is active; an empty result with a filter is covered by "Empty filter".

#### Scenario: No invoices

- **GIVEN** the API returns no invoices and a total of zero entries
- **WHEN** the user opens the home page
- **THEN** a "No invoices yet" message and a link to create an invoice are shown
