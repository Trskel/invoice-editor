# Spec Delta

## ADDED Requirements

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
