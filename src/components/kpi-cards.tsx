"use client";

interface KpiCardProps {
  label: string;
  value: string;
  sublabel?: string;
  positive?: boolean | null;
}

export function KpiCard({ label, value, sublabel, positive }: KpiCardProps) {
  const borderColor =
    positive === true
      ? "border-emerald-200"
      : positive === false
      ? "border-red-200"
      : "border-slate-100";

  const valueColor =
    positive === true
      ? "text-emerald-700"
      : positive === false
      ? "text-red-700"
      : "text-slate-900";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${borderColor} bg-white
        p-5 flex flex-col gap-2 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className={`text-2xl font-semibold ${valueColor} tabular-nums tracking-tight`}>{value}</span>
      {sublabel && (
        <span className="text-[11px] text-slate-400 leading-snug">{sublabel}</span>
      )}
    </div>
  );
}

interface KpiRowProps {
  cards: KpiCardProps[];
}

export function KpiRow({ cards }: KpiRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <KpiCard key={i} {...c} />
      ))}
    </div>
  );
}
