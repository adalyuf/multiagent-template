---
name: run-tests
description: Run the backend and frontend test suites inside their respective Docker containers and report results. Use when asked to run tests, verify a fix, or check that nothing is broken.
---

# Run Tests

## Overview

Execute the backend and frontend test suites inside their running Docker
containers and report a clear pass/fail summary for each.

## Preconditions

- The Docker containers must be running. Verify with `docker compose ps`.
- If the containers are not running, start them: `docker compose up -d`.
- Run all commands from `/workspace` (the repo root where `docker-compose.yml` lives).

## Workflow

### 1. Check containers are up

```bash
docker compose ps
```

- Confirm `backend` and `frontend` services show as running.
- If either is missing, run `docker compose up -d <service>` before proceeding.

### 2. Run backend tests

```bash
docker compose exec backend pytest
```

- pytest discovers and runs all tests under `/app/tests` inside the container.
- Capture the exit code and the summary line (e.g. `5 passed`, `2 failed`).
- If specific test files or markers are needed, append them:
  - Single file: `docker compose exec backend pytest tests/test_api_health.py`
  - Marker: `docker compose exec backend pytest -m <marker>`

### 3. Run frontend tests

```bash
docker compose exec frontend npm test
```

- Runs `vitest run` (non-interactive, exits after one pass).
- Capture the exit code and the summary line (e.g. `✓ 12 tests passed`).
- If only a subset is needed, append a filename or test-name pattern:
  - `docker compose exec frontend npm test -- <pattern>`

### 4. Report results

Summarise both suites clearly:

```
Backend:  <N passed, M failed> — <exit code 0/1>
Frontend: <N passed, M failed> — <exit code 0/1>
```

- If either suite fails, list each failing test name and its error message.
- Do not truncate failure output; include enough detail for diagnosis.

## Guardrails

- Always run tests inside the containers, never directly on the host.
- Do not modify test files or source code as part of running tests.
- If a container is unhealthy or crashes during the test run, report the
  container logs (`docker compose logs <service>`) rather than retrying blindly.
- Record the full exit code for each suite; exit code 0 means all tests passed.
