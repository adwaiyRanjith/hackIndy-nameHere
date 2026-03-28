"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getAudit, triggerReport } from "@/lib/api";

const MODULE_META: Record<string, { icon: string; title: string; desc: string }> = {
  // Universal
  entrance:         { icon: "🚪", title: "Entrance / Door",         desc: "Door width, hardware, threshold, signage, ramps" },
  hallway:          { icon: "🛤️", title: "Hallway / Corridor",      desc: "Width, obstructions, floor surface, signage" },
  restroom:         { icon: "🚻", title: "Restroom",                 desc: "Grab bars, faucet, door swing, clearance, mirror" },
  parking:          { icon: "🅿️", title: "Parking Lot",             desc: "Accessible spaces, signage, access aisles, curb ramps" },
  elevator:         { icon: "🛗", title: "Elevator",                 desc: "Call button height, cab size, controls, braille" },
  stairway:         { icon: "🪜", title: "Stairs & Handrails",       desc: "Handrail height, extensions, nosing contrast" },
  signage:          { icon: "🪧", title: "Signage & Wayfinding",     desc: "Height, braille, high contrast, mounting location" },
  drinking_fountain:{ icon: "💧", title: "Drinking Fountain",        desc: "Spout height, knee clearance, hi-lo units" },
  // Dining / Food Service
  dining:           { icon: "🍽️", title: "Dining Area",             desc: "Table heights, aisle widths, accessible seating" },
  counter:          { icon: "🏪", title: "Service Counter",          desc: "Counter height, accessible section, approach clearance" },
  outdoor_seating:  { icon: "🌿", title: "Outdoor Seating",          desc: "Surface, route from entrance, accessible tables" },
  cafeteria:        { icon: "🥗", title: "Cafeteria / Dining Hall",  desc: "Food line height, tray slide, aisle widths" },
  concession:       { icon: "🍿", title: "Concession Stand",         desc: "Counter height, accessible section, queue setup" },
  // Retail
  sales_floor:      { icon: "🛍️", title: "Sales Floor & Aisles",    desc: "Aisle width, protruding displays, accessible route" },
  checkout:         { icon: "🧾", title: "Checkout Counter",         desc: "Counter height, PIN pad reach, queue width" },
  fitting_room:     { icon: "👗", title: "Fitting Room",             desc: "Door width, turning space, bench height" },
  // Office / Professional
  reception:        { icon: "🗂️", title: "Reception Desk",          desc: "Counter height, accessible section, approach space" },
  conference_room:  { icon: "💼", title: "Conference Room",          desc: "Door width, table height, knee clearance, turning space" },
  break_room:       { icon: "☕", title: "Break Room / Kitchen",     desc: "Counter heights, sink clearance, appliance reach" },
  // Medical / Healthcare
  waiting_room:     { icon: "🪑", title: "Waiting Room",             desc: "Wheelchair spaces, aisle widths, check-in counter" },
  exam_room:        { icon: "🩺", title: "Examination Room",         desc: "Exam table height, door width, turning space" },
  patient_room:     { icon: "🛏️", title: "Patient Room",            desc: "Bed clearance, bathroom access, call button" },
  pharmacy:         { icon: "💊", title: "Pharmacy Counter",         desc: "Counter height, consultation window, PIN pad" },
  // Hotel / Lodging
  lobby:            { icon: "🏨", title: "Hotel Lobby",              desc: "Check-in desk height, route to elevator, seating" },
  guest_room:       { icon: "🛎️", title: "Accessible Guest Room",   desc: "Bed clearance, roll-in shower, grab bars, controls" },
  pool:             { icon: "🏊", title: "Pool & Spa Area",           desc: "Pool lift or sloped entry, deck surface, locker access" },
  fitness_center:   { icon: "🏋️", title: "Fitness Center",          desc: "Equipment aisles, accessible machines, locker heights" },
  // Education
  classroom:        { icon: "📚", title: "Classroom",                desc: "Desk aisles, accessible desk, whiteboard reach" },
  gymnasium:        { icon: "🏀", title: "Gymnasium",                desc: "Accessible seating, route to floor, locker access" },
  auditorium:       { icon: "🎭", title: "Auditorium",               desc: "Wheelchair spaces, companion seats, stage access" },
  library:          { icon: "📖", title: "Library",                  desc: "Aisle widths, shelf reach, study tables, checkout" },
  // Assembly / Entertainment
  assembly_seating: { icon: "🎪", title: "Assembly Seating",         desc: "Wheelchair spaces, companion seats, sight lines" },
  stage:            { icon: "🎤", title: "Stage Access",             desc: "Ramp or lift, handrails, approach clearance" },
  ticket_booth:     { icon: "🎟️", title: "Ticket / Box Office",     desc: "Counter height, accessible window, approach space" },
};

