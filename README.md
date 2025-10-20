# Balanced Corridor Planner

An end-to-end horizontal transport (HT) planner that combines a Python
simulation core with a Vite/TypeScript interface and lightweight Node.js API
helpers. The planner enforces a 700 DI-job yard cap, exposes feature toggles for
optimisation experiments, and ships with archived artefacts for reproducible
benchmarks.

## Project Layout

- `src/` – Python simulation engine (planning and operations modules)
- `data/`, `logs/` – Input data and run artefacts for CLI/GUI execution
- `server/`, `public/` – Node/Vite scaffolding for the web experience
- `cli.py`, `gui.py` – Entry points for headless and GUI-driven simulation runs
- `archives/` – Stored results, sweep summaries, and best-run outputs

## Prerequisites

- Python 3.11+
- Node.js 18+

## Environment Setup

### Python

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Node.js

```bash
npm install
```

## Running The Planner

### Web Workflow

1. In one terminal, start the backend helpers:
   ```bash
   npm run server
   ```
   Backend runs on `http://localhost:3001`.
2. In a second terminal, launch the Vite frontend:
   ```bash
   npm run dev
   ```
   Open the printed `http://localhost:5173` URL to control simulations from the
   browser.

### Python CLI

- Default run:
  ```bash
  python cli.py
  ```
- Best performing configuration (1,139,820 s, DI max 687):
  ```bash
  JOB_PLANNER_FEATURES=ga_diversity,ht_future_penalty python cli.py
  ```

### Python GUI

```bash
python gui.py
```

## Feature Toggles

`JOB_PLANNER_FEATURES` accepts a comma-separated list of tokens:

```
dynamic_corridor_bias, ga_diversity, ht_future_penalty, path_cache
```

Flags not supplied remain disabled. Prefix a token with `!` to force-disable it
within a preset.

## Reproducing Experiments

1. Run the sweep helper (Python 3.11+):
   ```bash
   python - <<'PY'
   # replicate the sweep from archives/2025-10-18_ga_diversity_ht_future_penalty
   # or adapt the script for new experiments
   PY
   ```
2. Review artefacts in `archives/2025-10-18_ga_diversity_ht_future_penalty/` for
   outputs, logs, and feature mix summaries.

## Validating The DI Cap

```bash
python - <<'PY'
import csv
from collections import Counter

counts = Counter()
with open('data/output.csv') as fh:
    reader = csv.DictReader(fh)
    for row in reader:
        if row['job_type'] == 'DI':
            yard = row['assigned_yard_name'] or row['yard_name']
            counts[yard] += 1

print('Worst-case DI load:', max(counts.values(), default=0))
PY
```

## Integration Notes

- All planner changes reside in `src/plan/job_planner.py`; drop-in compatible
   with the official simulator bundle.
- The engine caches yard utilisation in-memory, so no schema or data migrations
   are required.
- Ensure `data/input.csv` matches your target release when re-running external
   evaluation scripts.

## Support

Ping the engineering team through your usual collaboration channel for
integration help or demo walkthroughs.
