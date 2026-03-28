"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getModuleStatus } from "@/lib/api";

const STEPS = [
  { key: "extracting_frames",   label: "Extracting key frames",     icon: "🎞️" },
  { key: "analyzing",           label: "Analyzing features with AI", icon: "🔍" },
  { key: "checking_compliance", label: "Checking compliance rules",  icon: "📋" },
  { key: "complete",            label: "Complete",                   icon: "✅" },
];

function currentStepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function ProcessingPage() {
  const router = useRouter();
  const { id, moduleId } = useParams<{ id: string; moduleId: string }>();

  const [status, setStatus] = useState("extracting_frames");
  const [progress, setProgress] = useState(0);
  const [violationsFound, setViolationsFound] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getModuleStatus(id, moduleId);
        if (cancelled) return;
        setStatus(data.status);
        setProgress(data.progress ?? 0);
        setViolationsFound(data.violations_found ?? null);
        setErrorMessage(data.error_message ?? null);

        if (data.status === "complete") {
          setTimeout(() => {
            if (!cancelled) router.push(`/audit/${id}/modules`);
          }, 1500);
        }
      } catch {}
    }

    poll();
    const interval = setInterval(poll, 2500);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id, moduleId, router]);

  const stepIdx = currentStepIndex(status);
  const isError = status === "error";
  const isComplete = status === "complete";

  return (
    <div className="max-w-md mx-auto flex flex-col items-center gap-8 pt-12">
      {/* Spinner / checkmark */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl
        ${isError ? "bg-red-100" : isComplete ? "bg-green-100" : "bg-blue-100"}`}>
        {isError ? "❌" : isComplete ? "✅" : "⏳"}
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">
          {isError ? "Processing Error" : isComplete ? "Analysis Complete!" : "Analyzing your video..."}
        </h1>
        {!isError && !isComplete && (
          <p className="text-slate-500 text-sm mt-1">This takes 30-90 seconds. Please wait.</p>
        )}
      </div>

      {/* Progress bar */}
      {!isError && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step list */}
      {!isError && (
        <div className="w-full flex flex-col gap-3">
          {STEPS.map((step, i) => {
            const done = i < stepIdx || isComplete;
            const active = i === stepIdx && !isComplete;
            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm
                  ${done ? "bg-green-50 text-green-700" : active ? "bg-blue-50 text-blue-700 font-medium" : "bg-slate-50 text-slate-400"}`}
              >
                <span className="text-lg">{done ? "✅" : active ? "🔄" : "⬜"}</span>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete */}
      {isComplete && violationsFound !== null && (
        <div className={`rounded-xl px-6 py-4 text-center font-semibold
          ${violationsFound > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {violationsFound > 0
            ? `${violationsFound} violation${violationsFound !== 1 ? "s" : ""} found`
            : "No violations detected"}
          <p className="text-xs font-normal mt-1 opacity-75">Redirecting to modules...</p>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="w-full flex flex-col gap-3">
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            {errorMessage ?? "An unexpected error occurred."}
          </div>
          <button
            onClick={() => router.push(`/audit/${id}/capture/${moduleId}`)}
            className="w-full rounded-xl bg-blue-700 text-white py-3 font-bold hover:bg-blue-800 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push(`/audit/${id}/modules`)}
            className="w-full rounded-xl border border-slate-300 py-3 font-medium text-slate-600 hover:bg-slate-50"
          >
            Back to Modules
          </button>
        </div>
      )}
    </div>
  );
}
