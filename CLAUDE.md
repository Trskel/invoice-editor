# CLAUDE.md

Conventions for AI assistants working in this repository.

## Project

Invoice editor on top of an existing REST API. Stack, architecture rules and API facts are in `openspec/config.yaml` (`context`); read it before changing code.

## Workflow

- Spec first: every change starts as an OpenSpec change in `openspec/changes/` (proposal, specs, design, tasks). No implementation before the change is approved.
- One OpenSpec change per pull request; each pull request closes its GitHub issue.
- Change names start with the two-digit issue number (`02-add-invoices-list` for issue #2), so archived changes sort in delivery order.
- Every spec scenario is covered by an automated test or a manual verification step listed in the pull request.
- No new dependency without a written justification in the change design.
- Conventional Commits.

## Commands

- `yarn start`: development server
- `yarn verify`: format check, lint, typecheck, tests, build
- `yarn verify:pr`: after the last push, run `verify` and post the output on the pull request (there is no CI)
- `yarn format`: format the repository
- `yarn deploy:preview`, then `yarn deploy` after merge: Cloudflare Pages

## Structure

- `src/App.tsx`: layout and route table (`createBrowserRouter`; tests mount the same table in a memory router).
- `src/main.tsx`: providers (API, query client, toasts) and the antd theme from `src/theme.ts`.
- `src/theme.ts`: accessible color overrides for the antd theme.
- `src/pages`: route components; they compose, they do not fetch directly (`InvoiceLoader`: shared loading, not found and error states).
- `src/ui`: reusable components (`src/ui/InvoiceForm`: the invoice form; `src/ui/InvoiceActions`: the finalize, delete and paid actions).
- `src/hooks`: data fetching and shared logic.
- `src/model`: pure TypeScript domain logic (totals, status, URL parameters, invoice form rules), no React.
- `src/helpers`: formatting helpers (amounts, rates, names, addresses).
- `src/api`: API client; `src/api/gen` is generated, do not edit it by hand.
- `src/specs`: test setup and MSW mocks.

## Never commit

- The API token or `.env.local`. The tracked `.env` holds only a placeholder.
- Generated build output (`dist/`).
