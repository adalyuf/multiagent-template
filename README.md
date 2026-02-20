# Full-Stack App Template

A production-ready template for building full-stack applications with **FastAPI**, **React**, and **PostgreSQL** — bundled with a complete AI agent development workflow.

Clone this repo, run `docker compose up`, and you have a working app. Run the clean-slate script to remove the reference code and start building your own.

## What's included

| Layer | Technology | Details |
|-------|-----------|---------|
| Backend | FastAPI + SQLAlchemy (async) | Health endpoint, CORS, async PostgreSQL |
| Frontend | React 18 + Vite | Dark-themed UI, hot reload, proxy to backend |
| Database | PostgreSQL 16 | Docker volume, health checks |
| Testing | pytest + Vitest + Playwright | Unit, integration, and E2E with coverage |
| CI/CD | GitHub Actions | Three-job pipeline (backend, frontend, E2E) |
| AI Tooling | Skills + multi-agent workflows | Claude Code, Gemini CLI, Codex support |
| Dev Environment | Dev Container + VS Code settings | One-click cloud/local dev setup |

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

## Project structure (after clean slate)

```
.
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app — add your routers here
│   │   ├── models.py        # SQLAlchemy models — add your tables here
│   │   ├── config.py        # Settings (DATABASE_URL)
│   │   └── database.py      # Async engine + session factory
│   ├── tests/
│   │   ├── conftest.py       # In-memory SQLite test fixtures
│   │   └── test_api_health.py
│   ├── requirements.txt
│   ├── pytest.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main component — build your UI here
│   │   ├── main.jsx          # Entry point
│   │   ├── test/setup.js     # Test setup
│   │   └── __tests__/
│   │       └── App.test.jsx
│   ├── e2e/
│   │   └── app.spec.js       # Playwright E2E test
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── playwright.config.js
│   └── Dockerfile
├── skills/                    # AI agent skill definitions
├── scripts/                   # Utility scripts
├── .claude/                   # Claude Code configuration
├── .gemini/                   # Gemini CLI configuration
├── .github/workflows/         # CI pipelines
├── .devcontainer/             # Dev container setup
├── docker-compose.yml
├── AGENTS.md                  # Multi-agent workflow docs
└── GEMINI.md                  # Gemini CLI context
```

## Building your app

### Add a backend model

Edit `backend/app/models.py`:

```python
from sqlalchemy import Column, Integer, String
from app.models import Base

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
```

Tables are created automatically on startup via the lifespan handler in `main.py`.

### Add an API router

Create `backend/app/routers/items.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session

router = APIRouter()

@router.get("/api/items")
async def list_items(session: AsyncSession = Depends(get_session)):
    # Your query here
    return []
```

Register it in `backend/app/main.py`:

```python
from app.routers import items
app.include_router(items.router)
```

### Add React components

Create components in `frontend/src/components/` and import them in `App.jsx`. The Vite dev server proxies `/api` requests to the backend automatically.

## Running tests

### Backend tests

```bash
cd backend
pip install -r requirements.txt
pytest
```

Tests use an in-memory SQLite database — no PostgreSQL required.

### Frontend unit tests

```bash
cd frontend
npm install
npm test
```

### E2E tests

```bash
# Start the full stack first
docker compose up -d --build

# Run Playwright from the frontend directory
cd frontend
npx playwright test
```

All E2E specs live in `frontend/e2e/`. The `frontend/playwright.config.js` controls test discovery and is what CI uses.

## Run locally (without Docker)

### Prerequisites
- Python 3.12+
- Node 20+
- PostgreSQL 16

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://appuser:apppass@localhost:5432/appdb
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
export VITE_API_URL=http://localhost:8000
npm run dev -- --host 0.0.0.0 --port 5173
```

Open `http://localhost:5173`.

## AI agent workflow infrastructure

This template includes a complete multi-agent development workflow. See `AGENTS.md` for full details.

### Skills

Skill definitions live in `skills/` with symlinks in `.claude/skills/`:

| Skill | Description |
|-------|-------------|
| `build-feature` | Pick an assigned issue, implement it, and open a PR |
| `fix-pr` | Address PR review feedback and re-label for review |
| `issue` | Create a GitHub issue for a feature or bug |
| `review-peer-prs` | Review and approve/request changes on peer PRs |
| `unwind` | End-of-session reflection and discussion |
| `work` | Continuous loop: fix PRs, review peers, build features |

### Supported agents

- **Claude Code** — reads from `.claude/skills/` (symlinks to `skills/`)
- **Gemini CLI** — configured via `GEMINI.md` + `.gemini/settings.json`
- **Codex** — follows `AGENTS.md` conventions

### Adding a new skill

```bash
mkdir -p skills/my-skill
# Write your SKILL.md with instructions
cat > skills/my-skill/SKILL.md << 'EOF'
# My Skill
Instructions for the agent...
EOF

# Symlink for Claude Code
mkdir -p .claude/skills/my-skill
ln -s ../../../skills/my-skill/SKILL.md .claude/skills/my-skill/SKILL.md
```

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
