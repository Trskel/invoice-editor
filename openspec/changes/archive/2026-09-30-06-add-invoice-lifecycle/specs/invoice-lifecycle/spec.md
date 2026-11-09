# Spec Delta

## Purpose

Defines the actions that change the status of an invoice (finalize, mark as paid, mark as unpaid) or delete it: where they are offered, their confirmations, the rule that only complete drafts are finalized, and every state of the requests they send.

## ADDED Requirements

### Requirement: Actions offered by status

The detail page, next to the title, and each row of the invoices list, in an "Actions" column, SHALL offer the actions allowed by the invoice's status (as defined by the `invoices-list` capability, "Invoice status"):

- "Draft": "Finalize" and "Delete";
- "Finalized": "Mark as paid";
- "Paid": "Mark as unpaid".

No other lifecycle action SHALL be offered. Each action SHALL be a button whose accessible name is its visible label followed by ", invoice #<id>", for example "Mark as paid, invoice #100417", so that the buttons of different rows can be told apart.

#### Scenario: Draft

- **GIVEN** draft invoice 100500
- **WHEN** its detail page or the list is shown
- **THEN** the buttons "Finalize, invoice #100500" and "Delete, invoice #100500" are offered, and no "Mark as paid" or "Mark as unpaid" button

#### Scenario: Finalized invoice

- **GIVEN** invoice 100417, finalized and unpaid
- **WHEN** its detail page or the list is shown
- **THEN** only the button "Mark as paid, invoice #100417" is offered

#### Scenario: Paid invoice

- **GIVEN** invoice 100421, finalized and paid
- **WHEN** its detail page or the list is shown
- **THEN** only the button "Mark as unpaid, invoice #100421" is offered

#### Scenario: Paid draft

- **GIVEN** an invoice that is not finalized but is flagged as paid
- **WHEN** its detail page is shown
- **THEN** "Finalize" and "Delete" are offered, and no "Mark as unpaid"

#### Scenario: One set of actions per row

- **GIVEN** the list shows a draft and a finalized invoice
- **WHEN** the user looks at the "Actions" column
- **THEN** the draft's row holds its "Finalize" and "Delete" buttons and the finalized invoice's row holds its "Mark as paid" button

### Requirement: Finalize after confirmation

Activating "Finalize" on a complete draft SHALL open a dialog titled "Finalize invoice #<id>?" saying "A finalized invoice can no longer be edited or deleted.", with the buttons "Finalize" and "Cancel". Confirming SHALL send one update that sets the invoice as finalized and changes nothing else. On success, a toast "Invoice #<id> finalized" SHALL be shown, and the invoice SHALL show the status "Finalized" and the actions of that status. Cancelling or closing the dialog SHALL send nothing.

#### Scenario: Finalize from the detail page

- **GIVEN** the detail page of complete draft invoice 100500
- **WHEN** the user activates "Finalize" and confirms in the dialog
- **THEN** one update with only the finalized flag is sent for invoice 100500, the toast "Invoice #100500 finalized" is shown, the status reads "Finalized", "Mark as paid" is offered and "Edit", "Finalize" and "Delete" are gone

#### Scenario: Finalize from the list

- **GIVEN** the list shows complete draft invoice 100500
- **WHEN** the user activates "Finalize" in its row and confirms
- **THEN** its row shows the status "Finalized" and the button "Mark as paid, invoice #100500"

#### Scenario: Cancel

- **GIVEN** the finalize dialog of invoice 100500 is open
- **WHEN** the user activates "Cancel" or presses Escape
- **THEN** the dialog closes, no request is sent and the invoice is still a draft

### Requirement: Only complete drafts are finalized

A draft that breaks a rule of the `invoice-creation` capability ("Validation before saving") SHALL NOT be finalized. Activating "Finalize" on it SHALL open a dialog titled "Invoice #<id> cannot be finalized yet" that lists every broken rule, with the same messages as the form, prefixed with "Line <n>: " for a rule of a line, a link "Edit invoice" to its edit page and a "Close" button. No request SHALL be sent.

#### Scenario: Draft without lines

- **GIVEN** draft invoice 100500 has a customer and a date but no lines
- **WHEN** the user activates "Finalize"
- **THEN** the dialog "Invoice #100500 cannot be finalized yet" lists "Add at least one line", and no request is sent

#### Scenario: Several broken rules

- **GIVEN** draft invoice 100500 has no date and its line 2 has a quantity of 0
- **WHEN** the user activates "Finalize"
- **THEN** the dialog lists "Enter a date" and "Line 2: Enter a whole quantity from 1 to 1 000 000"

#### Scenario: Fix the draft

- **GIVEN** the dialog "Invoice #100500 cannot be finalized yet" is open
- **WHEN** the user follows "Edit invoice"
- **THEN** the edit page of invoice 100500 opens

### Requirement: Delete a draft after confirmation

Activating "Delete" SHALL open a dialog titled "Delete invoice #<id>?" saying "This cannot be undone.", with the buttons "Delete" and "Cancel". Confirming SHALL send the deletion of the invoice. On success, a toast "Invoice #<id> deleted" SHALL be shown, and:

