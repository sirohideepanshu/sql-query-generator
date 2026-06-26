# SQL Query Generator

An AI-powered Natural Language → SQL assistant. It translates plain-English questions
into SQL, assesses safety/risk, and executes queries against your PostgreSQL or MySQL
database — with transactional commit/rollback for write queries.

- **Backend** — Python, FastAPI, SQLAlchemy. Uses Google Gemini for NL→SQL and SQLGlot
  for safety checks. (Copied from [UjjwalSharma0112/sql-assist](https://github.com/UjjwalSharma0112/sql-assist).)
- **Frontend** — Vite + React + TypeScript + Tailwind CSS. Built fresh against the backend's
  `/api/v1` REST API.

---

## Project layout

```
backend/    FastAPI service (NL→SQL, schema extraction, execution)
frontend/   Vite + React + TS single-page app
```

## 1. Backend

Requires Python 3.13+ and [uv](https://github.com/astral-sh/uv).

```bash
cd backend
cp .env.example .env          # then set SECRET_KEY and GEMINI_API_KEY
uv sync
uv run uvicorn app.main:app --reload
```

API runs at `http://localhost:8000` (interactive docs at `/docs`).
Required `.env` values:
- `SECRET_KEY` — random string for signing JWTs
- `GEMINI_API_KEY` — Google Gemini API key (for query generation)
- `DATABASE_URL` — app database (defaults to SQLite: `sqlite:///data/users.db`)

## 2. Frontend

Requires Node.js 18+.

```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

The frontend talks to `http://localhost:8000/api/v1` by default. To point at a different
backend, copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.

Other scripts:
- `npm run build` — type-check + production build
- `npm run typecheck` — type-check only

---

## Demo database (sample data to query)

A ready-made PostgreSQL e-commerce database (`customers`, `products`, `orders`,
`order_items`) is included so you have something to query immediately.

Create it (requires a running local PostgreSQL):

```bash
bash backend/scripts/setup_demo_db.sh
```

Then add it as a **Project** in the app (or via the Projects page) with:

| Field | Value |
|-------|-------|
| Type | postgres |
| Host | 127.0.0.1 |
| Port | 5432 |
| Database | sqlassist_demo |
| Username | sqlassist |
| Password | sqlassist123 |

Example questions to try in the chat: *"Top customers by total spend"*,
*"Which products are out of stock?"*, *"How many orders were placed this month, by status?"*

## How it works

1. **Connect a database** — add PostgreSQL/MySQL credentials in *Projects*. The backend
   tests the connection and extracts schema metadata (tables, columns, keys).
2. **Ask in plain English** — in the project playground, type a question. Gemini generates
   a primary SQL query plus alternatives; SQLGlot flags dangerous operations.
3. **Review & run** — edit the SQL, run it, and inspect results. Write queries run inside a
   transaction so you can **Commit** or **Rollback**.
4. **History** — every generated/executed query is saved per project.

## Frontend pages

| Route | Purpose |
|-------|---------|
| `/login`, `/signup` | Authentication (JWT stored in localStorage) |
| `/dashboard` | Workspace stats |
| `/projects` | List / create / test-connect / delete database projects |
| `/projects/:id` | Schema browser + NL→SQL playground + execution |
| `/history` | Past queries per project |
