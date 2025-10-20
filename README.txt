PSA CodeSprint 2025 - Smart Port Operations
===========================================

Overview
--------
This repository contains our customised Horizontal Transport planner with a hard
700 DI-job yard cap and feature-tunable optimisation. All source edits are
confined to `src/plan/job_planner.py`; supporting assets live under `archives/`
for reproducibility.

Environment Setup
-----------------
1. Create or activate the project virtual environment (Python 3.11+ recommended).
   Example:
       python -m venv .venv
       source .venv/bin/activate
2. Install dependencies:
       pip install -r requirements.txt

How To Run
----------
*Default CLI run*
    python cli.py

*Best-performing configuration (1,139,820 s, DI max 687)*
    JOB_PLANNER_FEATURES=ga_diversity,ht_future_penalty python cli.py

*Optional GUI*
    python gui.py

Feature Toggles
---------------
`JOB_PLANNER_FEATURES` accepts a comma-separated list of the following tokens:
    dynamic_corridor_bias, ga_diversity, ht_future_penalty, path_cache
Flags not supplied remain disabled. Prefix `!` to force-disable inside a preset.

Reproducing Experiments
-----------------------
1. Run the feature sweep helper (requires Python 3.11+):
       python - <<'PY'
       # copy the sweep snippet from archives/2025-10-18_ga_diversity_ht_future_penalty
       # or rerun your own combination script
       PY
2. Best-run artifacts (output and logs) are stored in:
       archives/2025-10-18_ga_diversity_ht_future_penalty/

Verifying Yard Capacity Compliance
----------------------------------
Check that all DI jobs stay within the 700 cap:
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
    print('Worst-case DI load:', max(counts.values()))
    PY

Integration Notes
-----------------
- The planner caches DI yard utilisation in-memory; no schema changes required.
- No migrations or data reformatting are needed—drop `job_planner.py` into any
  clean copy of the official CodeSprint simulator.
- Ensure `data/input.csv` matches the official release; outputs remain compatible.

Support Files
-------------
- Latest best-run job report: `archives/2025-10-18_ga_diversity_ht_future_penalty/output.csv`
- Matching logs: `archives/2025-10-18_ga_diversity_ht_future_penalty/logs/`
- Feature sweep summary: `archives/.../feature_sweep_summary.csv`

Contact
-------
For clarifications or demo support, reach out to the development team via the
CodeSprint communication channel.
