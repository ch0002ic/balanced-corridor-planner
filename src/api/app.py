from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Iterable, List, Optional, Tuple

import pandas as pd

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
ARCHIVES_DIR = ROOT_DIR / "archives"
LOGS_DIR = ROOT_DIR / "logs"
KNOWN_FEATURES = {
    "dynamic_corridor_bias",
    "ga_diversity",
    "ht_future_penalty",
    "path_cache",
}

_executor = ThreadPoolExecutor(max_workers=1)
_run_status: Dict[str, str] = {}
_status_lock = Lock()


class HTTPError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def _status_text(status: int) -> str:
    mapping = {
        200: "OK",
        201: "Created",
        202: "Accepted",
        204: "No Content",
        400: "Bad Request",
        404: "Not Found",
        409: "Conflict",
        500: "Internal Server Error",
    }
    return mapping.get(status, "OK")


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")


def _cors_headers() -> List[Tuple[str, str]]:
    return [
        ("Access-Control-Allow-Origin", "*"),
        ("Access-Control-Allow-Methods", "GET,POST,OPTIONS"),
        ("Access-Control-Allow-Headers", "Content-Type"),
    ]


def _normalise_features(features: Iterable[str]) -> List[str]:
    unique: List[str] = []
    for feature in features:
        name = feature.strip().lower()
        if name and name in KNOWN_FEATURES and name not in unique:
            unique.append(name)
    return unique


def _build_run_id(features: List[str]) -> str:
    feature_suffix = "baseline" if not features else "+".join(features)
    return f"{_timestamp()}_{feature_suffix}"


def _set_run_status(run_id: str, status: str) -> None:
    with _status_lock:
        _run_status[run_id] = status


def _get_run_status(run_id: str) -> Optional[str]:
    with _status_lock:
        return _run_status.get(run_id)


def _metrics_from_output(output_path: Path) -> Dict[str, object]:
    if not output_path.exists():
        raise HTTPError(404, "No simulation output available.")

    df = pd.read_csv(output_path)
    latest_finish = int(df["end_time"].max()) if not df.empty else 0
    di_jobs = df[df["job_type"] == "DI"]
    if di_jobs.empty:
        max_di_jobs = 0
    else:
        yard_counts = di_jobs.groupby("assigned_yard_name")["job_ID"].count()
        max_di_jobs = int(yard_counts.max()) if not yard_counts.empty else 0

    modified = datetime.fromtimestamp(output_path.stat().st_mtime, tz=timezone.utc)
    return {
        "latestFinishSeconds": latest_finish,
        "maxDIJobs": max_di_jobs,
        "lastRunAt": modified.isoformat(),
    }


def _archive_metadata(run_dir: Path) -> Optional[Dict[str, object]]:
    if not run_dir.is_dir():
        return None

    output_path = run_dir / "output.csv"
    if not output_path.exists():
        return None

    metrics = _metrics_from_output(output_path)
    logs_root = run_dir / "logs"
    log_file: Optional[Path] = None
    if logs_root.exists():
        log_candidates = [p for p in logs_root.glob("*.log") if p.is_file()]
        if log_candidates:
            log_file = max(log_candidates, key=lambda p: p.stat().st_mtime)

    return {
        "runId": run_dir.name,
        "finishedAt": metrics["lastRunAt"],
        "latestFinishSeconds": metrics["latestFinishSeconds"],
        "maxDIJobs": metrics["maxDIJobs"],
        "hasLogs": log_file is not None,
    }


def _json_response(status: int, payload: Any) -> Tuple[str, List[Tuple[str, str]], List[bytes]]:
    body = json.dumps(payload).encode("utf-8")
    headers = [("Content-Type", "application/json"), ("Content-Length", str(len(body)))]
    headers.extend(_cors_headers())
    return f"{status} {_status_text(status)}", headers, [body]


def _read_json_body(environ) -> Dict[str, object]:
    try:
        length = int(environ.get("CONTENT_LENGTH") or 0)
    except (ValueError, TypeError):
        length = 0
    raw = environ["wsgi.input"].read(length) if length > 0 else b""
    if not raw:
        return {}
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:  # noqa: BLE001
        raise HTTPError(400, f"Invalid JSON payload: {exc}") from exc


def _base_url(environ) -> str:
    scheme = environ.get("wsgi.url_scheme", "http")
    host = environ.get("HTTP_HOST") or environ.get("SERVER_NAME", "localhost")
    return f"{scheme}://{host}"


def _list_archives(environ) -> List[Dict[str, object]]:
    results: List[Dict[str, object]] = []
    if ARCHIVES_DIR.exists():
        for run_dir in sorted(ARCHIVES_DIR.iterdir(), reverse=True):
            meta = _archive_metadata(run_dir)
            if not meta:
                continue
            base_url = _base_url(environ)
            output_url = f"{base_url}/api/archive/{meta['runId']}/output"
            log_url = f"{base_url}/api/archive/{meta['runId']}/logs" if meta["hasLogs"] else None
            status = _get_run_status(meta["runId"]) or "completed"
            results.append(
                {
                    "runId": meta["runId"],
                    "finishedAt": meta["finishedAt"],
                    "outputUrl": output_url,
                    "logUrl": log_url,
                    "latestFinishSeconds": meta["latestFinishSeconds"],
                    "maxDIJobs": meta["maxDIJobs"],
                    "status": status,
                }
            )

    with _status_lock:
        in_progress = [
            (run_id, status)
            for run_id, status in _run_status.items()
            if status in {"queued", "running"}
        ]
    for run_id, status in in_progress:
        if any(entry["runId"] == run_id for entry in results):
            continue
        results.append(
            {
                "runId": run_id,
                "finishedAt": None,
                "outputUrl": None,
                "logUrl": None,
                "latestFinishSeconds": None,
                "maxDIJobs": None,
                "status": status,
            }
        )

    return results


