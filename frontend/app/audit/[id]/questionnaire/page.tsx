"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { submitQuestionnaire } from "@/lib/api";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const FACILITY_TYPES = [
  { value: "restaurant", label: "Restaurant / Food Service" },
  { value: "retail", label: "Retail Store" },
  { value: "office", label: "Office Building" },
  { value: "medical", label: "Medical / Healthcare" },
  { value: "hotel", label: "Hotel / Lodging" },
  { value: "other", label: "Other" },
];

const BUILDING_AGES = [
  { value: "pre-1992", label: "Pre-1992 (before ADA)" },
  { value: "1992-2012", label: "1992–2012" },
  { value: "post-2012", label: "Post-2012" },
];

export default function QuestionnairePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [state, setState] = useState("IN");
  const [facilityType, setFacilityType] = useState("restaurant");
  const [buildingAge, setBuildingAge] = useState("pre-1992");
  const [recentRenovation, setRecentRenovation] = useState(false);
  const [renovationCost, setRenovationCost] = useState<string>("");
  const [parkingSpaces, setParkingSpaces] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await submitQuestionnaire(id, {
        state,
        facility_type: facilityType,
        building_age: buildingAge,
        recent_renovation: recentRenovation,
        renovation_cost: recentRenovation && renovationCost ? parseFloat(renovationCost) : null,
        parking_spaces: parseInt(parkingSpaces, 10) || 0,
      });
      router.push(`/audit/${id}/modules`);
    } catch {
      setError("Failed to save questionnaire. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <div className="text-sm text-blue-600 font-semibold mb-1">Step 1 of 3</div>
        <h1 className="text-2xl font-bold text-slate-900">About Your Facility</h1>
        <p className="text-slate-500 mt-1">
          We use this to determine which ADA rules apply to your building.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* State */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Facility type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Facility Type</label>
          <div className="grid grid-cols-2 gap-2">
            {FACILITY_TYPES.map((f) => (
              <label
                key={f.value}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors
                  ${facilityType === f.value
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 hover:border-slate-300"
                  }`}
              >
                <input
                  type="radio"
                  name="facilityType"
                  value={f.value}
                  checked={facilityType === f.value}
                  onChange={() => setFacilityType(f.value)}
                  className="sr-only"
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        {/* Building age */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Building Age</label>
          <div className="flex flex-col gap-2">
            {BUILDING_AGES.map((a) => (
              <label
                key={a.value}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors
                  ${buildingAge === a.value
                    ? "border-blue-600 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 hover:border-slate-300"
                  }`}
              >
                <input
                  type="radio"
                  name="buildingAge"
                  value={a.value}
                  checked={buildingAge === a.value}
                  onChange={() => setBuildingAge(a.value)}
                  className="sr-only"
                />
                {a.label}
              </label>
            ))}
          </div>
        </div>

        {/* Recent renovation */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setRecentRenovation(!recentRenovation)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${recentRenovation ? "bg-blue-600" : "bg-slate-300"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${recentRenovation ? "translate-x-6" : "translate-x-1"}`}
              />
            </div>
            <span className="text-sm font-medium text-slate-700">
              Recent renovation in the last 3 years
            </span>
          </label>
          {recentRenovation && (
            <div className="mt-3">
              <label className="block text-sm text-slate-600 mb-1">
                Approximate renovation cost ($)
              </label>
              <input
                type="number"
                value={renovationCost}
                onChange={(e) => setRenovationCost(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Parking spaces */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Total Parking Spaces{" "}
            <span className="text-slate-400 font-normal">(0 if no parking lot)</span>
          </label>
          <input
            type="number"
            min="0"
            value={parkingSpaces}
            onChange={(e) => setParkingSpaces(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-700 text-white py-3 font-bold text-base
                     hover:bg-blue-800 transition-colors disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Continue to Module Selection"}
        </button>
      </form>
    </div>
  );
}
