# invoice-creation Specification

## Purpose

Defines how users create an invoice from a form: its fields, the validation done before any request, the amounts shown while typing, and every state of the save request.

## Requirements

### Requirement: New invoice form

The page at `/invoices/new` SHALL show a form titled "New invoice" with a customer, a date, a deadline and a list of lines. The date SHALL start at today's date, the deadline SHALL start empty, and the form SHALL start with one empty line.

#### Scenario: Form opens with defaults

- **GIVEN** today is 2026-09-29
- **WHEN** the user opens `/invoices/new`
- **THEN** the heading "New invoice" is shown, no customer is selected, the date is 2026-09-29, the deadline is empty, and there is one line with no product and no quantity

### Requirement: Named fields

Every field of the form SHALL have an accessible name: "Customer", "Date" and "Deadline" for the invoice fields, and "Product, line N" and "Quantity, line N" for the fields of line N. The action removing line N SHALL be named "Remove line N".

#### Scenario: Fields of a line are named

- **GIVEN** the form has two lines
- **WHEN** a screen reader user moves through the form
- **THEN** the fields are announced as "Customer", "Date", "Deadline", "Product, line 1", "Quantity, line 1", "Product, line 2", "Quantity, line 2", and the remove actions as "Remove line 1" and "Remove line 2"

### Requirement: Choosing a customer and products

The customer and product fields SHALL search the API as the user types and offer the matching customers (by name) and products (by label). Each picker SHALL show that results are loading, that nothing matches, or that the search failed.

#### Scenario: Customer is chosen from the search

- **GIVEN** the API returns the customer Jeannie Flatley for the search "jea"
- **WHEN** the user types "jea" in the customer field and chooses Jeannie Flatley
- **THEN** the customer field shows Jeannie Flatley

#### Scenario: Search without results

- **GIVEN** the API returns no product for the search "tesla"
- **WHEN** the user types "tesla" in a product field
- **THEN** the picker says there are no results

#### Scenario: Search fails

- **GIVEN** the API answers the product search with a server error
- **WHEN** the user types in a product field
- **THEN** the picker says the search failed, instead of saying there are no results

### Requirement: Editing the lines

The user SHALL be able to add a line ("Add line") and remove any line. Once a product is chosen, the line SHALL show the product's unit, its unit price and its VAT rate, and the line amount (as defined by the `invoice-amounts` capability). A line without a product, or whose quantity is not valid, SHALL show a dash as its amount.

#### Scenario: Product details are shown on the line

- **GIVEN** the product search returns "Toyota Prius", unit "piece", unit price "18420.0", VAT rate "10"
- **WHEN** the user chooses it on line 1 and enters the quantity 2
- **THEN** line 1 shows piece, 18 420,00 €, 10 % and an amount of 36 840,00 €

#### Scenario: Amount follows the quantity

- **GIVEN** line 1 has the product "Toyota Prius" and the quantity 2
- **WHEN** the user changes the quantity to 3
- **THEN** the amount of line 1 becomes 55 260,00 € without any request to the API

#### Scenario: Incomplete line

- **GIVEN** line 1 has no product, or a quantity of 0
- **WHEN** the form is shown
- **THEN** line 1 shows a dash as its amount

#### Scenario: Add and remove lines

- **GIVEN** the form has one line with the product "Toyota Prius"
- **WHEN** the user activates "Add line", chooses "Toyota Camry" on line 2, then activates "Remove line 1"
- **THEN** one line is left, with the product "Toyota Camry"

### Requirement: Live totals

The form SHALL show, below the lines, the total excluding VAT, the VAT and the total including VAT of the complete lines (a product and a valid quantity), computed as defined by the `invoice-amounts` capability and updated as the user edits the lines. Incomplete lines SHALL count for nothing.

#### Scenario: Totals of two lines

- **GIVEN** line 1 is "Toyota Prius" (unit price "18420.0", VAT rate "10") with quantity 2 and line 2 is "Toyota Camry" (unit price "22840.0", VAT rate "20") with quantity 1
- **WHEN** the form is shown
- **THEN** it shows a total excluding VAT of 52 524,24 €, VAT of 7 155,76 € and a total including VAT of 59 680,00 €

#### Scenario: Totals of an empty form

- **GIVEN** the form has only incomplete lines
- **WHEN** the form is shown
- **THEN** every total is 0,00 €

### Requirement: Validation before saving

Saving SHALL send no request while the form is invalid. It SHALL show each problem next to its field, mark that field as invalid for assistive technologies, and move the focus to the first invalid field. The rules and their messages are:

- no customer: "Select a customer"
- no date: "Enter a date"
- a deadline before the date: "The deadline cannot be before the date" (a deadline on the date itself is valid; no deadline is valid)
- no line: "Add at least one line"
- a line without a product: "Select a product"
- a line whose quantity is missing, not a whole number, below 1 or above 1 000 000: "Enter a whole quantity from 1 to 1 000 000"