def _launch_simulation(features: List[str]) -> Dict[str, object]:
    invalid = sorted({feature.strip().lower() for feature in features} - KNOWN_FEATURES)
    if invalid:
        raise HTTPError(400, f"Unsupported features requested: {', '.join(invalid)}")

    normalized = _normalise_features(features)
    run_id = _build_run_id(normalized)
    if _get_run_status(run_id):
        raise HTTPError(409, "A matching simulation is already queued.")

    _set_run_status(run_id, "queued")
    _executor.submit(_start_simulation, run_id, normalized)
    return {"runId": run_id, "status": "queued"}


def _start_simulation(run_id: str, features: List[str]) -> None:
    env = os.environ.copy()
    env["JOB_PLANNER_FEATURES"] = ",".join(features)
    command = [sys.executable, "cli.py"]

    _set_run_status(run_id, "running")
    logs_before = {p.name for p in LOGS_DIR.glob("*.log")}

    try:
        result = subprocess.run(
            command,
            cwd=ROOT_DIR,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "Simulation failed with non-zero exit status.")

        run_dir = ARCHIVES_DIR / run_id
        run_dir.mkdir(parents=True, exist_ok=True)

        output_src = DATA_DIR / "output.csv"
        if output_src.exists():
            shutil.copy2(output_src, run_dir / "output.csv")

        new_logs = [p for p in LOGS_DIR.glob("*.log") if p.name not in logs_before]
        if new_logs:
            latest_log = max(new_logs, key=lambda p: p.stat().st_mtime)
            logs_target = run_dir / "logs"
            logs_target.mkdir(exist_ok=True)
            shutil.copy2(latest_log, logs_target / latest_log.name)

        metadata = {
            "runId": run_id,
            "features": features,
            "finishedAt": datetime.now(timezone.utc).isoformat(),
        }
        (run_dir / "metadata.json").write_text(json.dumps(metadata, indent=2))

        _set_run_status(run_id, "completed")
    except Exception as exc:  # noqa: BLE001
        _set_run_status(run_id, f"failed: {exc}")


def _serve_file(path: Path, content_type: str, filename: Optional[str] = None) -> Tuple[str, List[Tuple[str, str]], List[bytes]]:
    if not path.exists():
        raise HTTPError(404, "Requested file not found.")

    data = path.read_bytes()
    headers = [("Content-Type", content_type), ("Content-Length", str(len(data)))]
    if filename:
        headers.append(("Content-Disposition", f"attachment; filename={filename}"))
    headers.extend(_cors_headers())
    return f"200 {_status_text(200)}", headers, [data]


def application(environ, start_response):  # noqa: D401 - WSGI entry point
    method = environ.get("REQUEST_METHOD", "GET").upper()
    path = environ.get("PATH_INFO", "")

    if method == "OPTIONS":
        status_line = f"204 {_status_text(204)}"
        headers = _cors_headers()
        start_response(status_line, headers)
        return [b""]

    try:
        if method == "GET" and path == "/api/metrics":
            payload = _metrics_from_output(DATA_DIR / "output.csv")
            status_line, headers, body = _json_response(200, payload)
        elif method == "GET" and path == "/api/archives":
            payload = _list_archives(environ)
            status_line, headers, body = _json_response(200, payload)
        elif method == "POST" and path == "/api/simulations":
            body_data = _read_json_body(environ)
            features = body_data.get("features")
            if not isinstance(features, list):
                raise HTTPError(400, "Payload must include a 'features' list.")
            payload = _launch_simulation(features)
            status_line, headers, body = _json_response(202, payload)
        elif method == "GET" and path.startswith("/api/archive/"):
            parts = path.split("/")
            if len(parts) < 4:
                raise HTTPError(404, "Invalid archive request.")
            run_id = parts[3]
            if len(parts) == 5 and parts[4] == "output":
                status_line, headers, body = _serve_file(
                    ARCHIVES_DIR / run_id / "output.csv",
                    "text/csv",
                    filename=f"{run_id}_output.csv",
                )
            elif len(parts) == 5 and parts[4] == "logs":
                log_dir = ARCHIVES_DIR / run_id / "logs"
                if not log_dir.exists():
                    raise HTTPError(404, "Logs not available for this run.")
                log_files = [p for p in log_dir.glob("*.log") if p.is_file()]
                if not log_files:
                    raise HTTPError(404, "Logs not available for this run.")
                latest_log = max(log_files, key=lambda p: p.stat().st_mtime)
                status_line, headers, body = _serve_file(
                    latest_log,
                    "text/plain",
                    filename=latest_log.name,
                )
            else:
                raise HTTPError(404, "Unsupported archive request.")
        else:
            raise HTTPError(404, "Endpoint not found.")
    except HTTPError as exc:
        status_line, headers, body = _json_response(exc.status, {"detail": exc.message})
    except Exception as exc:  # noqa: BLE001
        status_line, headers, body = _json_response(500, {"detail": f"Internal error: {exc}"})

    start_response(status_line, headers)
    return body


app = application


def run(host: str = "0.0.0.0", port: int = 8000) -> None:
    from wsgiref.simple_server import make_server

    with make_server(host, port, application) as server:
        print(f"Balanced Corridor Planner API server running on http://{host}:{port}")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down API server...")


if __name__ == "__main__":
    run()
