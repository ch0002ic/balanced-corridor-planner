import { useEffect, useState } from "react";
import apiClient, { ArchiveSummary } from "../api/client";

const ArchiveViewerPage = () => {
  const [archives, setArchives] = useState<ArchiveSummary[]>([]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    apiClient
      .fetchArchives()
      .then((items) => {
        setArchives(items);
        setHasError(false);
      })
      .catch(() => {
        setArchives([]);
        setHasError(true);
      });
  }, []);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Simulation Archives</h2>
        <p className="text-sm text-slate-300">
          Review completed simulation runs and download their CSV and log outputs.
        </p>
      </div>
      <div className="grid gap-4">
        {archives.map((archive) => {
          const isReady = Boolean(archive.outputUrl);
          const statusLabel = archive.status ?? (isReady ? "completed" : "pending");

          return (
            <div key={archive.runId} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-semibold">Run {archive.runId}</p>
                  <p className="text-sm text-slate-400">
                    {archive.finishedAt
                      ? `Completed ${new Date(archive.finishedAt).toLocaleString()}`
                      : "Pending completion"}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status: {statusLabel}</p>
                  {archive.latestFinishSeconds != null && archive.maxDIJobs != null && (
                    <p className="text-xs text-slate-500">
                      Finish Time: {archive.latestFinishSeconds.toLocaleString()} s · Max DI Jobs: {archive.maxDIJobs}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  {archive.outputUrl ? (
                    <a
                      className="rounded bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300"
                      href={archive.outputUrl}
                    >
                      Download CSV
                    </a>
                  ) : (
                    <span className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-500">
                      CSV pending
                    </span>
                  )}
                  {archive.logUrl ? (
                    <a
                      className="rounded bg-cyan-200 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-100"
                      href={archive.logUrl}
                    >
                      Download Log
                    </a>
                  ) : (
                    <span className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-500">
                      Log pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {archives.length === 0 && !hasError && (
          <p className="text-sm text-slate-400">No completed runs yet. Launch a simulation to populate this view.</p>
        )}
        {hasError && <p className="text-sm text-rose-300">Unable to load archives. Confirm backend availability.</p>}
      </div>
    </section>
  );
};

export default ArchiveViewerPage;