- from the detail page, the invoices list SHALL be shown, and going back in the browser history SHALL NOT show the deleted invoice's page;
- from the list, the row SHALL disappear; when it was the only row of a page other than the first, the previous page SHALL be shown.

Cancelling or closing the dialog SHALL send nothing.

#### Scenario: Delete from the detail page

- **GIVEN** the user opened the list, then the detail page of draft invoice 100500
- **WHEN** the user activates "Delete" and confirms
- **THEN** the deletion of invoice 100500 is sent, the toast "Invoice #100500 deleted" is shown and the list is shown without invoice 100500

#### Scenario: Back after deleting

- **GIVEN** the user deleted invoice 100500 from its detail page and the list is shown
- **WHEN** the user goes back in the browser history
- **THEN** the detail page of invoice 100500 is not shown

#### Scenario: Delete from the list

- **GIVEN** page 1 of the list shows draft invoices 100500 and 100501
- **WHEN** the user activates "Delete" in the row of 100500 and confirms
- **THEN** the toast "Invoice #100500 deleted" is shown and the list shows 100501 and no row for 100500

#### Scenario: Last row of a page

- **GIVEN** there are 11 invoices and page 2 (`/?page=2`) shows only draft invoice 100510
- **WHEN** the user deletes it from the list
- **THEN** the URL becomes `/` and page 1 is shown

#### Scenario: Cancel

- **GIVEN** the delete dialog of invoice 100500 is open
- **WHEN** the user activates "Cancel" or presses Escape
- **THEN** the dialog closes, no request is sent and the invoice is still shown

### Requirement: Mark as paid or unpaid

"Mark as paid" and "Mark as unpaid" SHALL send, without confirmation, one update that changes only the paid flag of the invoice. The new status SHALL be shown as soon as the action is activated, before the server answers. On success, a toast "Invoice #<id> marked as paid" or "Invoice #<id> marked as unpaid" SHALL be shown. On failure, the previous status SHALL be shown again.

#### Scenario: Mark as paid

- **GIVEN** the detail page of invoice 100417, finalized and unpaid
- **WHEN** the user activates "Mark as paid"
- **THEN** one update with only the paid flag set is sent for invoice 100417, the status reads "Paid" before the server answers, then the toast "Invoice #100417 marked as paid" is shown and "Mark as unpaid" is offered

#### Scenario: Mark as unpaid from the list

- **GIVEN** the list shows invoice 100421, finalized and paid
- **WHEN** the user activates "Mark as unpaid, invoice #100421"
- **THEN** its row shows the status "Finalized" and the button "Mark as paid, invoice #100421"

#### Scenario: Refused by the server

- **GIVEN** the detail page of invoice 100417, finalized and unpaid, and the API answers the update with a server error
- **WHEN** the user activates "Mark as paid"
- **THEN** the status reads "Finalized" again and an error toast is shown

### Requirement: Progress while an action runs

While the request of an action is in progress, its button SHALL show progress, and no lifecycle action or "Edit" of the same invoice SHALL be activatable. Actions of other invoices SHALL stay available.

#### Scenario: Finalizing

- **GIVEN** the user confirmed "Finalize" for invoice 100500 and the API has not answered yet
- **WHEN** the detail page is shown
- **THEN** "Finalize" shows progress and "Delete" and "Edit" cannot be activated

#### Scenario: Other rows stay available

- **GIVEN** the list shows draft invoices 100500 and 100501 and the deletion of 100500 is in progress
- **WHEN** the user looks at the row of 100501
- **THEN** its "Finalize" and "Delete" buttons can be activated

### Requirement: Failed action

When an action fails, an error toast SHALL name the action and the invoice ("Invoice #<id> could not be finalized", "could not be deleted", "could not be marked as paid", "could not be marked as unpaid") and give the reason: the server's message when it gives one, otherwise the messages defined for creation when the server could not be reached or answered without a message. The invoice SHALL then be requested again, so that the status and the actions shown match the server.

#### Scenario: Deleting an invoice finalized elsewhere

- **GIVEN** the detail page shows invoice 100500 as a draft, and the API answers its deletion with a 422 and the message "Une facture finalisée ne peut pas être supprimée", and now returns it as finalized
- **WHEN** the user deletes it
- **THEN** an error toast "Invoice #100500 could not be deleted" shows that message, the detail page stays and shows the status "Finalized" with "Mark as paid"

#### Scenario: No connection

- **GIVEN** the API cannot be reached
- **WHEN** the user confirms "Finalize" for invoice 100500
- **THEN** an error toast "Invoice #100500 could not be finalized" says the server could not be reached, and the invoice is still shown as a draft

### Requirement: Views stay current after an action

After an action succeeds, the list and the detail page SHALL show the invoice's new status, or its absence after a deletion, the next time they are shown, without a manual refresh.

#### Scenario: Back to the list after finalizing

- **GIVEN** the user finalized invoice 100500 from its detail page
- **WHEN** the user follows "Back to invoices"
- **THEN** the row of invoice 100500 shows the status "Finalized"

#### Scenario: Detail page after an action in the list

- **GIVEN** the user marked invoice 100417 as paid from the list
- **WHEN** the user opens its detail page
- **THEN** the status reads "Paid" and "Mark as unpaid" is offered
