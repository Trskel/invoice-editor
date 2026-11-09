# Spec Delta

## Purpose

Defines how users edit a draft invoice: the form filled from the API, the changes sent when saving, the rule that finalized invoices are read-only, and every state of loading and saving.

## ADDED Requirements

### Requirement: Edit form filled from the invoice

The page at `/invoices/:id/edit` SHALL show, for a draft invoice, the invoice form titled "Edit invoice #<id>", filled with the invoice's customer, date, deadline and lines (product and quantity, in the order the API returns them). The fields, lines, amounts and totals SHALL behave as defined by the `invoice-creation` capability.

#### Scenario: Form opens with the invoice's values

- **GIVEN** draft invoice 100500 for Jeannie Flatley, dated 2026-09-29, deadline 2026-10-29, with line 1 "Toyota Prius" quantity 2 and line 2 "Toyota Camry" quantity 1
- **WHEN** the user opens `/invoices/100500/edit`
- **THEN** the heading "Edit invoice #100500" is shown, the customer is Jeannie Flatley, the date is 2026-09-29, the deadline is 2026-10-29, line 1 is "Toyota Prius" with quantity 2 and line 2 is "Toyota Camry" with quantity 1

#### Scenario: Totals shown from the start

- **GIVEN** the draft invoice of the previous scenario
- **WHEN** the edit page is shown
- **THEN** it shows a total excluding VAT of 52 524,24 €, VAT of 7 155,76 € and a total including VAT of 59 680,00 €

#### Scenario: Invoice without a deadline

- **GIVEN** a draft invoice with no deadline
- **WHEN** the edit page is shown
- **THEN** the deadline field is empty

### Requirement: Validation before saving changes

Saving SHALL send no request while the form breaks a rule of the `invoice-creation` capability ("Validation before saving"), with the same messages, including for values the invoice already had when it was loaded.

#### Scenario: Saved value that breaks a rule

- **GIVEN** a draft invoice whose line 1 has a quantity of 0
- **WHEN** the user opens its edit page and activates "Save changes"
- **THEN** no request is sent and "Enter a whole quantity from 1 to 1 000 000" is shown next to line 1's quantity

#### Scenario: Every line removed

- **GIVEN** the edit page of a draft invoice with one line
- **WHEN** the user activates "Remove line 1" and then "Save changes"
- **THEN** no request is sent and "Add at least one line" is shown

### Requirement: Only the changes are sent

A valid form SHALL be sent as one update of the invoice containing the customer, the date and the deadline (or none), and one instruction per changed line:

- a line added in the form is created with its product and quantity;
- a saved line removed from the form is deleted;
- a saved line whose quantity changed, and not its product, is updated with its new quantity;
- a saved line whose product changed is deleted, and a line with the new product and the form's quantity is created, so that its label, unit, VAT rate and price come from the new product.

Unchanged lines SHALL NOT be sent. The update SHALL NOT change whether the invoice is finalized or paid, and SHALL NOT send labels, units, prices, VAT rates or totals.

#### Scenario: Quantity changed

- **GIVEN** the edit page of invoice 100500 with line 1 "Toyota Prius" (line id 1001) quantity 2 and line 2 "Toyota Camry" (line id 1002) quantity 1
- **WHEN** the user changes line 1's quantity to 3 and activates "Save changes"
- **THEN** one request updates invoice 100500 with its customer, date and deadline, and line 1001 with quantity 3, and nothing else

#### Scenario: Line added and line removed

- **GIVEN** the same edit page
- **WHEN** the user activates "Remove line 2", adds a line with "Toyota Corolla" (product id 111) quantity 1, and activates "Save changes"
- **THEN** the request deletes line 1002 and creates a line with product 111 and quantity 1, and does not mention line 1001

#### Scenario: Product changed on a saved line

- **GIVEN** the same edit page
- **WHEN** the user changes line 2's product to "Toyota Corolla" (product id 111) and activates "Save changes"
- **THEN** the request deletes line 1002 and creates a line with product 111 and quantity 1

#### Scenario: Only the invoice fields changed

- **GIVEN** the same edit page
- **WHEN** the user clears the deadline and activates "Save changes"
- **THEN** the request sends the customer, the date and no deadline, and no line instruction

### Requirement: Saving changes in progress

While the changes are being saved, the save action SHALL show that it is in progress and SHALL NOT send a second request if activated again.

