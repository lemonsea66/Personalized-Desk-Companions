# Desktop Companion Agent

Windows-first personal desktop companion. The project is being built in bounded iterations; see [PROJECT_PLAN.md](./PROJECT_PLAN.md) and [docs/iterations](./docs/iterations/README.md).

## Current Status

Iteration 0 prepares the toolchain, repository structure, contracts, and health-check skeleton. It does not implement the pet interaction loop.

## Repository Layout

```text
apps/desktop/          Tauri 2 + React/Vite desktop shell
backend/               FastAPI local service and Python tests
contracts/             Versioned JSON schemas shared by modules
packages/shared-types/ TypeScript mirrors of stable contracts
scripts/               Environment and contract checks
docs/iterations/       Scope-first iteration plans and results
```

## Local Checks

Use the project Python 3.12 environment, not the system Python 3.7:

```powershell
npm run check:contracts
npm run check:frontend
backend\\.venv\\Scripts\\python.exe -m pytest backend/tests
```

The backend health endpoint is intentionally minimal in Iteration 0:

```text
GET http://127.0.0.1:18082/health
GET http://127.0.0.1:18082/api/v1/health
```

## Secrets and User Data

API keys are stored through the future Windows Credential Manager integration. Do not put keys, photos, generated avatars, captures, model weights, runtime databases, or personal paths in Git.

## GitHub

The public repository contains core code, contracts, tests, and documentation only. A GitHub remote is added only after the repository owner provides the target URL or authenticates the GitHub CLI.
