"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAudit, triggerReport } from "@/lib/api";

const MODULE_META: Record<string, { icon: string; title: string; desc: string }> = {
  entrance: { icon: "🚪", title: "Entrance / Door", desc: "Door width, hardware, threshold, signage, ramps" },
  restroom: { icon: "🚻", title: "Restroom", desc: "Grab bars, faucet, door swing, clearance, mirror" },
  parking:  { icon: "🅿️", title: "Parking Lot", desc: "Accessible spaces, signage, access aisles, curb ramps" },
  hallway:  { icon: "🛤️", title: "Hallway", desc: "Width, obstructions, signage" },
  dining:   { icon: "🍽️", title: "Dining Area", desc: "Table heights, aisle widths, accessible seating" },
  counter:  { icon: "🏪", title: "Service Counter", desc: "Counter height, accessible section, approach clearance" },
};

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  created:            { label: "Not Started",   classes: "bg-slate-100 text-slate-600" },
  uploading:          { label: "Uploading...",   classes: "bg-blue-100 text-blue-600 animate-pulse" },
  extracting_frames:  { label: "Extracting...",  classes: "bg-blue-100 text-blue-600 animate-pulse" },
  analyzing:          { label: "Analyzing...",   classes: "bg-yellow-100 text-yellow-700 animate-pulse" },
  checking_compliance:{ label: "Checking...",   classes: "bg-yellow-100 text-yellow-700 animate-pulse" },
  complete:           { label: "Complete",       classes: "bg-green-100 text-green-700" },
  error:              { label: "Error",          classes: "bg-red-100 text-red-600" },
};

export default function ModulesPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await getAudit(id);
        if (!cancelled) setAudit(data);
      } catch {}
      if (!cancelled) setLoading(false);
    }
    poll();
    // Poll every 4s to reflect module status changes
    const interval = setInterval(poll, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id]);

  const applicableModules: string[] = audit
    ? (audit.applicable_rules?.length
        ? [...new Set((audit.applicable_rules as string[]).map((r: string) => r.split("_")[0]))]
        : ["entrance", "restroom"])
    : [];

  // Determine module statuses from audit.modules
  const moduleStatusMap: Record<string, any> = {};
  for (const m of audit?.modules ?? []) {
    moduleStatusMap[m.module_type] = m;
  }

  const hasCompleted = Object.values(moduleStatusMap).some(
    (m: any) => m.status === "complete"
  );

  async function handleGenerateReport() {
    setGenerating(true);
    try {
      await triggerReport(id);
      router.push(`/audit/${id}/report`);
    } catch {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        Loading audit...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="text-sm text-blue-600 font-semibold mb-1">Step 2 of 3</div>
        <h1 className="text-2xl font-bold text-slate-900">Select a Module to Audit</h1>
        <p className="text-slate-500 mt-1">
          Tap any area below to record or upload a video for analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {applicableModules.map((mod) => {
          const meta = MODULE_META[mod] ?? { icon: "📷", title: mod, desc: "" };
          const moduleData = moduleStatusMap[mod];
          const status = moduleData?.status ?? "created";
          const badge = STATUS_BADGE[status] ?? STATUS_BADGE.created;
          const violationCount = moduleData?.violations?.length ?? 0;

          return (
            <button
              key={mod}
              onClick={() => router.push(`/audit/${id}/capture/${mod}`)}
              className="text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm
                         hover:border-blue-300 hover:shadow-md transition-all active:scale-95"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-3xl">{meta.icon}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.classes}`}>
                  {badge.label}
                </span>
              </div>
              <div className="font-semibold text-slate-800">{meta.title}</div>
              <div className="text-sm text-slate-500 mt-0.5">{meta.desc}</div>
              {status === "complete" && violationCount > 0 && (
                <div className="mt-2 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md inline-block">
                  {violationCount} violation{violationCount !== 1 ? "s" : ""} found
                </div>
              )}
              {status === "complete" && violationCount === 0 && (
                <div className="mt-2 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-md inline-block">
                  No violations
                </div>
              )}
            </button>
          );
        })}
      </div>

      {hasCompleted && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="w-full rounded-xl bg-green-700 text-white py-3 font-bold text-base
                       hover:bg-green-800 transition-colors disabled:opacity-60"
          >
            {generating ? "Generating Report..." : "Generate Compliance Report"}
          </button>
          <p className="text-slate-400 text-sm">
            You can add more modules before or after generating.
          </p>
        </div>
      )}
    </div>
  );
}
