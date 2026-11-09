# Spec Delta

## ADDED Requirements

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
