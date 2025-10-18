import { useEffect, useState } from "react";
import ButtonLink from "../components/ButtonLink";
import MetricCard from "../components/MetricCard";
import apiClient, { MetricsResponse } from "../api/client";

type Metrics = {
  latestFinishSeconds: number;
  maxDIJobs: number;
  lastRunAt: string;
};

const OverviewPage = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    apiClient
      .fetchMetrics()
      .then((response: MetricsResponse) => {
        setMetrics(response);
        setHasError(false);
      })
      .catch(() => {
        setMetrics(null);
        setHasError(true);
      });
  }, []);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Balanced Corridor Planner</h1>
        <p className="text-slate-300">
          Congestion-aware berth and yard allocation planner balancing corridor
          occupancy across DI commitments with what-if scenario tooling.
        </p>
        <ButtonLink
          href="https://github.com/ch0002ic/balanced-corridor-planner"
          label="Source Code"
          target="_blank"
          rel="noreferrer"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Latest Finish Time"
          value={
            metrics ? `${metrics.latestFinishSeconds.toLocaleString()} s` : "—"
          }
        />
        <MetricCard
          title="Max DI Jobs"
          value={metrics ? metrics.maxDIJobs : "—"}
        />
        <MetricCard
          title="Last Run"
          value={metrics ? new Date(metrics.lastRunAt).toLocaleString() : "—"}
        />
      </div>

      {hasError && (
        <p className="text-sm text-rose-300">
          Unable to load metrics. Confirm backend availability.
        </p>
      )}
    </section>
  );
};

export default OverviewPage;