#### Scenario: Double activation

- **GIVEN** a valid edit form and an API that has not answered yet
- **WHEN** the user activates "Save changes" twice
- **THEN** the button shows progress and only one request is sent

### Requirement: Enter in a date field

Pressing Enter in the date or deadline field SHALL accept the typed date and close the calendar, and SHALL NOT save the invoice. The invoice is saved only by activating "Save changes" (or Enter in another field of the form).

#### Scenario: Typed date accepted with Enter

- **GIVEN** the edit page of invoice 100500
- **WHEN** the user types 2026-11-05 in the deadline field and presses Enter
- **THEN** the deadline shows 2026-11-05, the calendar is closed, no request is sent and the edit form is still shown

### Requirement: Saved changes are shown

When the API confirms the update, the application SHALL show a confirmation "Invoice #<id> updated" and open the detail page of the invoice in place of the form, showing the invoice as the API returned it, so that going back does not show the form again. The invoices list SHALL show the saved invoice the next time it is shown.

#### Scenario: Invoice updated

- **GIVEN** the edit page of invoice 100500 and an API that saves the change
- **WHEN** the user changes line 1's quantity to 3 and activates "Save changes"
- **THEN** "Invoice #100500 updated" is shown, and the detail page of invoice 100500 shows line 1 with quantity 3 and a total including VAT of 78 100,00 €

#### Scenario: Back after saving

- **GIVEN** the user opened the edit page from the detail page and saved the invoice
- **WHEN** the user goes back in the browser history
- **THEN** the edit form is not shown

#### Scenario: List is refreshed

- **GIVEN** the invoices list was loaded before the edit page was opened
- **WHEN** the invoice is saved and the user returns to the list
- **THEN** the list is requested from the API again

### Requirement: Save failure

When the changes cannot be saved, the form SHALL show "The invoice could not be saved" with the reason given by the server when there is one, or a generic reason otherwise, and SHALL keep every value entered.

#### Scenario: Invoice finalized in the meantime

- **GIVEN** the edit page is open and the API refuses the update with "Validation failed: Une facture finalisée ne peut pas être modifiée"
- **WHEN** the user activates "Save changes"
- **THEN** "The invoice could not be saved" and that message are shown, and the values entered are unchanged

#### Scenario: Server cannot be reached

- **GIVEN** the update request fails without an answer
- **WHEN** the user activates "Save changes"
- **THEN** "The invoice could not be saved" is shown with a message saying the server could not be reached

### Requirement: Cancel returns to the invoice

The edit form SHALL offer a "Cancel" link that returns to the detail page of the invoice without sending anything.

#### Scenario: Cancel the changes

- **GIVEN** the user changed values in the edit form
- **WHEN** the user activates "Cancel"
- **THEN** the detail page of the invoice is shown and no update is sent

### Requirement: Finalized invoices are read-only

The edit page SHALL NOT show the form for a finalized invoice (paid or not). It SHALL say "Invoice #<id> is finalized" and that a finalized invoice can no longer be edited, with a link "View invoice" to its detail page.

#### Scenario: Edit URL of a finalized invoice

- **GIVEN** invoice 100417 is finalized
- **WHEN** the user opens `/invoices/100417/edit`
- **THEN** "Invoice #100417 is finalized" is shown with a "View invoice" link, and no form field or save action is shown

### Requirement: Loading, not found and error states

The edit page SHALL show the loading, not found and error states of the `invoice-detail` capability, with the same messages and the same retry: "Loading invoice" while loading, "Invoice not found" for an unknown id or a value that cannot be an id, and "Invoice could not be loaded" with a "Retry" action when the request fails.

#### Scenario: Unknown invoice

- **GIVEN** the API answers that invoice 999999 does not exist
- **WHEN** the user opens `/invoices/999999/edit`
- **THEN** "Invoice not found" is shown with a link back to the invoices list

#### Scenario: Not an id

- **GIVEN** any state of the API
- **WHEN** the user opens `/invoices/abc/edit`
- **THEN** "Invoice not found" is shown and no request is sent

#### Scenario: Load failure and retry

- **GIVEN** the API answers the invoice request with a server error, then with the invoice
- **WHEN** the user opens the edit page and activates "Retry"
- **THEN** "Invoice could not be loaded" is shown first, then the form filled with the invoice
