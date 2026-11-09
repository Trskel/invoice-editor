# Spec Delta

## Purpose

Defines how invoice amounts are computed and displayed, so every page shows the same, exact figures whether or not the API stored them.

## ADDED Requirements

### Requirement: Invoice total derived from its lines

The total of an invoice SHALL be the exact decimal sum of the prices of its lines (prices include tax), independent of the total stored on the invoice. An invoice without lines SHALL have a total of zero.

#### Scenario: Total without a stored value

- **GIVEN** an invoice with no stored total and two lines priced "105340.0" and "36840.0"
- **WHEN** its total is shown
- **THEN** the total is 142 180,00 €

#### Scenario: Exact decimal sum

- **GIVEN** an invoice with lines priced "0.1" and "0.2"
- **WHEN** its total is computed
- **THEN** the total is exactly "0.3"

#### Scenario: No lines

- **GIVEN** an invoice without lines
- **WHEN** its total is shown
- **THEN** the total is 0,00 €

### Requirement: Amount display

Amounts SHALL be displayed in euros with French number formatting (space as thousands separator, comma as decimal separator, two decimals, euro sign after the number), converted from the decimal string without going through a binary floating-point number.

#### Scenario: Large amount keeps its cents

- **WHEN** the amount "90071992547409.99" is displayed
- **THEN** it reads 90 071 992 547 409,99 € (a conversion to a floating-point number would show 409,98)
