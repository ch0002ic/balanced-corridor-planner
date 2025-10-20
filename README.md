# PSA Code Sprint – TCW Academy Smart Port Simulator

## Overview

This repository contains the full-featured smart port operations simulator used during the PSA Code Sprint. The core of the project is a Python planning and operations engine that coordinates quay cranes, yard cranes, horizontal transport (HT) fleets, and yard capacity limits over a 20 000-job discharge and load scenario. Optional Vite/TypeScript UI assets are included for visualisation, but the canonical execution path is the Python command-line interface.

Key capabilities:

- Genetic-algorithm-based yard planner with feature toggles (`JOB_PLANNER_FEATURES`) for bias, diversity pressure, and lookahead penalties.
- Hard enforcement of the 700 DI-container per yard capacity rule with soft penalties to keep the search space well behaved.
- Deterministic time stepping and export of full job lifecycle metrics to `data/output.csv` and structured logs in `logs/`.
- Optional Node/Express adapter to serve the CLI over HTTP for browser integrations.

## Repository Layout

```
├── cli.py                    # Legacy CLI entry point (kept for Node server compatibility)
├── simulation_runner.py      # Recommended full-engine CLI (imports src.simulation.Simulation)
├── data/
│   ├── input.csv             # Scenario definition (20k jobs)
│   └── output.csv            # Latest simulation results (generated)
├── logs/                     # Timestamped planner/operator logs
├── src/
│   ├── plan/job_planner.py   # GA yard planner with capacity enforcement
│   ├── plan/job_tracker.py   # Job status orchestration
│   ├── operate/engine.py     # HT/QC/Yard operator scheduler
│   ├── simulation.py         # High-level Simulation orchestration
│   └── ui/, api/, *.ts       # Optional front-end hooks
├── server/index.js           # Express wrapper that shells out to the CLI
├── package.json              # Vite dev server scripts (front-end optional)
└── requirements.txt          # Python dependencies (see notes below)
```

## Prerequisites

- Python 3.11 (or newer 3.10+ build) with `pip`
- Recommended: a virtual environment (`python -m venv .venv`)
- Node.js 18 LTS (optional, only required for the web UI or Express adapter)

### Python packages

Install the runtime dependencies into your environment. The `requirements.txt` keeps the HTTP adapter minimal, so install the simulation packages explicitly:

```bash
pip install -r requirements.txt pandas logzero
```

Optional developer tooling (formatters, notebooks) is commented out in `requirements.txt`; add the ones you need.

### Node packages (optional UI/backend)

If you plan to run the Vite UI or the Express upload proxy, install the JavaScript dependencies:

```bash
npm install
```

## Running the Simulation (CLI)

1. Place your job manifest at `data/input.csv`. The default file contains the full challenge scenario.
2. Activate your Python environment and ensure dependencies are installed.
3. Run the full engine using `simulation_runner.py`:

```bash
python simulation_runner.py
```

The runner streams progress to stdout, writes a detailed planner log to `logs/`, and saves the job completion report to `data/output.csv` once all jobs finish or a deadlock is detected.

### Planner feature toggles

The genetic planner exposes several guarded heuristics. Enable them by setting `JOB_PLANNER_FEATURES` before invoking the CLI. Separate feature flags with commas:

```bash
export JOB_PLANNER_FEATURES=ga_diversity,ht_future_penalty
python simulation_runner.py
```

Available flags:

- `ga_diversity` – maintains GA population diversity via adaptive mutation.
- `ht_future_penalty` – penalises assignments likely to starve specific corridors later in the plan.
- `dynamic_corridor_bias` – gradually biases yard selection by east/west utilisation history.
- `path_cache` – enables cached pathfinding for repeated yard/QC hops.

The current best-performing configuration during code sprint validation was `ga_diversity,ht_future_penalty`, which achieved 1 139 820 s while satisfying the DI yard cap.

### Outputs

- `data/output.csv` – per-job record including assigned yard, HT, start/end timestamps, and QC sequencing.
- `logs/*.log` – timestamped planner/operator logs (rolling). Each CLI run appends a new log file.
- stdout – progress JSON snapshots that can be piped into dashboards.

## Optional Web UI / HTTP Adapter

To interact with the simulator from a browser:

1. Start the Express server (provides REST endpoints and shells out to `cli.py`).

   ```bash
   npm run server
   ```

   The server listens on `http://localhost:3001` and exposes `/api/upload`, `/api/simulation/start`, `/api/simulation/status`, and `/api/simulation/logs`.

2. In a second terminal, launch the Vite front-end:

   ```bash
   npm run dev
   ```

   Access `http://localhost:5173` to upload CSVs, start/stop the simulation, and observe live logs.

> **Note:** The Express adapter currently executes `cli.py`. If you want the UI to leverage the full engine with GA planning and pandas-backed metrics, update `server/index.js` to call `simulation_runner.py` instead.

## Troubleshooting

- **`ModuleNotFoundError: No module named 'pandas'`** – install the optional simulation dependencies with `pip install pandas logzero`.
- **Simulation exits with "input.csv not found"** – ensure a valid CSV exists at `data/input.csv` before starting the CLI.
- **Deadlock detected** – the planner stopped because no HT completed work for the configured threshold; inspect the most recent file in `logs/` to review HT/QC activity.
- **Express server cannot spawn Python** – confirm `python3` is on your PATH or edit `server/index.js` to point at your virtual environment’s interpreter.
- **Front-end status polling times out** – check that the Express server was started first and that CORS is not blocked by firewalls or browser extensions.

## Contributing

- Planner heuristics live in `src/plan/job_planner.py`. Each helper is documented; add brief inline comments when introducing complex logic.
- Keep new assets ASCII-only unless the file already uses non-ASCII symbols.
- When adding new CLI options, document them in this README and ensure defaults maintain deterministic runs for benchmarking.

## License

Internal project for TCW Academy hackathon use. Contact the maintainers before distributing externally.