// Group modules into categories for display
const MODULE_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Entrances & Circulation",  keys: ["entrance", "hallway", "elevator", "stairway"] },
  { label: "Core Facilities",          keys: ["restroom", "parking", "signage", "drinking_fountain"] },
  { label: "Dining & Food Service",    keys: ["dining", "counter", "outdoor_seating", "cafeteria", "concession"] },
  { label: "Retail",                   keys: ["sales_floor", "checkout", "fitting_room"] },
  { label: "Office & Professional",    keys: ["reception", "conference_room", "break_room"] },
  { label: "Medical & Healthcare",     keys: ["waiting_room", "exam_room", "patient_room", "pharmacy"] },
  { label: "Hotel & Lodging",          keys: ["lobby", "guest_room", "pool", "fitness_center"] },
  { label: "Education",                keys: ["classroom", "cafeteria", "gymnasium", "auditorium", "library"] },
  { label: "Assembly & Entertainment", keys: ["assembly_seating", "stage", "concession", "ticket_booth"] },
];

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  created:             { label: "Not Started",  classes: "bg-slate-100 text-slate-600" },
  uploading:           { label: "Uploading...", classes: "bg-blue-100 text-blue-600 animate-pulse" },
  extracting_frames:   { label: "Extracting...",classes: "bg-blue-100 text-blue-600 animate-pulse" },
  analyzing:           { label: "Analyzing...", classes: "bg-yellow-100 text-yellow-700 animate-pulse" },
  checking_compliance: { label: "Checking...",  classes: "bg-yellow-100 text-yellow-700 animate-pulse" },
  complete:            { label: "Complete",      classes: "bg-green-100 text-green-700" },
  error:               { label: "Error",         classes: "bg-red-100 text-red-600" },
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
    const interval = setInterval(poll, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [id]);

  const applicableModules: string[] = audit?.applicable_modules?.length
    ? audit.applicable_modules
    : ["entrance", "restroom"];

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

  // Build groups that have at least one applicable module
  const visibleGroups = MODULE_GROUPS
    .map((group) => ({
      ...group,
      keys: group.keys.filter((k) => applicableModules.includes(k)),
    }))
    .filter((group) => group.keys.length > 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="text-sm text-blue-600 font-semibold mb-1">Step 2 of 3</div>
        <h1 className="text-2xl font-bold text-slate-900">Select a Module to Audit</h1>
        <p className="text-slate-500 mt-1">
          Tap any area below to record or upload a video for analysis.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {group.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.keys.map((mod) => {
                const meta = MODULE_META[mod] ?? { icon: "📷", title: mod, desc: "" };
                const moduleData = moduleStatusMap[mod];
                const status = moduleData?.status ?? "created";
                const badge = STATUS_BADGE[status] ?? STATUS_BADGE.created;
                const violationCount = moduleData?.violations?.length ?? 0;

                return (
                  <button
                    key={mod}
                    onClick={() => router.push(`/audit/${id}/capture/${mod}`)}
                    className="text-left rounded-xl border border-slate-200 bg-white p-4 shadow-sm
                               hover:border-blue-300 hover:shadow-md transition-all active:scale-95"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-2xl">{meta.icon}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.classes}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 text-sm">{meta.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{meta.desc}</div>
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
          </div>
        ))}
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
