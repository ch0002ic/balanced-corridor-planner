# Balanced Corridor Planner (Web App)

A DI-cap-aware genetic algorithm planner that balances yard corridors while pre-selecting future-ready horizontal transports to shorten port completion time.

## Problem Context

Port terminals often breach discharge (DI) caps in specific corridors, creating idle cranes and extended vessel stays. Our planner exposes the live health of each corridor, lets operations teams experiment with algorithmic toggles, and archives every run so lessons learned can be replayed.

## Architecture

- **Frontend**: Vite + React + Tailwind, deployed on Vercel.
- **Backend**: Python WSGI service (`src/api/app.py`) running on Render. It wraps the existing simulation CLI, manages feature flags, and persists outputs to the `archives/` tree.
- **Data flow**: The API reads the latest `data/output.csv` or, if missing, falls back to the freshest archive. Responses are typed in `src/api/client.ts` to keep the UI and service in sync.

## Running Locally

1. Start the backend from the repository root:
   ```bash
   python -m src.api.app
   ```
2. In `balanced-corridor-planner/`, install dependencies and launch the dev server:
   ```bash
   npm install
   npm run dev
   ```
3. Create `balanced-corridor-planner/.env` and set `VITE_API_BASE_URL=http://localhost:8000` if you change ports.

## Feature Overview

- **Overview** page surfaces latest finish time, max DI jobs per yard, and last run timestamp.
- **Feature Toggles** page lets planners queue simulations with combinations such as `dynamic_corridor_bias`, `ga_diversity`, and `ht_future_penalty`.
- **Archives** page lists every completed run with download links for CSV outputs and logs so analysts can audit DI compliance.

## Deployment

1. Render: deploy with `render.yaml`; ensure `PYTHON_VERSION=3.11.9` and the default start command `gunicorn --bind 0.0.0.0:$PORT src.api.app:app`.
2. Vercel: add environment variable `VITE_API_BASE_URL=https://balanced-corridor-planner-api.onrender.com` and redeploy.

Adjust `src/api/client.ts` only if backend endpoints change.
