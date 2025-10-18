# Balanced Corridor Planner (Web App)

Intuitive React application for visualising corridor balancing simulations.

## Getting Started

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in a `.env` file if the backend is not running on `http://localhost:8000`.

## Backend API

The frontend expects the Python API server to be running from the repository root:

```bash
cd ..  # repo root
python -m src.api.app
```

Endpoints exposed by the server:

- `GET /api/metrics` — returns the latest simulation KPIs computed from `data/output.csv`.
- `POST /api/simulations` — launches a new run via `cli.py` with the selected feature flags and archives the results.
- `GET /api/archives` — lists archived runs with downloadable CSV and log file links.

## API Assumptions

- `GET /api/metrics` → `{ latestFinishSeconds: number, maxDIJobs: number, lastRunAt: string }`
- `POST /api/simulations` with `{ features: string[] }` → `{ runId: string, status: "queued" }`
- `GET /api/archives` → `Array<{ runId: string, finishedAt: string, outputUrl: string, logUrl: string }>`

Adjust `src/api/client.ts` if backend endpoints differ.
