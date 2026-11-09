# Spec Delta

## Purpose

Defines how users view one invoice, including every state of the request that loads it.

## ADDED Requirements

### Requirement: Invoice is loaded from the API

The detail page at `/invoices/:id` SHALL show the invoice returned by the API for that id: its number, status, date, deadline, customer name and address, and its lines. A missing value SHALL be shown as a dash.

#### Scenario: Invoice is shown

- **GIVEN** the API returns invoice 100389, finalized and unpaid, for customer Jeannie Flatley at 1320 Evelynn Dam, 57824 Gleasonview, Montserrat
- **WHEN** the user opens `/invoices/100389`
- **THEN** the page shows "Invoice #100389", the status "Finalized", the date, the deadline, the customer name and the full address

#### Scenario: Missing deadline

- **GIVEN** the invoice has no deadline
- **WHEN** the detail page is shown
- **THEN** the deadline shows a dash

### Requirement: Invoice lines

The detail page SHALL list the lines of the invoice, showing for each one its label, quantity, unit, unit price, VAT rate and amount (the line price, VAT included).

#### Scenario: Lines are shown

- **GIVEN** the invoice has a line "Toyota Prius", quantity 2, unit "piece", unit price "18420.0", VAT rate "10" and price "36840.0"
- **WHEN** the detail page is shown
- **THEN** the line row reads Toyota Prius, 2, piece, 18 420,00 €, 10 %, 36 840,00 €

#### Scenario: Invoice without lines

- **GIVEN** the invoice has no lines
- **WHEN** the detail page is shown
- **THEN** the lines table says there are no lines and every total is 0,00 €

### Requirement: Invoice totals

The detail page SHALL show, below the lines, the total excluding VAT, the VAT and the total including VAT, as defined by the `invoice-amounts` capability, whatever totals are stored on the invoice.

#### Scenario: Totals of a seeded invoice

- **GIVEN** the invoice has no stored totals, and lines priced "105340.0" at 20 % VAT and "36840.0" at 10 % VAT, with a stored line tax of "21068.0" on the first line
- **WHEN** the detail page is shown
- **THEN** it shows a total excluding VAT of 121 274,24 €, VAT of 20 905,76 € and a total including VAT of 142 180,00 €

### Requirement: Way back to the list

The detail page SHALL show a "Back to invoices" link to `/` above the invoice title, whatever the status of the invoice.

#### Scenario: Return to the list

- **GIVEN** the detail page shows an invoice
- **WHEN** the user follows "Back to invoices"
- **THEN** the invoices list is shown

### Requirement: Edit entry point for drafts

The detail page SHALL show an "Edit" link to `/invoices/:id/edit` when the invoice is a draft, and no edit entry point when it is finalized.

#### Scenario: Draft can be edited

- **GIVEN** the invoice is a draft
- **WHEN** the user activates "Edit"
- **THEN** the edit page of that invoice opens

#### Scenario: Finalized invoice cannot be edited

- **GIVEN** the invoice is finalized
- **WHEN** the detail page is shown
- **THEN** no "Edit" link is shown

### Requirement: Loading state

While the invoice is being requested, the detail page SHALL show a loading indicator.

#### Scenario: Invoice loading

- **GIVEN** the API has not answered yet
- **WHEN** the user opens `/invoices/100389`
- **THEN** a loading indicator is shown

### Requirement: Invoice not found

When no invoice exists for the id in the URL, the detail page SHALL say so and link to the invoices list, without a retry action. An id that is not a positive integer SHALL be treated as not found without requesting the API.

#### Scenario: Unknown invoice

- **GIVEN** the API answers "not found" for invoice 999999
- **WHEN** the user opens `/invoices/999999`
- **THEN** an "Invoice not found" message and a link to the invoices list are shown, with no "Retry" button

#### Scenario: Invalid id

- **WHEN** the user opens `/invoices/abc` or `/invoices/0`
- **THEN** the "Invoice not found" message is shown and no request is sent to the API

### Requirement: Error state with retry

When the invoice cannot be loaded for another reason, the detail page SHALL show an error message and a retry action that repeats the request.

#### Scenario: Request fails

- **GIVEN** the API answers with a server error
- **WHEN** the user opens `/invoices/100389`
- **THEN** an error message and a "Retry" button are shown

#### Scenario: Retry succeeds

- **GIVEN** the error state is shown and the API now returns the invoice
- **WHEN** the user activates "Retry"
- **THEN** the invoice is shown and the error message is gone

### Requirement: Retry only when it can help

A failed request SHALL be retried automatically at most once, and only when the failure is not a client error (an answer with a 4xx status, such as "not found").

#### Scenario: Server error is retried once

- **GIVEN** a request failed with a server error or without an answer
- **WHEN** the application decides whether to retry
- **THEN** it retries once, and not a second time

#### Scenario: Client error is not retried

- **GIVEN** a request failed with a 404 status
- **WHEN** the application decides whether to retry
- **THEN** it does not retry, so "Invoice not found" is shown without delay
