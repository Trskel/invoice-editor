# invoice-amounts Specification

## Purpose

Defines how invoice amounts are computed and displayed, so every page shows the same, exact figures whether or not the API stored them.

## Requirements

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

### Requirement: VAT derived from its lines

The VAT of a line SHALL be extracted from its tax-inclusive price: price minus price divided by (1 + rate / 100), rounded to the cent, half up. The VAT of an invoice SHALL be the sum of the rounded VAT of its lines. The tax stored on lines and on the invoice SHALL be ignored.

#### Scenario: VAT extracted from an inclusive price

- **GIVEN** a line priced "105340.0" at a VAT rate of "20", with a stored tax of "21068.0"
- **WHEN** its VAT is computed
- **THEN** the VAT is "17556.67"

#### Scenario: VAT rounded per line

- **GIVEN** two lines priced "0.10" at a VAT rate of "20"
- **WHEN** the invoice VAT is computed
- **THEN** the VAT is "0.04" (0.02 per line), not the 0.03 obtained by rounding the VAT of the sum

#### Scenario: Zero rate

- **GIVEN** a line priced "22070.0" at a VAT rate of "0"
- **WHEN** its VAT is computed
- **THEN** the VAT is "0"

### Requirement: Total excluding VAT

The total excluding VAT of an invoice SHALL be its total minus its VAT, so that the three figures shown always add up.

#### Scenario: Totals add up

- **GIVEN** an invoice with lines priced "105340.0" at 20 % and "36840.0" at 10 %
- **WHEN** its amounts are computed
- **THEN** the total is "142180", the VAT "20905.76" and the total excluding VAT "121274.24"

### Requirement: Line amount derived from the product

The amount of a line that is not saved yet SHALL be the exact decimal product of the product's unit price (VAT included) and the quantity, the formula the server applies when it saves the line. Its VAT and the invoice totals then follow the rules of this capability.

#### Scenario: Amount of a line

- **GIVEN** a product with a unit price of "18420.0" and a quantity of 2
- **WHEN** the line amount is computed
- **THEN** the amount is "36840"

#### Scenario: Exact decimal product

- **GIVEN** a product with a unit price of "0.1" and a quantity of 3
- **WHEN** the line amount is computed
- **THEN** the amount is exactly "0.3"
