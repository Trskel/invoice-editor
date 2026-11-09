# Spec Delta

## Purpose

Defines the layout shared by every page.

## ADDED Requirements

### Requirement: Home link in the header

The header SHALL show the visible wordmark "Invoice Editor" as a link to the invoices list, with "Invoice Editor" as its accessible name.

#### Scenario: Return to the list

- **GIVEN** the user is on another page
- **WHEN** the user activates the "Invoice Editor" link in the header
- **THEN** the invoices list opens
