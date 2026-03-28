"use client";

import { useState } from "react";

interface DepthMapViewerProps {
  originalFrames: string[];
  depthFrames: string[];
  apiBase: string;
}

export default function DepthMapViewer({ originalFrames, depthFrames, apiBase }: DepthMapViewerProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const count = Math.max(originalFrames.length, depthFrames.length);
  if (count === 0) return null;

  const orig = originalFrames[selectedIdx];
  const depth = depthFrames[selectedIdx];

  return (
    <div className="flex flex-col gap-3">
      {/* Side-by-side viewer */}
      <div className="grid grid-cols-2 gap-2">
        {orig && (
          <div>
            <p className="text-xs text-slate-500 mb-1 font-medium">ANNOTATED</p>
            <button
              onClick={() => setExpanded(`${apiBase}/frames/${orig}`)}
              className="rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 w-full"
            >
              <img src={`${apiBase}/frames/${orig}`} alt="Annotated frame" className="w-full object-cover" />
            </button>
          </div>
        )}
        {depth && (
          <div>
            <p className="text-xs text-blue-500 mb-1 font-medium">DEPTH MAP</p>
            <button
              onClick={() => setExpanded(`${apiBase}/frames/${depth}`)}
              className="rounded-lg overflow-hidden border border-blue-200 hover:border-blue-500 w-full"
            >
              <img src={`${apiBase}/frames/${depth}`} alt="Depth map" className="w-full object-cover" />
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {count > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {Array.from({ length: count }).map((_, i) => {
            const frame = originalFrames[i] ?? depthFrames[i];
            return (
              <button
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`flex-shrink-0 rounded overflow-hidden border-2 transition-colors
                  ${i === selectedIdx ? "border-blue-500" : "border-transparent"}`}
              >
                <img
                  src={`${apiBase}/frames/${frame}`}
                  alt={`Frame ${i + 1}`}
                  className="h-14 w-auto object-cover"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setExpanded(null)}
        >
          <img src={expanded} alt="Expanded" className="max-h-screen max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
