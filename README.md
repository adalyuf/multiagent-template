# FluTracker

FluTracker is a global influenza surveillance dashboard with a FastAPI backend, React frontend, and PostgreSQL database.

It combines:
- WHO FluNet case data (`https://xmart-api-public.who.int/FLUMART/VIW_FNT`)
- Nextstrain influenza genomic data (`/flu/seasonal/h3n2/ha/12y` dataset)

The UI provides an at-a-glance dashboard for case trends, maps, subtype/clade trends, alerts, and country-level summaries.

## Tech stack

- Backend: FastAPI, SQLAlchemy (async), APScheduler
- Frontend: React + Vite
- Database: PostgreSQL 16
- Infra: Docker Compose (local), Railway config present (`railway.toml`)

## Architecture

High-level flow:
1. Backend startup initializes tables and background scheduler jobs.
2. Ingestion jobs pull FluNet and Nextstrain data into PostgreSQL.
3. API routers expose aggregated datasets (`/api/cases/*`, `/api/genomics/*`, `/api/anomalies`, `/api/forecast`).
4. Frontend consumes `/api` and renders dashboard + genomics views.

Key backend modules:
- `backend/app/main.py`: FastAPI app, CORS, rate limiting, router registration
- `backend/app/scheduler.py`: recurring ingestion, anomaly detection, daily rebuild
- `backend/app/services/flunet.py`: FluNet ingestion/parsing/upsert
- `backend/app/services/nextstrain.py`: Nextstrain ingestion/parsing/upsert

Key frontend modules:
- `frontend/src/App.jsx`: route setup (`/`, `/genomics`)
- `frontend/src/pages/Dashboard.jsx`: primary dashboard
- `frontend/src/pages/Genomics.jsx`: genomics dashboard
- `frontend/src/api.js`: API base URL resolution (`VITE_API_URL` or same-origin `/api`)

## Run locally (Docker Compose)

### 1. Configure environment

```bash
cp .env.example .env
```

Default `.env.example` values are already suitable for local Docker Compose.

### 2. Build and start

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost` (port 80)
- Backend API: `http://localhost:8000`
- Postgres: `localhost:5432`

### 3. Stop

```bash
docker compose down
```

To also remove DB volume data:

```bash
docker compose down -v
```

## Run locally (manual, without Docker)

Prereqs:
- Python 3.12+
- Node 20+
- PostgreSQL 16 running locally

### 1. Database setup

Create a local database and set `DATABASE_URL` (example):

```bash
export DATABASE_URL=postgresql://flutracker:flutracker@localhost:5432/flutracker
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend

In another terminal:

```bash
cd frontend
npm install
export VITE_API_URL=http://localhost:8000
npm run dev -- --host 0.0.0.0 --port 5173
```

Open `http://localhost:5173`.

## Multi-agent development workflow

This repo uses skill-driven agent workflows (see `skills/` and `AGENTS.md`) with label-based coordination.

Common labels:
- `assigned:codex` / `assigned:claude`: ownership
- `needs-review`: ready for peer agent review
- `needs:changes`: review requested changes
- `reviewed:approved`: review completed and approved
- `agent-task`: issue intended for agent execution

Typical lifecycle:
1. Issue is labeled and assigned to one agent.
2. Agent creates a task branch/worktree, implements, and opens PR.
3. PR/issue are labeled `needs-review`.
4. Peer agent reviews and either:
- approves/merges (`reviewed:approved`)
- requests updates (`needs:changes`)
5. Original agent addresses feedback and re-labels for review.

## Useful commands

Run backend tests:

```bash
cd backend
pytest
```

Run frontend tests:

```bash
cd frontend
npm test
```

Check Codex/Claude skill parity:

```bash
./scripts/check-skill-parity.sh
```

Build frontend:

```bash
cd frontend
npm run build
```
