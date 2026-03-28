"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAudit } from "@/lib/api";

export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const { audit_id } = await createAudit();
      router.push(`/audit/${audit_id}/questionnaire`);
    } catch (e) {
      setError("Could not connect to the server. Make sure the backend is running.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center text-center gap-10 pt-16">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-full bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-1">
          ADA Compliance Made Simple
        </span>
        <h1 className="text-5xl font-black text-slate-900 leading-tight max-w-2xl">
          Know your building&apos;s{" "}
          <span className="text-blue-700">accessibility gaps</span> in minutes.
        </h1>
        <p className="text-lg text-slate-500 max-w-xl">
          Record a short video of your entrance, restroom, or parking lot.
          PASSLINE analyzes it with AI and delivers a professional ADA compliance
          report with violation findings and remediation cost estimates.
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleStart}
          disabled={loading}
          className="rounded-xl bg-blue-700 text-white px-10 py-4 text-lg font-bold shadow-lg
                     hover:bg-blue-800 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Starting audit..." : "Start New Audit"}
        </button>
        {error && (
          <p className="text-red-600 text-sm max-w-sm">{error}</p>
        )}
        <p className="text-slate-400 text-sm">No account needed. Results in under 2 minutes.</p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-4">
        {[
          {
            icon: "📹",
            title: "Record Video",
            desc: "Walk through your space with your phone. 15-60 seconds is all it takes.",
          },
          {
            icon: "🔍",
            title: "AI Analysis",
            desc: "Gemini detects features. Depth AI measures distances. Zero guessing.",
          },
          {
            icon: "📋",
            title: "Compliance Report",
            desc: "Violation details, ADA sections cited, remediation costs. Download as PDF.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm"
          >
            <div className="text-3xl mb-2">{f.icon}</div>
            <div className="font-semibold text-slate-800 mb-1">{f.title}</div>
            <div className="text-slate-500 text-sm">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Modules covered */}
      <div className="text-slate-500 text-sm">
        Modules: <strong className="text-slate-700">Entrance</strong> &middot;{" "}
        <strong className="text-slate-700">Restroom</strong> &middot;{" "}
        <strong className="text-slate-700">Parking</strong> &middot; Hallway &middot; Dining &middot; Counter
      </div>
    </div>
  );
}
