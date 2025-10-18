import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  timeout: 15000,
});

export type MetricsResponse = {
  latestFinishSeconds: number;
  maxDIJobs: number;
  lastRunAt: string;
};

export type SimulationLaunchResponse = {
  runId: string;
  status: string;
};

export type ArchiveSummary = {
  runId: string;
  finishedAt: string | null;
  outputUrl: string | null;
  logUrl: string | null;
  latestFinishSeconds: number | null;
  maxDIJobs: number | null;
  status: string | null;
};

const apiClient = {
  async fetchMetrics(): Promise<MetricsResponse> {
    const { data } = await http.get("/api/metrics");
    return data as MetricsResponse;
  },
  async launchSimulation(features: string[]): Promise<SimulationLaunchResponse> {
    const { data } = await http.post("/api/simulations", { features });
    return data as SimulationLaunchResponse;
  },
  async fetchArchives(): Promise<ArchiveSummary[]> {
    const { data } = await http.get("/api/archives");
    return data as ArchiveSummary[];
  },
};

export default apiClient;
