type MetricCardProps = {
  title: string;
  value: string | number;
};

const MetricCard = ({ title, value }: MetricCardProps) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
    <p className="text-sm uppercase tracking-wide text-slate-400">{title}</p>
    <p className="mt-2 text-2xl font-semibold">{value}</p>
  </div>
);

export default MetricCard;
