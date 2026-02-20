#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# clean-slate.sh — Remove FluTracker reference app and leave a minimal skeleton
#
# This script transforms the template repo from a working FluTracker demo into
# a clean starting point for your own full-stack application. All AI agent
# infrastructure (skills, workflows, devcontainer, CI) is preserved.
#
# Usage:  bash scripts/clean-slate.sh
# ──────────────────────────────────────────────────────────────────────────────

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARKER="$REPO_ROOT/.clean-slate"

# ── Guard: prevent double-execution ──────────────────────────────────────────
if [[ -f "$MARKER" ]]; then
  echo "clean-slate.sh has already been run (marker file exists: .clean-slate)."
  echo "Delete .clean-slate if you really want to run it again."
  exit 0
fi

# ── Confirmation prompt ──────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "  CLEAN SLATE"
echo "============================================================"
echo ""
echo "This will PERMANENTLY DELETE all FluTracker application code"
echo "and replace it with a minimal skeleton. AI agent tooling"
echo "(skills, workflows, devcontainer, CI) will be preserved."
echo ""
echo "Files that will be deleted include:"
echo "  - backend/app/routers/, services/, data/, schemas, etc."
echo "  - frontend/src/pages/, components/, hooks/, utils/, etc."
echo "  - All FluTracker-specific tests"
echo "  - PROJECT_SPECIFICATION.md, railway.toml"
echo ""
printf "Type 'yes' to continue: "
read -r CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "Starting clean slate..."
echo ""

# ══════════════════════════════════════════════════════════════════════════════
# Phase 1: Delete FluTracker files
# ══════════════════════════════════════════════════════════════════════════════
echo "Phase 1: Removing FluTracker files..."

# Root level
rm -f "$REPO_ROOT/PROJECT_SPECIFICATION.md"
rm -f "$REPO_ROOT/railway.toml"
rm -f "$REPO_ROOT/test.db"
rm -f "$REPO_ROOT/.coverage"

# Backend app code
rm -f "$REPO_ROOT/backend/app/schemas.py"
rm -f "$REPO_ROOT/backend/app/scheduler.py"
rm -f "$REPO_ROOT/backend/app/population.py"
rm -f "$REPO_ROOT/backend/app/utils.py"
rm -rf "$REPO_ROOT/backend/app/data"
rm -rf "$REPO_ROOT/backend/app/routers"
rm -rf "$REPO_ROOT/backend/app/services"

# Backend migrations and artifacts
rm -rf "$REPO_ROOT/backend/migrations"
rm -f "$REPO_ROOT/backend/test.db"
rm -f "$REPO_ROOT/backend/.coverage"

# Backend tests (delete all test files — skeleton recreates the ones we need)
rm -f "$REPO_ROOT/backend/tests/test_api_cases.py"
rm -f "$REPO_ROOT/backend/tests/test_api_genomics.py"
rm -f "$REPO_ROOT/backend/tests/test_api_anomalies.py"
rm -f "$REPO_ROOT/backend/tests/test_api_forecast.py"
rm -f "$REPO_ROOT/backend/tests/test_api_health.py"
rm -f "$REPO_ROOT/backend/tests/test_api_rate_limit.py"
rm -f "$REPO_ROOT/backend/tests/test_config.py"
rm -f "$REPO_ROOT/backend/tests/test_flunet.py"
rm -f "$REPO_ROOT/backend/tests/test_models.py"
rm -f "$REPO_ROOT/backend/tests/test_per_100k.py"
rm -f "$REPO_ROOT/backend/tests/test_scheduler.py"
rm -f "$REPO_ROOT/backend/tests/test_schemas.py"
rm -f "$REPO_ROOT/backend/tests/test_service_anomaly.py"
rm -f "$REPO_ROOT/backend/tests/test_service_forecast.py"
rm -f "$REPO_ROOT/backend/tests/test_service_nextstrain.py"

# Frontend source
rm -rf "$REPO_ROOT/frontend/src/pages"
rm -rf "$REPO_ROOT/frontend/src/components"
rm -rf "$REPO_ROOT/frontend/src/hooks"
rm -rf "$REPO_ROOT/frontend/src/utils"
rm -rf "$REPO_ROOT/frontend/src/__tests__"
rm -f "$REPO_ROOT/frontend/src/api.js"

# Frontend E2E
rm -f "$REPO_ROOT/frontend/e2e/dashboard.spec.js"

# Frontend build artifacts
rm -rf "$REPO_ROOT/frontend/dist"
rm -rf "$REPO_ROOT/frontend/test-results"
rm -f "$REPO_ROOT/frontend/.coverage"

# Unwind logs — clear contents, add .gitkeep
rm -f "$REPO_ROOT/unwind/"*.md
touch "$REPO_ROOT/unwind/.gitkeep"

