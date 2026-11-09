# Spec Delta

## Purpose

Defines the automated checks every change must pass before it can be merged, so reviews focus on behavior and the main branch always builds.

## ADDED Requirements

### Requirement: Single verification command

The repository SHALL provide one command that runs, in order, the formatting check, the lint, the type check, the test suite and the production build, and fails if any of them fails.

#### Scenario: All checks pass

- **WHEN** a developer runs the verification command on a clean checkout of `main`
- **THEN** every check runs and the command exits with success

#### Scenario: One check fails

- **WHEN** a developer runs the verification command and one check fails
- **THEN** the command exits with a failure and the output names the failing check

### Requirement: Verification result on every pull request

Every pull request targeting `main` SHALL carry a comment with the output of the verification command run on its head commit, stating the commit, the Node and package manager versions, and whether the checks pass. The repository SHALL provide a command that runs the verification and posts that comment.

#### Scenario: Clean pull request

- **WHEN** a developer runs the posting command on a pushed branch whose checks pass
- **THEN** the pull request gets a comment marked as passing, with the head commit and the full output

#### Scenario: Pull request with a type error

- **WHEN** a developer runs the posting command on a pushed branch that introduces a type error
- **THEN** the pull request gets a comment marked as failing, whose output names the type check, and the command exits with a failure

#### Scenario: Local changes not on the pull request

- **WHEN** a developer runs the posting command with uncommitted changes or with commits not yet pushed
- **THEN** the command exits with a failure before running the checks, and nothing is posted

### Requirement: Formatting check covers every tracked source and documentation file

The formatting check SHALL cover source, configuration and Markdown files and SHALL ignore binary assets, the lockfile and generated code, so that it can run on the whole repository without errors.

#### Scenario: Binary and generated files present

- **WHEN** the formatting check runs on the whole repository
- **THEN** it does not fail on images, the lockfile or generated API code

### Requirement: Lint enforces the rules of hooks

The lint SHALL fail on violations of the React rules of hooks (conditional hook calls, missing effect dependencies) and on warnings, so no rule is silently ignored.

#### Scenario: Conditional hook call

- **WHEN** code calls a hook inside a condition
- **THEN** the lint fails

#### Scenario: Missing effect dependency

- **WHEN** an effect uses a value from the component scope that is not in its dependency list
- **THEN** the lint fails
