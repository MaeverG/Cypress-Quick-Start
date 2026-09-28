# Cypress Quick Start

Boilerplate Cypress test framework for API + UI integration testing against a real
backend/DB (not mocked). Copy this repo as the starting point for a new service's
test suite, then swap the `todos` example domain for your own.

## Setup

```shell
npm install
cp local.settings.example.json local.settings.json
cp dev.settings.example.json dev.settings.json
cp .env.example .env
```

Fill in `local.settings.json` / `dev.settings.json` with your app's real `baseUrl`,
API base URL, test user credentials, and DB connection details. These files are
gitignored — never commit real credentials.

## Commands

```shell
# Interactive mode
npm run cy:open:local
npm run cy:open:dev

# Headless
npm run cy:run:chrome:local
npm run cy:run:firefox:local

# Filter to a spec, or by tag
npm run cy:run:chrome:local --spec="cypress/e2e/todos/todos-create.cy.ts"
npm run cy:run:chrome:local --greptags="@api"
npm run cy:run:chrome:local --greptags="@api+-@negative"

# Merged HTML report
npm run cy:report
```

## Architecture

### Config (`cypress.config.ts`)

Loads `./${environmentName}.settings.json` at runtime (from `--env environmentName=`,
default `local`) and merges its `baseUrl`/`env` into the Cypress config. Registers
the DB task from `cypress/tasks/index.ts`, `@cypress/grep`, `cypress-terminal-report`,
and the mochawesome reporter. On `after:run`, merges per-spec JSON reports into one
HTML + JUnit report.

### DB access (`cypress/tasks/index.ts`, `cypress/support/database/`)

- `cy.executeQuery(sql)` (defined in `cypress/support/e2e.ts`) is the entry point
  specs/commands use; it calls the `connectDB` task and camelCases the result rows.
- The `connectDB` task caches connections keyed by connection/tunnel params: a plain
  `pg.Pool` for local/ci, or an SSH tunnel (via `ssh2`) + pool for any other
  environment — reused across specs, torn down in `closeDbConnections`.
- `cypress/support/database/queries.ts` holds the actual SQL query builders that
  specs/commands call to seed or assert DB state.

### Commands (`cypress/support/commands/`)

Organized by domain (`auth/`, `todos/`, `ui/`, plus cross-cutting `supportCommands/`).
Within each domain, commands come in pairs:

- `<name>Commands.ts` — the `Cypress.Commands.add(...)` implementation. API commands
  call `cy.sendRequest(...)` and `.as('...Response')` the result; UI commands drive
  the DOM.
- `<name>CommandsDeclarations.ts` — the matching
  `declare global { namespace Cypress { interface Chainable ... } }` augmentation.

`cypress/support/commands/index.ts` auto-loads every file under the tree via
`require.context` — a new command file just needs to exist in the right folder.

### Path aliases (`tsconfig.json`, `baseUrl: ./cypress`)

`@utils/*` → `support/utils/*`, `@/types/*` → `support/types/*`,
`@support/*` → `support/*`, `@commands` → `support/commands/supportCommands/supportCommands`,
`@queries/*` → `support/database/*`.

### Specs (`cypress/e2e/**/*.cy.ts`)

- `describe`/`context` blocks carry tags (`{ tags: ['@ui'|'@api', '@<domain>'] }`,
  and `@positive`/`@negative` on nested contexts) used for `grepTags` filtering.
- API assertions use `cy.spok('@someResponse', { ... })` for shape/value assertions,
  plus shared helpers like `cy.verifyStatusCode`, `cy.verifyFieldIsRequired`.

### Data (`cypress/support/utils/`, `cypress/fixtures/`)

- `support/utils/constants.ts` holds shared, environment-aware constants
  (e.g. `testUsers`, getters backed by `Cypress.env(...)`).
- `support/utils/generateData.ts` builds synthetic data for tests (emails, names,
  unique titles) via `chance`.

## What to replace

- Delete the `todos` example domain (spec, commands, fixture, DB queries) once you've
  copied the pattern for your own service's resources.
- Update `cypress.config.ts`'s `specPattern`/reporter titles if desired.
- Point `local.settings.json`/`dev.settings.json` at your app's real environments.