After a first attempt to save, each message SHALL disappear as soon as its field becomes valid.

#### Scenario: Empty form is not sent

- **GIVEN** the form is as it opens
- **WHEN** the user activates "Save invoice"
- **THEN** no request is sent, "Select a customer" is shown next to the customer, "Select a product" and "Enter a whole quantity from 1 to 1 000 000" next to line 1, and the customer field has the focus

#### Scenario: Quantity the API would accept

- **GIVEN** a customer and a product are chosen
- **WHEN** the user enters a quantity of 0, -1 or 1.5 on the line and activates "Save invoice"
- **THEN** no request is sent and "Enter a whole quantity from 1 to 1 000 000" is shown next to the quantity

#### Scenario: Deadline before the date

- **GIVEN** the date is 2026-09-29
- **WHEN** the user sets the deadline to 2026-09-28 and activates "Save invoice"
- **THEN** no request is sent and "The deadline cannot be before the date" is shown next to the deadline

#### Scenario: Deadline on the date

- **GIVEN** the date is 2026-09-29 and the rest of the form is valid
- **WHEN** the user sets the deadline to 2026-09-29 and activates "Save invoice"
- **THEN** the invoice is sent

#### Scenario: Invoice without lines

- **GIVEN** a customer is chosen and the user removed every line
- **WHEN** the user activates "Save invoice"
- **THEN** no request is sent and "Add at least one line" is shown

#### Scenario: Message clears when fixed

- **GIVEN** "Select a customer" is shown after an attempt to save
- **WHEN** the user chooses a customer
- **THEN** "Select a customer" is no longer shown

### Requirement: Saved as a draft with only what the server needs

A valid form SHALL be sent as a new draft invoice containing the customer, the date, the deadline (or none), and for each line only its product and quantity, in the order shown. Labels, units, prices, VAT rates and totals SHALL NOT be sent: the server derives them from the product.

#### Scenario: Request content

- **GIVEN** the customer is Jeannie Flatley (id 1), the date 2026-09-29, no deadline, line 1 "Toyota Prius" (id 12) quantity 2 and line 2 "Toyota Camry" (id 11) quantity 1
- **WHEN** the user activates "Save invoice"
- **THEN** one request creates an invoice with customer 1, date 2026-09-29, no deadline, not finalized, and lines product 12 quantity 2 then product 11 quantity 1, and nothing else

### Requirement: Saving in progress

While the invoice is being saved, the save action SHALL show that it is in progress and SHALL NOT send a second request if activated again.

#### Scenario: Double activation

- **GIVEN** a valid form and an API that has not answered yet
- **WHEN** the user activates "Save invoice" twice
- **THEN** the button shows progress and only one request is sent

### Requirement: Saved invoice is shown

When the API confirms the creation, the application SHALL show a confirmation "Invoice #<id> created" and open the detail page of the new invoice in place of the form, so that going back leads to the page before the form. The invoices list SHALL include the new invoice the next time it is shown.

#### Scenario: Invoice created

- **GIVEN** a valid form and an API that creates invoice 100500
- **WHEN** the user activates "Save invoice"
- **THEN** "Invoice #100500 created" is shown and the detail page of invoice 100500 is shown with its lines and totals

#### Scenario: Back after creating

- **GIVEN** the user opened the form from the invoices list and created an invoice
- **WHEN** the user goes back in the browser history
- **THEN** the invoices list is shown, not the form

#### Scenario: List is refreshed

- **GIVEN** the invoices list was loaded before the form was opened
- **WHEN** an invoice is created and the user returns to the list
- **THEN** the list is requested from the API again

### Requirement: Save failure

When the invoice cannot be saved, the form SHALL show "The invoice could not be saved" with the reason given by the server when there is one, or a generic reason otherwise, and SHALL keep every value entered so the user can correct it and save again.

#### Scenario: Server rejects the invoice

- **GIVEN** the API answers the creation with a validation error "Validation failed: Invoice lines product must exist"
- **WHEN** the user activates "Save invoice"
- **THEN** "The invoice could not be saved" and "Validation failed: Invoice lines product must exist" are shown, and the customer, dates and lines are unchanged

#### Scenario: Server cannot be reached

- **GIVEN** the creation request fails without an answer
- **WHEN** the user activates "Save invoice"
- **THEN** "The invoice could not be saved" is shown with a message saying the server could not be reached

#### Scenario: Save again after a failure

- **GIVEN** the save failed and the API now creates the invoice
- **WHEN** the user activates "Save invoice" again
- **THEN** the invoice is created and its detail page is shown

### Requirement: Cancel

The form SHALL offer a "Cancel" link that returns to the invoices list without sending anything.

#### Scenario: Cancel the creation

- **GIVEN** the user has entered values in the form
- **WHEN** the user activates "Cancel"
- **THEN** the invoices list is shown and no invoice is created
