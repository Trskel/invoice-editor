# app-shell Specification

## Purpose

Defines the layout shared by every page: the header with the application name and its link back to the invoices list.

## Requirements

### Requirement: Home link in the header

The header SHALL show the visible wordmark "Invoice Editor" as a link to the invoices list, with "Invoice Editor" as its accessible name.

#### Scenario: Return to the list

- **GIVEN** the user is on another page
- **WHEN** the user activates the "Invoice Editor" link in the header
- **THEN** the invoices list opens

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

### Requirement: Text meets accessible contrast

Text, links, buttons, form placeholders, status tags and secondary labels SHALL meet the WCAG 2.1 AA contrast ratio of at least 4.5:1 against the color behind them.

#### Scenario: Links and buttons on the list

- **GIVEN** the list shows draft, finalized and paid invoices
- **WHEN** the contrast of its text, links, buttons, placeholder and status tags is measured
- **THEN** every one of them is at least 4.5:1

#### Scenario: Labels on the detail page

- **GIVEN** an invoice is shown
- **WHEN** the contrast of the "Back to invoices" link and of the detail labels is measured
- **THEN** both are at least 4.5:1

#### Scenario: Placeholder and buttons on the form

- **GIVEN** the creation form is shown
- **WHEN** the contrast of its placeholders, link button and primary button is measured
- **THEN** each is at least 4.5:1

### Requirement: No horizontal page scroll on narrow screens

On a 375 px wide viewport, no page SHALL scroll horizontally. Content whose columns do not fit, such as a table or the fixed form grid, SHALL scroll inside its own container instead of widening the page.

#### Scenario: List on a narrow screen

- **GIVEN** a 375 px wide viewport
- **WHEN** the user opens the list with a filter
- **THEN** the page does not scroll horizontally and the table scrolls inside its own container

#### Scenario: Detail on a narrow screen

- **GIVEN** a 375 px wide viewport
- **WHEN** the user opens an invoice that has lines
- **THEN** the page does not scroll horizontally, the detail labels stack, and the lines table scrolls inside its own container

#### Scenario: Form on a narrow screen

- **GIVEN** a 375 px wide viewport
- **WHEN** the user opens the creation form
- **THEN** the page does not scroll horizontally and the line grid scrolls inside its own container
