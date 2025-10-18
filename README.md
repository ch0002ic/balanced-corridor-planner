# PSA CodeSprint 2025: Smart Port Operations – AI for Horizontal Transport Optimisation (Node)

Design an AI-driven scheduling and routing strategy to minimize congestion, balance yard utilization and improve overall efficiency.

## Environment Setup

Before working on the problem, please create a Python virtual environment and install all required dependencies.

If you are familiar with Python environments, you can directly install from `requirements.txt`. Otherwise, follow these step-by-step instructions in your Command Prompt (Windows):

```shell
# Create a Python virtual environment. Here I used Python 3.11.
python -m pip install virtualenv
python -m virtualenv py_env_codesprint
py_env_codesprint\Scripts\activate

# Install pip-tools to manage dependencies
python -m pip install pip-tools

# Compile and synchronize dependencies from requirements.in to requirements.txt
pip-compile -v --rebuild -o requirements.txt --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org
pip-sync requirements.txt

# (Optional) Set up Jupyter kernel for experimenting with notebooks
python -m ipykernel install --user --name=py_env_codesprint_kernel
```

To activate your environment:

```shell
py_env_codesprint\Scripts\activate
```

## Development

To get started, run the simulation with a GUI by executing:

```shell
python gui.py
```

You will see a simulation of the port terminal operations.

### About the Code Base

The simulation consists of two main components:

- **Planning Engine**: Where scheduling and navigating algorithms are implemented.
- **Operation Engine**: Simulates execution of planned jobs.

Your task is to improve the default planning algorithm in the Planning Engine for better performance.

### Project Structure

```
INA_DS_CS/
│
├── data/
│ └── input.csv # Input job details for the planning algorithm
├── logs/       # Log files for each simulation run
├── src/        # Source code
│ └── operate/
│ ├── plan/
| |  └── job_planner.py # Your main implementation goes here!
│ ├── ui/
│ └── utils/
├── cli.py      # Command-line interface entry point
└── gui.py      # GUI interface entry point
```

- `input.csv` contains the job details fed into the planning algorithm.
- `job_planner.py` is the core of the Planning Engine — your modifications should be made here (Search for **YOUR TASK HERE**). Refer to the provided documentation for details on the default algorithm logic.
- `gui.py` runs the simulation with a graphical interface so you can observe and fine-tune your algorithm. You can adjust `number_of_refresh_per_physical_second` in the code to control simulation speed.
- `cli.py` runs the simulation without GUI for faster batch execution. It outputs `output.csv` in the data folder and logs in `logs/`.

### Running the CLI simulation

Run:

```
python cli.py
```

The simulation may take a few minutes. At the end, it will report the total simulation time (e.g., 1,167,610 seconds) — **this is the key metric you need to optimize and reduce**. Note that this is the simulation time when system checks for all job completion condition. A precise time of the last job completion can be found in `end_time` column of `output.csv` file.

### Team Enhancements & How to Reproduce

- Updated `src/plan/job_planner.py` to enforce the Appendix DI yard cap (≤700) while retaining the genetic optimiser. The planner tracks DI allocations per yard and repairs any overflow before dispatch.
- Best-performing feature mix after enforcement is `JOB_PLANNER_FEATURES=ga_diversity,ht_future_penalty`, yielding 1,139,820 s with all yards ≤687 DI jobs.
- All sweep results, the best-run `data/output.csv`, and matching logs live under `archives/2025-10-18_ga_diversity_ht_future_penalty/`.
- Detailed setup and rerun instructions are recorded in `README.txt` alongside this file.

## Submission Guidelines

When you are ready to submit your solution, please prepare the following:

1. YouTube Presentation video explaining your solution.
2. PowerPoint Slides supporting your presentation.
3. Source Code:
   - Modified `job_planner.py` plus any supporting scripts that depend only on `job_planner.py`.
   - Other modifications outside of this are not allowed.
   - Zip these files into Codes_TeamName.zip.
   - Include a `README.txt` describing how to run your code and integrate it into the existing codebase.
4. Simulation Results:
   - `data/output.csv`
   - the latest log file from `logs/` demonstrating your improved results.
5. Team Photos.

---

If you have any questions or need assistance, feel free to reach out. Good luck and happy coding!

## Cloud Deployment Quickstart

The repository now ships with `render.yaml` so you can deploy the Python API on [Render](https://render.com/) in a few clicks:

1. Push your latest code to GitHub (already done).
2. In Render, choose **New ▸ Blueprint** and point it at this repo; Render will detect `render.yaml` and create a web service named `balanced-corridor-planner-api`.
3. On first deploy Render installs `requirements.txt` and starts `gunicorn --bind 0.0.0.0:$PORT src.api.app:app` as defined in the blueprint. Archives and data live on Render's persistent disk, so runs survive restarts.
4. After the service is healthy, note the public URL (e.g. `https://balanced-corridor-planner-api.onrender.com`).
5. In Vercel, add an Environment Variable `VITE_API_BASE_URL` set to that URL (Project ▸ Settings ▸ Environment Variables) and trigger a redeploy; the frontend will now call the cloud API instead of `localhost`.


If you later expose the backend behind the same hostname (e.g. via a reverse proxy on Vercel or Nginx), update `vercel.json` so the `/api/*` path rewrites to that upstream instead of the SPA `index.html`.