# Dependency artifacts
rm -rf "$REPO_ROOT/frontend/node_modules"
rm -f "$REPO_ROOT/frontend/package-lock.json"
find "$REPO_ROOT/backend" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

echo "  Done."

# ══════════════════════════════════════════════════════════════════════════════
# Phase 2: Create skeleton files
# ══════════════════════════════════════════════════════════════════════════════
echo "Phase 2: Creating skeleton files..."

# ── backend/app/main.py ──────────────────────────────────────────────────────
cat > "$REPO_ROOT/backend/app/main.py" << 'PYEOF'
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine
from app.models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="My App", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
PYEOF

# ── backend/app/models.py ───────────────────────────────────────────────────
cat > "$REPO_ROOT/backend/app/models.py" << 'PYEOF'
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Add your SQLAlchemy models here, e.g.:
#
# from sqlalchemy import Column, Integer, String
#
# class Item(Base):
#     __tablename__ = "items"
#     id = Column(Integer, primary_key=True, autoincrement=True)
#     name = Column(String(200), nullable=False)
PYEOF

# ── backend/app/config.py ───────────────────────────────────────────────────
cat > "$REPO_ROOT/backend/app/config.py" << 'PYEOF'
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    model_config = {"extra": "ignore"}

    @property
    def async_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()
PYEOF

# ── backend/tests/conftest.py ───────────────────────────────────────────────
cat > "$REPO_ROOT/backend/tests/conftest.py" << 'PYEOF'
"""
Shared fixtures for backend tests.

Uses an in-memory SQLite database so tests run without a real PostgreSQL instance.
"""

import os

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite+aiosqlite:///file:test?mode=memory&cache=shared&uri=true",
)

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models import Base

TEST_DB_URL = "sqlite+aiosqlite:///file:test?mode=memory&cache=shared&uri=true"

engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test, drop them after."""
    import sys

    # Patch async_session in the database module
    mod = sys.modules.get("app.database")
    original = None
    if mod and hasattr(mod, "async_session"):
        original = getattr(mod, "async_session")
        setattr(mod, "async_session", TestSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    if original is not None and mod:
        setattr(mod, "async_session", original)


@pytest_asyncio.fixture
async def db_session():
    """Provide a clean database session for direct DB tests."""
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    """Async HTTPX client wired to the FastAPI app with test DB."""
    from app.main import app as fastapi_app

    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
PYEOF

# ── backend/tests/test_api_health.py ────────────────────────────────────────
cat > "$REPO_ROOT/backend/tests/test_api_health.py" << 'PYEOF'
"""Tests for the /api/health endpoint."""

import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_schema(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) == {"status"}
    assert isinstance(data["status"], str)
    assert data["status"] == "ok"
PYEOF

# ── frontend/src/App.jsx ────────────────────────────────────────────────────
mkdir -p "$REPO_ROOT/frontend/src/__tests__"
mkdir -p "$REPO_ROOT/frontend/e2e"

cat > "$REPO_ROOT/frontend/src/App.jsx" << 'JSXEOF'
import React, { useEffect, useState } from 'react'

export default function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth('error'))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'var(--font-display)' }}>
      <h1 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
        Your App Name
      </h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        API: {health ?? 'loading...'}
      </p>
    </div>
  )
}
JSXEOF

# ── frontend/src/__tests__/App.test.jsx ─────────────────────────────────────
cat > "$REPO_ROOT/frontend/src/__tests__/App.test.jsx" << 'JSXEOF'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App'

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({ status: 'ok' }) })
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('renders app title', async () => {
  render(<App />)
  expect(screen.getByText('Your App Name')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByText('API: ok')).toBeInTheDocument())
})
JSXEOF

# ── frontend/e2e/app.spec.js ────────────────────────────────────────────────
cat > "$REPO_ROOT/frontend/e2e/app.spec.js" << 'JSEOF'
import { expect, test } from '@playwright/test'

test('shows app title and healthy API status', async ({ page }) => {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    })
  })

  await page.goto('/')

  await expect(page.getByText('Your App Name')).toBeVisible()
  await expect(page.getByText('API: ok')).toBeVisible()
})
JSEOF

# ── frontend/index.html ─────────────────────────────────────────────────────
cat > "$REPO_ROOT/frontend/index.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        --bg-deepest: #05060b;
        --bg-deep: #090a12;
        --bg-surface: #0d0f19;
        --bg-card: #111320;
        --bg-elevated: #181b2c;
        --text-primary: #e8eaf2;
        --text-secondary: #a0a6c0;
        --text-muted: #6e7498;
        --font-display: 'Plus Jakarta Sans', sans-serif;
        --font-mono: 'JetBrains Mono', monospace;
      }

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: var(--font-display);
        background-color: var(--bg-deepest);
        color: var(--text-primary);
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
      }

      #root { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
HTMLEOF

echo "  Done."

# ══════════════════════════════════════════════════════════════════════════════
# Phase 3: Update dependency files
# ══════════════════════════════════════════════════════════════════════════════
echo "Phase 3: Updating dependency files..."

# ── backend/requirements.txt ─────────────────────────────────────────────────
cat > "$REPO_ROOT/backend/requirements.txt" << 'EOF'
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
httpx==0.28.1
pydantic-settings==2.7.0
pytest==8.3.4
pytest-asyncio==0.24.0
aiosqlite==0.20.0
pytest-cov==6.0.0
EOF

# ── frontend/package.json ────────────────────────────────────────────────────
cat > "$REPO_ROOT/frontend/package.json" << 'EOF'
{
  "name": "frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint .",
    "e2e": "playwright test"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@playwright/test": "^1.58.2",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.0.0",
    "eslint-plugin-import-x": "^4.0.0",
    "eslint-plugin-react": "^7.37.0",
    "globals": "^15.0.0",
    "jsdom": "^25.0.1",
    "vite": "^6.0.3",
    "@vitest/coverage-v8": "^2.1.8",
    "vitest": "^2.1.8"
  }
}
EOF

echo "  Done."

# ══════════════════════════════════════════════════════════════════════════════
# Phase 4: Update configuration files
# ══════════════════════════════════════════════════════════════════════════════
echo "Phase 4: Updating configuration..."

# ── .env.example ─────────────────────────────────────────────────────────────
cat > "$REPO_ROOT/.env.example" << 'EOF'
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppass
POSTGRES_DB=appdb
DATABASE_URL=postgresql://appuser:apppass@db:5432/appdb

# Frontend API base:
# - Leave empty to use same-origin /api (nginx proxy mode)
# - Set to backend origin for static frontend hosting
VITE_API_URL=

# Used by nginx to proxy /api requests to the backend service
BACKEND_URL=http://backend:8000
EOF

# ── .env (regenerate from example) ───────────────────────────────────────────
cat > "$REPO_ROOT/.env" << 'EOF'
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppass
POSTGRES_DB=appdb
DATABASE_URL=postgresql://appuser:apppass@db:5432/appdb

VITE_API_URL=
BACKEND_URL=http://backend:8000
EOF

# ── GEMINI.md ────────────────────────────────────────────────────────────────
cat > "$REPO_ROOT/GEMINI.md" << 'EOF'
# Gemini CLI Context

You are working on a full-stack application (FastAPI + React + PostgreSQL).

## Project References

- See `README.md` for architecture, local setup, and useful commands
- See `AGENTS.md` for available skills and multi-agent workflow conventions

## Skills

Skill instructions are stored in `skills/<name>/SKILL.md`. See AGENTS.md for the
full list of available skills with descriptions and trigger rules.

@AGENTS.md
EOF

# ── backend/pytest.ini ───────────────────────────────────────────────────────
cat > "$REPO_ROOT/backend/pytest.ini" << 'EOF'
[pytest]
asyncio_mode = auto
asyncio_default_fixture_loop_scope = function
testpaths = tests
addopts = --cov=app --cov-report=term-missing --cov-fail-under=50
EOF

# ── frontend/vite.config.js (lower coverage thresholds) ─────────────────────
cat > "$REPO_ROOT/frontend/vite.config.js" << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/__tests__/**'],
      thresholds: {
        lines: 0,
        branches: 0,
        functions: 0,
        statements: 0,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
EOF

echo "  Done."

# ══════════════════════════════════════════════════════════════════════════════
# Phase 5: Marker file
# ══════════════════════════════════════════════════════════════════════════════
echo "Phase 5: Writing marker file..."

echo "clean-slate.sh completed at $(date -u '+%Y-%m-%dT%H:%M:%SZ')" > "$MARKER"

echo "  Done."

# ══════════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "============================================================"
echo "  CLEAN SLATE COMPLETE"
echo "============================================================"
echo ""
echo "All FluTracker code has been removed. You now have a minimal"
echo "FastAPI + React + PostgreSQL skeleton with all AI agent"
echo "infrastructure intact."
echo ""
echo "Next steps:"
echo ""
echo "  1. Install frontend dependencies:"
echo "       cd frontend && npm install && cd .."
echo ""
echo "  2. Build and start the stack:"
echo "       docker compose up --build"
echo ""
echo "  3. Visit http://localhost to see your app"
echo "     Visit http://localhost:8000/api/health to verify the API"
echo ""
echo "  4. Commit when you're ready:"
echo "       git add -A && git commit -m 'Clean slate: remove reference app'"
echo ""
echo "Happy building!"
echo ""
