type ToggleOption = { key: string; label: string };

type ToggleGroupProps = {
  value: string[];
  onChange: (next: string[]) => void;
  options: ToggleOption[];
};

const ToggleGroup = ({ value, onChange, options }: ToggleGroupProps) => {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((item) => item !== key) : [...value, key]);
  };

  return (
    <div className="flex flex-wrap gap-3">
  {options.map((option: ToggleOption) => (
        <button
          key={option.key}
          type="button"
          onClick={() => toggle(option.key)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            value.includes(option.key)
              ? "border-cyan-300 bg-cyan-400 text-slate-900"
              : "border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-300"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default ToggleGroup;
