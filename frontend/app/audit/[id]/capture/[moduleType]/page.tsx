"use client";

import { useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createModule, uploadVideo } from "@/lib/api";

const MODULE_INSTRUCTIONS: Record<string, { title: string; instructions: string; tips: string[] }> = {
  entrance: {
    title: "Entrance / Door",
    instructions:
      "Walk slowly through your entrance area. Include the door fully open if possible, the handle/hardware, the threshold at floor level, and any signage nearby. Place a credit card flat on the door frame for measurement reference if possible. Record for 15-30 seconds.",
    tips: ["Hold phone at chest height", "Move slowly and steadily", "Ensure good lighting"],
  },
  restroom: {
    title: "Restroom",
    instructions:
      "Record a slow pan of the entire restroom. Show the toilet area including grab bar locations (or absence), the sink and faucet, the mirror, the door, and the overall floor space. Place a credit card on a flat surface for scale. Record for 20-40 seconds.",
    tips: ["Start at the door, pan clockwise", "Show grab bar mounting points clearly", "Capture the floor clearance area"],
  },
  parking: {
    title: "Parking Lot",
    instructions:
      "Walk through the accessible parking area. Show the parking spaces, signage (both ground markings and vertical signs), access aisles, and the path from parking to the building entrance including any curb ramps. Record for 20-40 seconds.",
    tips: ["Capture signage from a readable distance", "Show the path to the entrance", "Include curb ramp if present"],
  },
  hallway: {
    title: "Hallway / Corridor",
    instructions:
      "Walk slowly down the hallway. Show the full width, any obstacles, signage, and floor surface. Place a credit card on the floor for scale. Record for 15-30 seconds.",
    tips: ["Walk down the center", "Capture any narrowing points", "Show both walls"],
  },
  dining: {
    title: "Dining Area",
    instructions:
      "Pan through the dining area showing table heights, aisle widths between tables, and accessible seating arrangements. Record for 20-40 seconds.",
    tips: ["Show table heights at eye level", "Capture aisle widths", "Include accessible seating"],
  },
  counter: {
    title: "Service Counter",
    instructions:
      "Record the service counter showing its height from the floor, accessible section if any, and the approach space. Place a credit card on the counter for scale. Record for 15-30 seconds.",
    tips: ["Show the counter height clearly", "Capture the accessible lowered section", "Show approach clearance"],
  },
};

export default function CapturePage() {
  const router = useRouter();
  const { id, moduleType } = useParams<{ id: string; moduleType: string }>();
  const info = MODULE_INSTRUCTIONS[moduleType] ?? MODULE_INSTRUCTIONS.entrance;

  const [mode, setMode] = useState<"choose" | "record" | "upload">("choose");
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (e) {
      setError("Could not access camera. Please allow camera permissions.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function handleSubmit() {
    const file = uploadFile ?? (videoBlob ? new File([videoBlob], "recording.webm", { type: "video/webm" }) : null);
    if (!file) {
      setError("No video selected.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { module_id } = await createModule(id, moduleType);
      await uploadVideo(id, module_id, file);
      router.push(`/audit/${id}/processing/${module_id}`);
    } catch (e) {
      setError("Upload failed. Please try again.");
      setSubmitting(false);
    }
  }

  const previewUrl = videoUrl ?? (uploadFile ? URL.createObjectURL(uploadFile) : null);
  const hasVideo = !!videoBlob || !!uploadFile;

  return (
    <div className="max-w-xl mx-auto">
      <button
        onClick={() => router.push(`/audit/${id}/modules`)}
        className="text-sm text-blue-600 hover:underline mb-4 inline-flex items-center gap-1"
      >
        ← Back to modules
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">{info.title}</h1>

      {/* Instructions */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 mb-6">
        <p className="text-slate-700 text-sm">{info.instructions}</p>
        <ul className="mt-3 flex flex-col gap-1">
          {info.tips.map((tip) => (
            <li key={tip} className="text-xs text-blue-700 flex items-center gap-1">
              <span>💡</span> {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Mode selection */}
      {mode === "choose" && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode("record")}
            className="rounded-xl border-2 border-blue-600 bg-white p-6 flex flex-col items-center gap-2
                       hover:bg-blue-50 transition-colors"
          >
            <span className="text-4xl">📹</span>
            <span className="font-bold text-blue-700">Record Video</span>
            <span className="text-xs text-slate-500 text-center">Use your camera now</span>
          </button>
          <button
            onClick={() => setMode("upload")}
            className="rounded-xl border-2 border-slate-300 bg-white p-6 flex flex-col items-center gap-2
                       hover:border-slate-400 transition-colors"
          >
            <span className="text-4xl">📁</span>
            <span className="font-bold text-slate-700">Upload File</span>
            <span className="text-xs text-slate-500 text-center">MP4 or WebM, max 100MB</span>
          </button>
        </div>
      )}

      {/* Record mode */}
      {mode === "record" && !hasVideo && (
        <div className="flex flex-col gap-4">
          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
            <video ref={videoRef} muted className="w-full h-full object-cover" />
            {recording && (
              <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
              </div>
            )}
          </div>
          {!recording ? (
            <button
              onClick={startRecording}
              className="w-full rounded-xl bg-red-600 text-white py-3 font-bold hover:bg-red-700 transition-colors"
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full rounded-xl bg-slate-700 text-white py-3 font-bold hover:bg-slate-800 transition-colors"
            >
              Stop Recording
            </button>
          )}
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && !hasVideo && (
        <div className="flex flex-col gap-4">
          <label className="rounded-xl border-2 border-dashed border-slate-300 p-10 flex flex-col items-center gap-3
                            cursor-pointer hover:border-blue-400 transition-colors">
            <span className="text-4xl">📁</span>
            <span className="text-slate-600 font-medium">Click to select video file</span>
            <span className="text-xs text-slate-400">MP4 or WebM, max 100MB</span>
            <input
              type="file"
              accept="video/mp4,video/webm"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setUploadFile(f);
              }}
            />
          </label>
        </div>
      )}

      {/* Preview + submit */}
      {hasVideo && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl overflow-hidden bg-slate-900 aspect-video">
            {previewUrl && (
              <video src={previewUrl} controls className="w-full h-full object-contain" />
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setVideoBlob(null); setVideoUrl(null); setUploadFile(null); }}
              className="flex-1 rounded-xl border border-slate-300 py-3 font-medium text-slate-600 hover:bg-slate-50"
            >
              Retake / Replace
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-blue-700 text-white py-3 font-bold hover:bg-blue-800
                         transition-colors disabled:opacity-60"
            >
              {submitting ? "Uploading..." : "Submit for Analysis"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}
    </div>
  );
}
