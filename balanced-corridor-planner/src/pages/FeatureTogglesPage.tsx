import { useState } from "react";
import ToggleGroup from "../components/ToggleGroup";
import apiClient, { SimulationLaunchResponse } from "../api/client";

type FeatureStatus = "idle" | "loading" | "success" | "error";

type FeatureToggle = {
  key: string;
  label: string;
  description: string;
};

const toggles: FeatureToggle[] = [
  {
    key: "dynamic_corridor_bias",
    label: "Dynamic Corridor Bias",
    description: "Enable corridor balancing pressure for high throughput lanes.",
  },
  {
    key: "ga_diversity",
    label: "Genetic Diversity",
    description: "Promote diverse GA population to avoid local minima.",
  },
  {
    key: "ht_future_penalty",
    label: "HT Future Penalty",
    description: "Discourage plans that defer high throughput penalties.",
  },
  {
    key: "path_cache",
    label: "Path Cache",
    description: "Reuse computed paths for faster iteration cycles.",
  },
];

const FeatureTogglesPage = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<FeatureStatus>("idle");
  const [message, setMessage] = useState("");

  const handleLaunch = async () => {
    setStatus("loading");
    setMessage("");
    try {
  const { runId, status }: SimulationLaunchResponse = await apiClient.launchSimulation(selected);
      setStatus("success");
  setMessage(`Launched simulation ${runId} (${status})`);
    } catch (err) {
      setStatus("error");
      setMessage("Launch failed. Confirm backend availability and payload.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Configure Simulation</h2>
        <p className="text-sm text-slate-300">
          Select feature toggles to apply before dispatching the next corridor balancing simulation run.
        </p>
      </div>
      <ToggleGroup
        value={selected}
        onChange={setSelected}
        options={toggles.map(({ key, label }) => ({ key, label }))}
      />
      <div className="grid gap-4 md:grid-cols-2">
  {toggles.map((toggle: FeatureToggle) => (
          <article key={toggle.key} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-lg font-semibold">{toggle.label}</h3>
            <p className="text-sm text-slate-300">{toggle.description}</p>
          </article>
        ))}
      </div>
      <button
        type="button"
        onClick={handleLaunch}
        disabled={status === "loading"}
        className="rounded-lg bg-lime-400 px-4 py-2 font-semibold text-slate-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? "Launching..." : "Launch Simulation"}
      </button>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-rose-300" : "text-lime-300"}`}>{message}</p>
      )}
    </section>
  );
};

export default FeatureTogglesPage;
