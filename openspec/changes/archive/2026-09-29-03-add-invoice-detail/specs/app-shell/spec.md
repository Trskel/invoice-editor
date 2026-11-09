# Spec Delta

## ADDED Requirements

### Requirement: Page not found

A URL that matches no page SHALL show a "Page not found" message with a link to the invoices list, inside the usual layout.

#### Scenario: Unknown URL

- **WHEN** the user opens `/unknown`
- **THEN** a "Page not found" message and a link to the invoices list are shown, and the header is visible

### Requirement: Route-level error screen

An unexpected error while showing a page SHALL replace that page with an error screen that offers a link to the invoices list, keeping the header visible, instead of leaving a blank screen.

#### Scenario: Page fails to render

- **GIVEN** the API returns an invoice that the detail page cannot render (its lines are missing)
- **WHEN** the user opens that invoice
- **THEN** a "Something went wrong" message and a link to the invoices list are shown, and the header is visible

#### Scenario: Recover by leaving the page

- **GIVEN** the error screen is shown
- **WHEN** the user activates the link to the invoices list
- **THEN** the invoices list is shown
