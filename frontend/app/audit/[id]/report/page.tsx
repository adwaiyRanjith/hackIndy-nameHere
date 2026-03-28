"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getReport, getAudit } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const SEVERITY_STYLES: Record<string, { badge: string; border: string }> = {
  critical: { badge: "bg-red-100 text-red-700",    border: "border-l-red-500" },
  high:     { badge: "bg-orange-100 text-orange-700", border: "border-l-orange-500" },
  medium:   { badge: "bg-yellow-100 text-yellow-700", border: "border-l-yellow-500" },
  low:      { badge: "bg-green-100 text-green-700", border: "border-l-green-500" },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";
  const label = score >= 80 ? "Good" : score >= 60 ? "Fair" : "Poor";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-28 h-28 rounded-full flex items-center justify-center border-8 font-black text-3xl"
        style={{ borderColor: color, color }}
      >
        {score}%
      </div>
      <div className="font-semibold text-sm" style={{ color }}>{label}</div>
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFrame, setExpandedFrame] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [r, a] = await Promise.all([getReport(id), getAudit(id)]);
        if (!cancelled) { setReport(r); setAudit(a); }
      } catch {}
      if (!cancelled) setLoading(false);
    }
    load();
    const interval = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        Generating report...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        Report not yet ready. Check back in a moment.
      </div>
    );
  }

  const facility = audit?.facility ?? {};
  const violations: any[] = report.violations ?? [];
  const moduleGroups = violations.reduce((acc: Record<string, any[]>, v: any) => {
    acc[v.module_type] = acc[v.module_type] ?? [];
    acc[v.module_type].push(v);
    return acc;
  }, {});

  // Collect depth/annotated frames from audit modules
  const moduleFrameMap: Record<string, { annotated: string[]; depth: string[] }> = {};
  for (const m of audit?.modules ?? []) {
    moduleFrameMap[m.module_type] = {
      annotated: m.annotated_frames ?? [],
      depth: m.depth_map_frames ?? [],
    };
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Compliance Report</h1>
          <p className="text-slate-500 text-sm mt-1">
            {facility.facility_type ? `${facility.facility_type} · ` : ""}
            {facility.state ?? ""} · {new Date().toLocaleDateString()}
          </p>
        </div>
        <ScoreRing score={report.overall_score ?? 0} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total Violations",    value: report.total_violations ?? 0,    color: "text-slate-800" },
          { label: "Critical",            value: report.critical_violations ?? 0,  color: "text-red-600" },
          { label: "Modules Audited",     value: report.modules_audited ?? 0,      color: "text-blue-700" },
          {
            label: "Est. Remediation",
            value: `$${(report.estimated_remediation_total?.low ?? 0).toLocaleString()}–$${(report.estimated_remediation_total?.high ?? 0).toLocaleString()}`,
            color: "text-slate-700",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* PDF Download */}
      {report.pdf_url && (
        <a
          href={`${API_BASE}${report.pdf_url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-8 flex items-center justify-center gap-2 w-full rounded-xl bg-slate-800 text-white py-3
                     font-bold hover:bg-slate-900 transition-colors"
        >
          📄 Download PDF Report
        </a>
      )}

      {/* Violations by module */}
      {Object.entries(moduleGroups).map(([modType, modViolations]) => {
        const frames = moduleFrameMap[modType] ?? { annotated: [], depth: [] };
        return (
          <div key={modType} className="mb-10">
            <h2 className="text-lg font-bold text-slate-800 capitalize mb-3 border-b border-slate-200 pb-2">
              {modType} Module
            </h2>

            {/* Frame viewer: side-by-side original | depth map */}
            {(frames.annotated.length > 0 || frames.depth.length > 0) && (
              <div className="mb-4">
                <p className="text-xs text-slate-500 mb-2 font-medium">ANNOTATED FRAMES · DEPTH MAPS</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {frames.annotated.slice(0, 6).map((f, i) => (
                    <div key={f} className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => setExpandedFrame(`${API_BASE}/frames/${f}`)}
                        className="rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors"
                      >
                        <img
                          src={`${API_BASE}/frames/${f}`}
                          alt={`Frame ${i + 1}`}
                          className="h-24 w-auto object-cover"
                        />
                      </button>
                      {frames.depth[i] && (
                        <button
                          onClick={() => setExpandedFrame(`${API_BASE}/frames/${frames.depth[i]}`)}
                          className="rounded-lg overflow-hidden border border-blue-200 hover:border-blue-500 transition-colors"
                        >
                          <img
                            src={`${API_BASE}/frames/${frames.depth[i]}`}
                            alt={`Depth ${i + 1}`}
                            className="h-24 w-auto object-cover"
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Violation cards */}
            <div className="flex flex-col gap-3">
              {(modViolations as any[]).map((v: any) => {
                const style = SEVERITY_STYLES[v.severity] ?? SEVERITY_STYLES.low;
                return (
                  <div
                    key={v.violation_id}
                    className={`rounded-xl border border-slate-200 bg-white p-4 border-l-4 ${style.border} shadow-sm`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${style.badge}`}>
                          {v.severity}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">{v.code}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-500 whitespace-nowrap">
                        ${v.remediation_cost?.low?.toLocaleString()}–${v.remediation_cost?.high?.toLocaleString()}
                      </div>
                    </div>
                    <div className="font-semibold text-slate-800 mb-1">{v.element}</div>
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
                      <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded inline-block">
                        ⚠️ Uncalibrated estimate — place a credit card for higher accuracy
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {violations.length === 0 && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-8 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <div className="font-bold text-green-700 text-lg">No violations detected!</div>
          <p className="text-green-600 text-sm mt-1">Your audited areas appear to be ADA compliant.</p>
        </div>
      )}

      {/* Lightbox */}
      {expandedFrame && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedFrame(null)}
        >
          <img src={expandedFrame} alt="Expanded frame" className="max-h-screen max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
