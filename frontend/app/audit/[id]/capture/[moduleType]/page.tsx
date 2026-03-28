"use client";

import { useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createModule, uploadVideo } from "@/lib/api";

const MODULE_INSTRUCTIONS: Record<string, { title: string; instructions: string; tips: string[] }> = {
  // Universal
  entrance: {
    title: "Entrance / Door",
    instructions: "Walk slowly through your entrance area. Include the door fully open if possible, the handle/hardware, the threshold at floor level, and any signage nearby. Place a credit card flat on the door frame for measurement reference if possible. Record for 15-30 seconds.",
    tips: ["Hold phone at chest height", "Move slowly and steadily", "Ensure good lighting"],
  },
  hallway: {
    title: "Hallway / Corridor",
    instructions: "Walk slowly down the hallway. Show the full width, any obstacles, signage, and floor surface. Place a credit card on the floor for scale. Record for 15-30 seconds.",
    tips: ["Walk down the center", "Capture any narrowing points", "Show both walls"],
  },
  restroom: {
    title: "Restroom",
    instructions: "Record a slow pan of the entire restroom. Show the toilet area including grab bar locations (or absence), the sink and faucet, the mirror, the door, and the overall floor space. Place a credit card on a flat surface for scale. Record for 20-40 seconds.",
    tips: ["Start at the door, pan clockwise", "Show grab bar mounting points clearly", "Capture the floor clearance area"],
  },
  parking: {
    title: "Parking Lot",
    instructions: "Walk through the accessible parking area. Show the parking spaces, signage (both ground markings and vertical signs), access aisles, and the path from parking to the building entrance including any curb ramps. Record for 20-40 seconds.",
    tips: ["Capture signage from a readable distance", "Show the path to the entrance", "Include curb ramp if present"],
  },
  elevator: {
    title: "Elevator",
    instructions: "Record the elevator call button panel, the interior cab including floor area and control panel height, door width when fully open, and any braille/tactile signage. Record for 20-30 seconds.",
    tips: ["Show the call button height from the floor", "Capture the interior control panel", "Show the door width when open"],
  },
  stairway: {
    title: "Stairs & Handrails",
    instructions: "Walk the full length of the stairway. Show the handrails on both sides, the height and extension of handrails beyond the top and bottom steps, stair nosing contrast, and any tactile warning strips. Record for 20-30 seconds.",
    tips: ["Show handrail height and grip surface", "Capture both sides of the stairway", "Show the top and bottom handrail extensions"],
  },
  signage: {
    title: "Signage & Wayfinding",
    instructions: "Walk through the facility capturing all directional and room-identification signage. Focus on sign height, braille presence, high-contrast text, and mounting location relative to door frames. Record for 20-40 seconds.",
    tips: ["Get close enough to read sign text", "Show sign height from floor", "Capture braille panels if present"],
  },
  drinking_fountain: {
    title: "Drinking Fountain",
    instructions: "Record the drinking fountain(s) showing the height of the spout and controls, knee clearance underneath (if a hi-lo fountain), and the forward reach distance. Place a credit card on the spout level for scale. Record for 15-20 seconds.",
    tips: ["Show spout height from the floor", "Capture knee clearance underneath", "Include both hi and lo units if present"],
  },
  // Dining / Food Service
  dining: {
    title: "Dining Area",
    instructions: "Pan through the dining area showing table heights, aisle widths between tables, and accessible seating arrangements. Record for 20-40 seconds.",
    tips: ["Show table heights at eye level", "Capture aisle widths", "Include accessible seating"],
  },
  counter: {
    title: "Service Counter",
    instructions: "Record the service counter showing its height from the floor, accessible section if any, and the approach space. Place a credit card on the counter for scale. Record for 15-30 seconds.",
    tips: ["Show the counter height clearly", "Capture the accessible lowered section", "Show approach clearance"],
  },
  outdoor_seating: {
    title: "Outdoor Seating",
    instructions: "Record the outdoor seating area showing table heights, surface material, route from the entrance, and any barriers or obstacles. Record for 20-30 seconds.",
    tips: ["Show the path from entrance to outdoor area", "Capture surface texture (pavers, gravel, etc.)", "Include any accessible table setups"],
  },
  cafeteria: {
    title: "Cafeteria / Dining Hall",
    instructions: "Walk through the cafeteria showing the food service line height and reach, tray slide height, seating area aisles, and accessible table arrangements. Record for 25-40 seconds.",
    tips: ["Show food service counter height", "Capture tray slide accessibility", "Show aisle widths between tables"],
  },
  concession: {
    title: "Concession Stand",
    instructions: "Record the concession stand showing counter height, an accessible lowered section if present, the approach space, and any queue barriers. Record for 15-25 seconds.",
    tips: ["Show full counter height from floor", "Capture accessible section if present", "Show queue/line setup"],
  },
  // Retail
  sales_floor: {
    title: "Sales Floor & Aisles",
    instructions: "Walk down representative aisles showing the clear width between merchandise displays, any protruding objects, floor surface, and accessible route to all areas of the store. Record for 25-40 seconds.",
    tips: ["Walk the narrowest aisles first", "Capture any protruding displays", "Show the path to all departments"],
  },
  checkout: {
    title: "Checkout Counter",
    instructions: "Record the checkout counter area showing counter height, accessible lowered section if present, PIN pad placement, approach clearance, and queue aisle width. Record for 15-25 seconds.",
    tips: ["Show counter height from floor", "Capture PIN pad position and reach", "Show queue aisle width"],
  },
  fitting_room: {
    title: "Fitting / Dressing Room",
    instructions: "Record the accessible fitting room showing the door width, interior turning space, bench height and clear floor space beside it, and hook heights. Record for 20-30 seconds.",
    tips: ["Show door clear width", "Capture interior turning radius space", "Show bench height and side clearance"],
  },
  // Office / Professional
  reception: {
    title: "Reception Desk",
    instructions: "Record the reception desk showing counter height, accessible lowered section, approach space, and any barriers between the visitor and staff. Record for 15-25 seconds.",
    tips: ["Show full counter height", "Capture accessible lowered section", "Show approach clearance"],
  },
  conference_room: {
    title: "Conference Room",
    instructions: "Record the conference room showing the door width, table height, knee clearance under the table, turning space in the room, and accessible path to all seats. Record for 20-35 seconds.",
    tips: ["Show door width when fully open", "Capture table height and knee clearance", "Show turning space in the room"],
  },
  break_room: {
    title: "Break Room / Kitchen",
    instructions: "Record the break room showing counter and appliance heights, knee clearance under the sink, microwave and coffee maker reach distance, and floor clearance. Record for 20-30 seconds.",
    tips: ["Show sink and counter heights", "Capture appliance reach distances", "Show knee clearance under sink"],
  },
  // Medical / Healthcare
  waiting_room: {
    title: "Waiting Room",
    instructions: "Pan through the waiting room showing seating arrangements with accessible spaces for wheelchairs, aisle widths, check-in counter height, and route from entrance. Record for 20-35 seconds.",
    tips: ["Show wheelchair-accessible seating spaces", "Capture aisle widths between chairs", "Show check-in counter height"],
  },
  exam_room: {
    title: "Examination Room",
    instructions: "Record the exam room showing door width, exam table height and any adjustable mechanism, turning space, accessible equipment placement, and grab bars if present. Record for 20-35 seconds.",
    tips: ["Show exam table height from floor", "Capture door width", "Show turning space near table"],
  },
  patient_room: {
    title: "Patient Room",
    instructions: "Record the patient room showing door width, clear floor space on both sides of the bed, bathroom access, call button placement, and any overhead reach equipment. Record for 25-40 seconds.",
    tips: ["Show clear floor space on each side of the bed", "Capture bathroom door width", "Show call button placement"],
  },
  pharmacy: {
    title: "Pharmacy Counter",
    instructions: "Record the pharmacy counter showing counter height, accessible consultation window or lowered section, approach space, and PIN pad placement. Record for 15-25 seconds.",
    tips: ["Show full counter height", "Capture consultation area", "Show accessible reach distances"],
  },
  // Hotel / Lodging
  lobby: {
    title: "Hotel Lobby",
    instructions: "Walk through the lobby showing the check-in desk height and accessible section, seating arrangement, accessible route to elevators and amenities, and any floor surface changes. Record for 25-40 seconds.",
    tips: ["Show check-in desk height", "Capture route to elevator", "Show floor surface transitions"],
  },
  guest_room: {
    title: "Accessible Guest Room",
    instructions: "Record the accessible guest room showing door width, clear floor space around the bed, bathroom with grab bars and roll-in shower or tub, closet rod height, and accessible controls. Record for 35-60 seconds.",
    tips: ["Show clear floor space on each side of the bed", "Capture bathroom grab bars", "Show roll-in shower clearance"],
  },
  pool: {
    title: "Pool & Spa Area",
    instructions: "Record the pool area showing the pool lift or sloped entry, deck surface, changing area access, and route from the locker room to the pool. Record for 25-40 seconds.",
    tips: ["Show pool lift or entry ramp", "Capture deck surface (slip resistance)", "Show route from changing area"],
  },
  fitness_center: {
    title: "Fitness Center",
    instructions: "Walk through the fitness center showing equipment aisle widths, accessible equipment (adjustable machines), locker height, and route from entrance. Record for 25-40 seconds.",
    tips: ["Show aisle widths between equipment", "Capture accessible machine examples", "Show locker and bench heights"],
  },
  // Education
  classroom: {
    title: "Classroom",
    instructions: "Record the classroom showing door width, aisle widths between desks, an accessible desk or table with knee clearance, blackboard/whiteboard reach height, and turning space. Record for 25-40 seconds.",
    tips: ["Show aisle width between desks", "Capture accessible desk knee clearance", "Show whiteboard reach height"],
  },
  gymnasium: {
    title: "Gymnasium",
    instructions: "Walk through the gymnasium showing accessible spectator seating, route from entrance to the floor, locker room access, and any fixed equipment clearances. Record for 25-40 seconds.",
    tips: ["Show accessible spectator area", "Capture route from entrance to floor", "Show locker room door widths"],
  },
  auditorium: {
    title: "Auditorium",
    instructions: "Record the auditorium showing accessible seating spaces (wheelchair locations), companion seat placement, route from entrance to accessible seating, stage access ramp or lift, and sight lines. Record for 30-50 seconds.",
    tips: ["Show wheelchair seating spaces and companion seats", "Capture route to accessible seating", "Show stage access ramp or lift"],
  },
  library: {
    title: "Library",
    instructions: "Walk through the library showing aisle widths between stacks, reach height of shelves, accessible study table knee clearance, catalog terminal height, and checkout counter. Record for 25-40 seconds.",
    tips: ["Show aisle width between shelves", "Capture shelf reach height", "Show study table knee clearance"],
  },
  // Assembly / Entertainment
  assembly_seating: {
    title: "Assembly Seating Area",
    instructions: "Record the seating area showing wheelchair accessible spaces, companion seating, route from entrance, sight lines to the stage or screen, and aisle widths. Record for 25-40 seconds.",
    tips: ["Show wheelchair space dimensions", "Capture companion seat placement", "Show route from entrance to seating"],
  },
  stage: {
    title: "Stage / Performance Access",
    instructions: "Record the stage access route showing any ramps, lifts, or steps, handrail placement, approach clearance, and the performer/presenter area. Record for 20-35 seconds.",
    tips: ["Show ramp or lift for stage access", "Capture handrail height and extension", "Show approach clearance"],
  },
  ticket_booth: {
    title: "Ticket / Box Office",
    instructions: "Record the ticket booth or box office showing counter height, accessible window or lowered section, approach space, and any queue barriers. Record for 15-25 seconds.",
    tips: ["Show counter/window height from floor", "Capture accessible lowered section", "Show approach clearance"],
  },
};

export default function CapturePage() {
  const router = useRouter();
  const { id, moduleType } = useParams<{ id: string; moduleType: string }>();
  const info = MODULE_INSTRUCTIONS[moduleType] ?? { title: moduleType, instructions: "Record this area slowly and steadily for 15-30 seconds.", tips: ["Hold phone at chest height", "Move slowly and steadily", "Ensure good lighting"] };

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
