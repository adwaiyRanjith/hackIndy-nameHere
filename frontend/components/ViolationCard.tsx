interface ViolationCardProps {
  violation: {
    violation_id: string;
    element: string;
    code: string;
    finding: string;
    severity: string;
    calibrated: boolean;
    confidence: number;
    remediation_cost: { low: number; high: number };
    description?: string;
    remediation?: string;
    priority_rationale?: string;
  };
}

const SEVERITY_STYLES: Record<string, { badge: string; border: string }> = {
  critical: { badge: "bg-red-100 text-red-700",      border: "border-l-red-500" },
  high:     { badge: "bg-orange-100 text-orange-700", border: "border-l-orange-500" },
  medium:   { badge: "bg-yellow-100 text-yellow-700", border: "border-l-yellow-500" },
  low:      { badge: "bg-green-100 text-green-700",   border: "border-l-green-500" },
};

export default function ViolationCard({ violation: v }: ViolationCardProps) {
  const style = SEVERITY_STYLES[v.severity] ?? SEVERITY_STYLES.low;
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 border-l-4 ${style.border} shadow-sm`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
            {v.severity}
          </span>
          <span className="text-xs text-slate-400">{v.code}</span>
        </div>
        <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">
          ${v.remediation_cost.low.toLocaleString()}–${v.remediation_cost.high.toLocaleString()}
        </span>
      </div>

      <p className="font-semibold text-slate-800 mb-1">{v.element}</p>
      <p className="text-slate-600 text-sm mb-1">
        <strong>Finding:</strong> {v.finding}
      </p>
      {v.description && (
        <p className="text-slate-600 text-sm mb-1">{v.description}</p>
      )}
      {v.remediation && (
        <p className="text-slate-600 text-sm">
          <strong>Fix:</strong> {v.remediation}
        </p>
      )}
      {!v.calibrated && (
        <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded inline-block">
          ⚠️ Uncalibrated — add reference object for accuracy
        </div>
      )}
    </div>
  );
}
