interface ModuleCardProps {
  moduleType: string;
  status: string;
  violationCount?: number;
  onClick: () => void;
}

const MODULE_META: Record<string, { icon: string; title: string; desc: string }> = {
  entrance: { icon: "🚪", title: "Entrance / Door",   desc: "Door width, hardware, threshold, signage, ramps" },
  restroom: { icon: "🚻", title: "Restroom",           desc: "Grab bars, faucet, door swing, clearance, mirror" },
  parking:  { icon: "🅿️", title: "Parking Lot",       desc: "Spaces, signage, access aisles, curb ramps" },
  hallway:  { icon: "🛤️", title: "Hallway",            desc: "Width, obstructions, signage" },
  dining:   { icon: "🍽️", title: "Dining Area",        desc: "Table heights, aisle widths, accessible seating" },
  counter:  { icon: "🏪", title: "Service Counter",    desc: "Counter height, accessible section" },
};

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  created:             { label: "Not Started",   classes: "bg-slate-100 text-slate-600" },
  uploading:           { label: "Uploading...",   classes: "bg-blue-100 text-blue-600 animate-pulse" },
  extracting_frames:   { label: "Extracting...",  classes: "bg-blue-100 text-blue-600 animate-pulse" },
  analyzing:           { label: "Analyzing...",   classes: "bg-yellow-100 text-yellow-700 animate-pulse" },
  checking_compliance: { label: "Checking...",    classes: "bg-yellow-100 text-yellow-700 animate-pulse" },
  complete:            { label: "Complete",       classes: "bg-green-100 text-green-700" },
  error:               { label: "Error",          classes: "bg-red-100 text-red-600" },
};

export default function ModuleCard({ moduleType, status, violationCount, onClick }: ModuleCardProps) {
  const meta = MODULE_META[moduleType] ?? { icon: "📷", title: moduleType, desc: "" };
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.created;

  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm
                 hover:border-blue-300 hover:shadow-md transition-all active:scale-95 w-full"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-3xl">{meta.icon}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.classes}`}>
          {badge.label}
        </span>
      </div>
      <div className="font-semibold text-slate-800">{meta.title}</div>
      <div className="text-sm text-slate-500 mt-0.5">{meta.desc}</div>
      {status === "complete" && violationCount !== undefined && (
        <div className={`mt-2 text-xs font-semibold px-2 py-1 rounded-md inline-block
          ${violationCount > 0 ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50"}`}>
          {violationCount > 0
            ? `${violationCount} violation${violationCount !== 1 ? "s" : ""}`
            : "No violations"}
        </div>
      )}
    </button>
  );
}
