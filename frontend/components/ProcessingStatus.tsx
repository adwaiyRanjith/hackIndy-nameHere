interface ProcessingStatusProps {
  status: string;
  progress: number;
}

const STEPS = [
  { key: "extracting_frames",    label: "Extracting key frames" },
  { key: "analyzing",            label: "Analyzing features with AI" },
  { key: "checking_compliance",  label: "Checking compliance rules" },
  { key: "complete",             label: "Complete" },
];

export default function ProcessingStatus({ status, progress }: ProcessingStatusProps) {
  const stepIdx = STEPS.findIndex((s) => s.key === status);
  const isComplete = status === "complete";

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex flex-col gap-2 mt-1">
        {STEPS.map((step, i) => {
          const done = i < stepIdx || isComplete;
          const active = i === stepIdx && !isComplete;
          return (
            <div
              key={step.key}
              className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2
                ${done ? "bg-green-50 text-green-700" : active ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-400"}`}
            >
              <span>{done ? "✅" : active ? "🔄" : "⬜"}</span>
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
