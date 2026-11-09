# Spec Delta

## Purpose

Defines how users browse their invoices and open one, including every state of the request that loads them.

## ADDED Requirements

### Requirement: Invoices are listed from the API

The home page SHALL list the invoices returned by the API, showing for each one its number, customer name, date, deadline, status and total. A missing value SHALL be shown as a dash.

#### Scenario: Invoices are shown

- **GIVEN** the API returns two invoices
- **WHEN** the user opens the home page
- **THEN** one row per invoice shows its number, customer name, date, deadline, status and total

#### Scenario: Missing deadline

- **GIVEN** an invoice has no deadline
- **WHEN** the list is shown
- **THEN** its deadline cell shows a dash

### Requirement: Invoice status

Each invoice SHALL show one status: "Paid" when it is finalized and paid, "Finalized" when it is finalized and not paid, "Draft" otherwise.

#### Scenario: Status labels

- **GIVEN** a draft invoice, a finalized unpaid invoice and a finalized paid invoice
- **WHEN** the list is shown
- **THEN** their statuses read "Draft", "Finalized" and "Paid"

#### Scenario: Paid draft

- **GIVEN** an invoice that is not finalized but is flagged as paid
- **WHEN** the list is shown
- **THEN** its status reads "Draft"

### Requirement: Loading state

While the first request for a page is in progress, the list SHALL show a loading indicator and no invoice rows.

#### Scenario: First load

- **GIVEN** the API has not answered yet
- **WHEN** the user opens the home page
- **THEN** a loading indicator is shown and no invoice rows are shown

### Requirement: Error state with retry

When the invoices cannot be loaded, the list SHALL show an error message and a retry action that repeats the request.

#### Scenario: Request fails

- **GIVEN** the API answers with a server error
- **WHEN** the user opens the home page
- **THEN** an error message and a "Retry" button are shown instead of the table

#### Scenario: Retry succeeds

- **GIVEN** the error state is shown and the API now returns invoices
- **WHEN** the user activates "Retry"
- **THEN** the invoices are shown and the error message is gone

### Requirement: Empty state

When there are no invoices at all, the list SHALL say so and offer to create one.

#### Scenario: No invoices

- **GIVEN** the API returns no invoices and a total of zero entries
- **WHEN** the user opens the home page
- **THEN** a "No invoices yet" message and a link to create an invoice are shown

### Requirement: Server-side pagination synced to the URL

The list SHALL show 10 invoices per page, requested page by page from the API. The current page SHALL be stored in the URL query parameter `page`, so that the URL alone determines the page shown. Page 1 SHALL be represented by the absence of the parameter.

#### Scenario: Open a page from its URL

- **GIVEN** there are 25 invoices
- **WHEN** the user opens `/?page=2`
- **THEN** page 2 is requested from the API with a page size of 10, and the pagination control shows page 2 as current

#### Scenario: Change page

- **GIVEN** the user is on page 1 of 3
- **WHEN** the user selects page 2 in the pagination control
- **THEN** the URL becomes `/?page=2` and the invoices of page 2 are shown

#### Scenario: Back to the previous page

- **GIVEN** the user moved from page 1 to page 2
- **WHEN** the user goes back in the browser history
- **THEN** the URL is `/` and page 1 is shown

#### Scenario: Invalid page parameter

- **WHEN** the user opens `/?page=abc`, `/?page=0` or `/?page=-1`
- **THEN** page 1 is requested and shown

#### Scenario: Page out of range

- **GIVEN** there are 3 pages of invoices
- **WHEN** the user opens `/?page=7`
- **THEN** a message says the page does not exist and a link leads to the first page

#### Scenario: Previous page stays visible while the next one loads

- **GIVEN** page 1 is shown and the request for page 2 is in progress
- **WHEN** the user has selected page 2
- **THEN** the rows of page 1 stay visible with a loading indicator until page 2 arrives

### Requirement: Open an invoice

Each row SHALL contain a link to the invoice detail page, reachable and activatable from the keyboard, with the invoice number as its accessible name. Browser link behavior (open in a new tab, copy link) SHALL work on it.

#### Scenario: Open with the keyboard

- **GIVEN** the list shows invoice 100389
- **WHEN** the user moves focus to the link "#100389" and presses Enter
- **THEN** the detail page of invoice 100389 (`/invoices/100389`) opens

#### Scenario: Open in a new tab

- **WHEN** the user Ctrl-clicks or Cmd-clicks the invoice number link
- **THEN** the detail page opens in a new browser tab and the list stays in the current tab

### Requirement: Create invoice entry point

The list SHALL offer a "Create invoice" link to the invoice creation page, above the table.

#### Scenario: Go to creation

- **WHEN** the user activates "Create invoice"
- **THEN** the creation page (`/invoices/new`) opens
