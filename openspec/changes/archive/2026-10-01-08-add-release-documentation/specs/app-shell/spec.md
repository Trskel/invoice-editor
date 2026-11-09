# Spec Delta

## Purpose

Keeps the shared layout readable and contained on any viewport: text that meets the accessibility contrast rule, and no page that scrolls sideways when the content does not fit.

## ADDED Requirements

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
