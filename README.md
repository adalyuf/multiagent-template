# Full-Stack App Template

A production-ready template for building full-stack applications with **FastAPI**, **React**, and **PostgreSQL** — bundled with a complete AI agent development workflow.

Clone this repo, run `docker compose up`, and you have a working app. Run the clean-slate script to remove the reference code and start building your own.

## What's included

| Layer           | Technology                       | Details                                      |
| --------------- | -------------------------------- | -------------------------------------------- |
| Backend         | FastAPI + SQLAlchemy (async)     | Health endpoint, CORS, async PostgreSQL      |
| Frontend        | React 18 + Vite                  | Dark-themed UI, hot reload, proxy to backend |
| Database        | PostgreSQL 16                    | Docker volume, health checks                 |
| Testing         | pytest + Vitest + Playwright     | Unit, integration, and E2E with coverage     |
| CI/CD           | GitHub Actions                   | Three-job pipeline (backend, frontend, E2E)  |
| AI Tooling      | Skills + multi-agent workflows   | Claude Code, Gemini CLI, Codex support       |
| Dev Environment | Dev Container + VS Code settings | One-click cloud/local dev setup              |

## Quick start

```bash
# 1. Clone and configure
git clone <this-repo> my-app && cd my-app
cp .env.example .env

# 2. Start everything
docker compose up --build

# 3. Open in browser
#    App:    http://localhost
#    API:    http://localhost:8000/api/health
```

## Clean slate: start your own project

The repo ships with a FluTracker reference application so you can see the full stack working end-to-end. When you're ready to build your own app, run:

```bash
bash scripts/clean-slate.sh
```

This will:

- Remove all FluTracker-specific code (routers, services, components, pages, tests)
- Create minimal skeleton files so `docker compose up` works immediately
- Update dependencies (remove unused packages like D3, APScheduler, etc.)
- Preserve all AI agent infrastructure, CI pipelines, and dev tooling
- Write a `.clean-slate` marker to prevent accidental re-execution

After running the script:

```bash
cd frontend && npm install && cd ..
docker compose up --build
```

You'll see a minimal app with "Your App Name" and a health check indicator.

## AI agent workflow infrastructure

This template includes a complete multi-agent development workflow. See `AGENTS.md` for full details.

### Skills

Skill definitions live in `skills/` with symlinks in `.claude/skills/`:

| Skill             | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `build-feature`   | Pick an assigned issue, implement it, and open a PR    |
| `fix-pr`          | Address PR review feedback and re-label for review     |
| `issue`           | Create a GitHub issue for a feature or bug             |
| `review-peer-prs` | Review and approve/request changes on peer PRs         |
| `unwind`          | End-of-session reflection and discussion               |
| `work`            | Continuous loop: fix PRs, review peers, build features |

### Supported agents

- **Claude Code** — reads from `.claude/skills/` (symlinks to `skills/`)
- **Gemini CLI** — configured via `GEMINI.md` + `.gemini/settings.json`
- **Codex** — follows `AGENTS.md` conventions

## Multi-agent coordination

Label-based workflow on GitHub:

- `assigned:codex` / `assigned:claude` — ownership
- `needs-review` — ready for peer agent review
- `needs:changes` — review requested changes
- `reviewed:approved` — review completed and approved
- `agent-task` — issue intended for agent execution

Typical lifecycle:

1. Issue is labeled and assigned to an agent
2. Agent creates a branch, implements, and opens a PR
3. PR is labeled `needs-review`
4. Peer agent reviews and either approves or requests changes
5. Original agent addresses feedback and re-labels

## Terminal setup

Run `/terminal-setup` in Claude Code to enable **Shift+Enter** for newlines in the terminal. This lets you write multi-line prompts without submitting on Enter.

## Useful commands

```bash
# Run backend tests
cd backend && pytest

# Run frontend tests
cd frontend && npm test

# Run E2E tests (stack must be running)
docker compose up -d --build
cd frontend && npx playwright test

# Build frontend
cd frontend && npm run build

# Stop everything
docker compose down

# Stop and remove database volume
docker compose down -v
```
