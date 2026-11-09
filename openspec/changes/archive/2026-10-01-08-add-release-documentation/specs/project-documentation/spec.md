# Spec Delta

## Purpose

Defines what the repository's documentation lets a reviewer or maintainer do without reading the code first: run the application, understand its design and trade-offs, trace every change to its specification, and see how AI tools were used and checked.

## ADDED Requirements

### Requirement: Run the application from a fresh clone

The README SHALL list the prerequisites and the commands to install, configure the API token, start, test, verify and deploy the application, and every command SHALL run as written.

#### Scenario: Fresh clone

- **GIVEN** a fresh clone, the pinned Node and yarn versions, and an API token
- **WHEN** a reviewer follows the README in order
- **THEN** the development server starts and shows invoices from the API, and the verification command passes

#### Scenario: Live application

- **WHEN** a reviewer opens the live link at the top of the README
- **THEN** the deployed application shows the invoices list

### Requirement: Understand the design from the README

The README SHALL describe the features, the architecture and data flow with a diagram that renders on the repository host, the key decisions with their trade-offs, and the testing approach, and SHALL agree with the code.

#### Scenario: Diagram renders

- **WHEN** a reviewer opens the README on the repository host
- **THEN** the architecture diagram is drawn as a figure, not shown as source text, and shows how a page gets its data from the API

#### Scenario: Structure matches the code

- **WHEN** a reviewer compares the folders and files named in the README with the repository tree
- **THEN** every named path exists and every folder under `src/` is described

#### Scenario: Features are shown

- **WHEN** a reviewer reads the feature list
- **THEN** each main screen (list, detail, invoice form) has a screenshot of the deployed application

### Requirement: The development workflow is explained

The README SHALL describe the workflow every change followed, step by step from issue to production (specification first, tests written and seen failing before the code, review, archive, merge, deployment), name where each step leaves evidence in the repository, and walk one feature through every step.

#### Scenario: Follow one feature end to end

- **WHEN** a reviewer follows the worked example in the README
- **THEN** they reach, in order, the issue, the specification change, a scenario, the test that covers it, the pull request with its verification comment, and the living specification

#### Scenario: Claims match the record

- **WHEN** a reviewer compares the workflow description with the archived changes
- **THEN** every step described, including test first, appears in the tasks of the changes it claims to cover, and the changes it does not cover are named

### Requirement: Trace every change to its specification

The README SHALL list every merged pull request in delivery order, each with a link to the pull request and to its archived specification change.

#### Scenario: Links resolve

- **WHEN** a reviewer follows each pull request link and each specification link in the README
- **THEN** each opens the matching pull request or change folder

### Requirement: AI usage is disclosed

The README SHALL name every AI tool used, the tasks each was used for, how its output was validated, and at least two concrete examples of AI output that was corrected during review, each pointing to where the correction can be seen in the repository.

#### Scenario: Examples are verifiable

- **WHEN** a reviewer follows the link of an example
- **THEN** it opens the commit, pull request or design note that shows the correction

### Requirement: Improvements and limitations are documented

`NOTES.md` SHALL state, for each entry, what led to it, why it matters and what is missing to do it. The README SHALL summarize the known limitations and link to `NOTES.md`.

#### Scenario: Every entry is complete and current

- **WHEN** a reviewer reads any `NOTES.md` entry
- **THEN** it has the three parts, and the behavior it describes matches the deployed application

### Requirement: Dependency changes are justified

The README SHALL list every dependency added to or removed from the starter project, each with its reason.

#### Scenario: Dependencies match the manifest

- **WHEN** a reviewer compares the package manifest with the starter's
- **THEN** every added and every removed package is listed in the README with its reason, and the list matches the manifest
