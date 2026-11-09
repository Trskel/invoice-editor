# hosting Specification

## Purpose

Defines how the application is deployed and served, so reviewers can open any page from a link and every deployment is reproducible from the repository.

## Requirements

### Requirement: Deep links are served by the application

The deployed application SHALL serve the application shell for any client-side route, so that opening or refreshing a URL other than the root renders the matching page instead of a host error.

#### Scenario: Refresh on a nested route

- **WHEN** a user opens `/invoices/new` directly on the deployed URL, or refreshes the page while on it
- **THEN** the page loads with a successful response and shows the invoice creation page

#### Scenario: Static assets are not rewritten

- **WHEN** the browser requests a built JavaScript or CSS asset
- **THEN** the asset itself is returned, not the application shell

### Requirement: Reproducible deployment command

The repository SHALL provide one documented command that builds the application and deploys it to the production URL.

#### Scenario: Successful deployment

- **WHEN** a maintainer with access to the hosting account runs the deployment command with the API token configured locally
- **THEN** a new production deployment is published and the command prints its URL

### Requirement: Preview deployment before production

The repository SHALL provide one documented command that deploys the same production build to a fixed preview URL without changing the production URL, so a change can be checked on the real host before release.

#### Scenario: Preview deployment

- **WHEN** a maintainer runs the preview deployment command from any branch
- **THEN** the build is published at the preview URL, the command prints it, and the production URL still serves the previous deployment

#### Scenario: Deep links on the preview

- **WHEN** a user opens or refreshes `/invoices/new` on the preview URL
- **THEN** the page loads with a successful response and shows the invoice creation page, as on production

### Requirement: No deployment without an API token

The production and preview deployment commands SHALL abort before building or uploading when the API token is missing or empty, with a message explaining how to configure it. The token SHALL never be committed to the repository.

#### Scenario: Token missing

- **WHEN** a maintainer runs either deployment command without the API token configured
- **THEN** the command exits with a failure before uploading anything and explains which variable to set and where

#### Scenario: Build without a token

- **WHEN** the production build runs without an API token (for example in the verification command on a fresh clone)
- **THEN** the build succeeds (the token check only applies to deployments)
