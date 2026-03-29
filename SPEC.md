# PASSLINE — System Specification

ADA accessibility audit tool. A user records video of rooms in their building; the system automatically detects accessibility violations and produces a PDF compliance report with remediation cost estimates.

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│  React Frontend  (client/, port 3000)│
│  Create React App · React 19         │
└────────────────┬────────────────────┘
                 │ HTTP / REST (localhost:8000)
┌────────────────▼────────────────────┐
│  FastAPI Backend  (backend/, port 8000)│
│  Python 3.11 · async via asyncio     │
└──────┬──────────────────────┬───────┘
       │                      │
┌──────▼──────┐    ┌──────────▼──────┐
│ MongoDB Atlas│    │  AI / ML APIs   │
│ (Motor async)│    │ Gemini 2.5 Flash│
└─────────────┘    │ Featherless LLM │
                   │ DepthAnything V2│
                   └─────────────────┘
```

---

## Directory Structure

```
hackIndy-nameHere/
├── client/                   # React frontend
│   └── src/
│       ├── App.js            # Route definitions
│       ├── api.js            # All fetch calls to backend
│       └── pages/
│           ├── StartPage.js
│           ├── AuditChoicePage.js
│           ├── DashboardPage.js
│           ├── SurveyPage.js
│           ├── ModulesPage.js
│           ├── VideoUploadPage.js
│           └── ReportPage.js
│
└── backend/
    ├── main.py               # FastAPI app, CORS, MongoDB lifespan
    ├── config.py             # Env vars, directory paths, constants
    ├── models/
    │   └── audit.py          # Pydantic models (Violation, AuditDocument, etc.)
    ├── routers/
    │   ├── audits.py         # POST /audits, PUT questionnaire, GET audit
    │   ├── modules.py        # Module CRUD + background pipeline
    │   └── reports.py        # POST/GET /report
    └── services/
        ├── video_processing.py    # FFmpeg frame extraction
        ├── calibration.py         # Reference object scale detection
        ├── depth_estimation.py    # DepthAnything V2 inference
        ├── gemini_analysis.py     # Gemini feature detection + room classification
        ├── feature_rules.py       # Deterministic ADA rule evaluation
        ├── compliance_checker.py  # Legacy compliance checker (unused in pipeline)
        └── report_generator.py    # Deduplication, scoring, narratives, PDF
```

---

## Frontend Pages & Navigation

```
/           StartPage       → /dashboard  (after entering name)
/dashboard  DashboardPage   → /survey  (new audit)  or  /report  (view past)
/survey     SurveyPage      → /modules  (on success)
/modules    ModulesPage     → /module/auto  (per room)  or  /report
/module/:id VideoUploadPage → /modules  (on complete)
/report     ReportPage      (terminal — shows results + PDF link)
```

`AuditChoicePage` (`/audit-choice`) has been removed — its "New Audit / Past Audits" choice is redundant with the Dashboard which already has both actions. `StartPage` now navigates directly to `/dashboard` after name entry.

Every page shows the Passline logo (✓ + wordmark) in the top-left as a link to `/dashboard`. `SurveyPage` and `VideoUploadPage` both have a dedicated header bar for this; other pages already had one.

### ModulesPage Room Naming

Each module card on `/modules` displays the room's auto-classified name by default (`META_LABEL[module_type]`). Users can rename a room at any time (except while it is actively processing) by clicking the pencil button (✏️) next to the label. This opens an inline text input pre-filled with the current name. Pressing Enter or clicking away saves the name via `PATCH /api/audits/{id}/modules/{mid}/name`; pressing Escape cancels. The updated name is reflected immediately in the card and will appear as the room section header in the generated PDF report (`room_name` takes precedence over the auto-classified type label).

### localStorage Keys

| Key | Set by | Used by |
|---|---|---|
| `auditId` | SurveyPage (after createAudit) | ModulesPage, VideoUploadPage, ReportPage |
| `surveyAnswers` | SurveyPage | ModulesPage (display), ReportPage |
| `currentAutoModuleId` | ModulesPage (handleAddRoom) | VideoUploadPage |
| `auditModuleIds` | VideoUploadPage (non-auto modules) | VideoUploadPage |
| `auditModules` | ModulesPage (poll sync) | *(legacy — ReportPage now reads directly from the backend report API)* |

---

## Backend API Endpoints

### Audits Router (`routers/audits.py`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/audits` | Create new audit document in MongoDB |
| PUT | `/api/audits/{audit_id}/questionnaire` | Save facility info, compute applicable rules |
| GET | `/api/audits/{audit_id}` | Fetch full audit document including all modules |

### Modules Router (`routers/modules.py`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/audits/{id}/modules` | Create module doc, returns `module_id` + recording instructions |
| POST | `/api/audits/{id}/modules/{mid}/upload` | Accept video file, kick off background pipeline |
| GET | `/api/audits/{id}/modules/{mid}/status` | Poll processing status and progress % |
| GET | `/api/audits/{id}/modules/{mid}/results` | Fetch violations + frames once complete |
| PATCH | `/api/audits/{id}/modules/{mid}/name` | Set a custom room name (`{"room_name": "..."}`) |

### Reports Router (`routers/reports.py`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/audits/{id}/report` | Trigger report generation (runs async) |
| GET | `/api/audits/{id}/report` | Poll for completed report + PDF URL |

### Static File Mounts
| Mount | Directory | Served |
|---|---|---|
| `/uploads` | `./uploads/` | Raw uploaded videos |
| `/frames` | `./frames/` | Extracted JPEG frames + annotated frames |
| `/reports` | `./reports/` | Generated PDF files |

---

## MongoDB Data Model

Single collection: `audits`

```json
{
  "audit_id": "uuid",
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime",
  "facility": {
    "state": "IN",
    "facility_type": "restaurant",
    "building_age": "1992-2012",
    "recent_renovation": false,
    "parking_spaces": 10
  },
  "applicable_rules": ["door_width_narrow", "toilet_grab_bar_missing", ...],
  "modules": [
    {
      "module_id": "uuid",
      "module_type": "restroom",
      "status": "complete",
      "progress": 100,
      "video_path": "uploads/...",
      "key_frames": ["audit_id/module_id/frame_001.jpg", ...],
      "gemini_analysis": {"features": [...]},
      "depth_measurements": {...},
      "calibrated": false,
      "violations": [{...Violation...}],
      "annotated_frames": ["audit_id/module_id/annotated_001.jpg"],
      "depth_map_frames": ["audit_id/module_id/depth_001.jpg"]
    }
  ],
  "report": {
    "overall_score": 74.0,
    "total_violations": 5,
    "critical_violations": 2,
    "modules_audited": 3,
    "estimated_remediation_total": {"low": 1200, "high": 6400},
    "generated_at": "ISO datetime",
    "pdf_path": "audit_uuid.pdf",
    "violations": [{...ViolationWithNarrative...}]
  }
}
```

### Module Status FSM
```
created → extracting_frames → classifying → analyzing → checking_compliance → complete
                                                                            ↘ error
```

---

## Video Processing Pipeline

Every uploaded video runs through a 7-step async background pipeline in `routers/modules.py → run_processing_pipeline()`.

### Step 1 — Video Upload
**File:** `routers/modules.py`
Video is written to `uploads/{audit_id}_{module_id}.mp4`. Module status set to `extracting_frames`.

---

### Step 2 — Key Frame Extraction
**File:** `services/video_processing.py`
**Library:** FFmpeg (subprocess), OpenCV

- Runs FFmpeg to extract frames at `EXTRACT_FPS` (2 fps)
- Filters frames by blur score (Laplacian variance, threshold `BLUR_THRESHOLD = 100`) --> not using anymore
- Removes near-duplicate frames using SSIM similarity (`SSIM_DUPLICATE_THRESHOLD = 0.92`)
- Keeps between `MIN_FRAMES = 3` and `MAX_FRAMES = 20` frames
- Saves JPEGs to `frames/{audit_id}/{module_id}/frame_NNN.jpg`
- Returns list of relative paths

---

### Step 3 — Room Auto-Classification
**File:** `services/gemini_analysis.py → classify_room()`
**Library:** `google-genai`
**Model:** Gemini 2.5 Flash

Only runs when `module_type == "auto"` (all user-initiated audits).

- Sends up to 5 frames to Gemini with a closed-list prompt
- Gemini returns one value from the 34-item `MODULE_TYPES` list (e.g. `"restroom"`, `"hallway"`)
- Module doc is updated with the detected `module_type`
- Falls back to `"entrance"` if classification fails

**34 room types** span: universal (entrance, hallway, restroom, parking, elevator, stairway, signage, drinking_fountain), dining, retail, office, medical, hotel, education, assembly.

The classified `module_type` feeds into two places downstream: as the UI label shown to the user (and the room section header in the PDF), and as a direct input to Step 6 Pass B for **module-level rule generation**. This is the multimodal aspect of the pipeline — the same video produces both a feature list (Step 5A) and a room classification (Step 3), and compliance rules are generated independently from each.

---

### Step 4 — Reference Object Calibration
**File:** `services/calibration.py`
**Library:** OpenCV (Canny edge detection, contour analysis)

Attempts to find a credit card (3.375″ × 2.125″) or US letter paper (11″ × 8.5″) in any frame by:
1. Gaussian blur + Canny edge detection
2. External contour extraction
3. Approximate polygon detection (4-sided shapes)
4. Aspect ratio matching (±10% tolerance)

Returns `pixels_per_inch` if found, enabling real-world measurement from depth data.
`calibrated = False` when no reference object is found — violations are still detected but noted as uncalibrated.

---

### Step 5A — Gemini Feature Detection
**File:** `services/gemini_analysis.py → analyze_features()`
**Library:** `google-genai`
**Model:** Gemini 2.5 Flash

Core AI step. Replaces the older module-schema approach with a single universal call.

- Sends up to 16 frames with a structured prompt
- Gemini returns every ADA-relevant feature it can see
- Features must be one of a **40-type closed enum**:

```
door, door_hardware, door_threshold, door_closer,
toilet, toilet_grab_bar, sink, sink_faucet, sink_clearance,
mirror, paper_dispenser, soap_dispenser, coat_hook,
grab_bar, handrail, stair, stair_nosing, tactile_warning_strip,
ramp, curb_cut, hallway, floor_surface,
parking_space, parking_sign, parking_access_aisle, curb_ramp,
counter, service_window, checkout_lane,
signage, braille_signage, exit_sign,
elevator_door, elevator_button, elevator_interior,
drinking_fountain, seating, bench, pool_lift
```

Each detected feature includes:
- `feature_type` — one of the 40 types above
- `properties` — key/value observations (e.g. `{"handle_type": "round_knob", "width_relative": "narrow"}`)
- `confidence` — float 0.0–1.0
- `frame_index` — which frame showed this feature most clearly

Result is stored as `gemini_analysis: {"features": [...]}` in MongoDB.

---

### Step 5B — Depth Estimation
**File:** `services/depth_estimation.py`
**Library:** PyTorch, DepthAnything V2 (local repo at `backend/Depth-Anything-V2/`)
**Model:** `depth_anything_v2_vits.pth` (ViT-Small, indoor metric depth)

- Model is **lazy-loaded** on first use (avoids blocking startup)
- Runs per-frame inference to produce HxW float32 depth maps (meters)
- Combined with calibration `pixels_per_inch` to derive real measurements (door widths, clearances)
- Depth map visualizations saved to `frames/{audit_id}/{module_id}/depth_NNN.jpg`
- Falls back gracefully if model weights not found

---

### Step 6 — Compliance Rule Evaluation
**File:** `services/feature_rules.py`
**No external API — fully deterministic**

Rule evaluation runs two passes driven by the two Gemini outputs from earlier steps, combining their results into the final violations list:

#### Pass A — Feature-level rules (`check_feature_compliance()`)
- Iterates all detected features from Step 5A
- For each feature type, looks up matching rules in `FEATURE_RULES` dict
- Calls each rule's `condition(properties)` lambda — returns `True` if violation applies
- Generates a `Violation` for each triggered rule

#### Pass B — Module-level rules (`check_module_compliance()`)
- Uses the classified `module_type` from Step 3 (e.g. `"restroom"`, `"hallway"`)
- Looks up the room type in `MODULE_RULES` dict — a separate rule set covering whole-room ADA requirements that may not be derivable from individual features alone
- Applies rules for features that are expected to be present in that room type but were not detected (e.g. a restroom classification triggers rules for required grab bars even if no `grab_bar` feature was returned by Gemini)
- Condition lambdas receive both the `module_type` and the full set of detected feature types, enabling absence-based violations

**Combined output:** violations from both passes are merged, deduped by `(rule_id, feature_type)` if the same violation is triggered by both, then sorted by severity before being stored.

**~35 feature rules** covering all 40 feature types + **~20 module rules** covering the 34 room types, each with:
- Condition lambda
- Severity: `critical | high | medium | low`
- ADA citation (e.g. `ADA §404.2.7`)
- Remediation cost range (e.g. `$75–$200`)
- Finding text generator lambda

The `Violation.module_type` field stores the **feature type** for Pass A violations (e.g. `"door_hardware"`) and the **room type** for Pass B violations (e.g. `"restroom"`), allowing per-source attribution in the report.

---

### Step 7 — Annotated Frame Generation
**File:** `routers/modules.py → _generate_annotated_frames()`
**Library:** OpenCV

Draws bounding boxes for every detected feature onto the frames and saves annotated copies to `frames/{audit_id}/{module_id}/annotated_NNN.jpg`.

The Gemini prompt in `analyze_features()` now requests an optional `bounding_box: {x1, y1, x2, y2}` (normalized 0–1) per feature alongside `feature_type`, `properties`, `confidence`, and `frame_index`.

Annotation behavior:
- Features are grouped by `frame_index` so each frame only gets boxes for features Gemini localized to that frame
- Each feature type gets a consistent color (cycles through 8 colors across the run)
- When a bbox is present: draws a colored rectangle + filled label background with black text for readability
- When no bbox is returned: prints the feature label as stacked text in the top-left corner of the frame as a fallback

---

## Report Generation Pipeline

Triggered by `POST /api/audits/{id}/report`. Runs in `services/report_generator.py`.

### Step 1 — Collect Per-Room Violations
- Gathers violations from every `status == "complete"` module
- **No deduplication** — if the same violation type (e.g. missing grab bar) appears in two rooms, both instances are kept and listed under their respective rooms
- Violations are sorted by severity (`critical → high → medium → low`) within each module group

### Step 2 — Score Computation
```
score = (applicable_rules - total_violations) / applicable_rules × 100
```
`total_violations` is the full count including duplicates across rooms. `applicable_rules` is the set filtered during questionnaire submission.

### Step 3 — Narrative Generation
**Library:** `openai` SDK (pointed at Featherless API)
**Model:** `meta-llama/Meta-Llama-3.1-70B-Instruct` (or `FEATHERLESS_MODEL` env var)

For each violation (all rooms), calls the LLM to produce three prose fields:
- `description` — plain-language explanation of the violation
- `remediation` — actionable fix steps
- `priority_rationale` — why this severity level applies

Up to 5 requests run concurrently (asyncio Semaphore). Falls back to raw `finding` text on failure.

### Step 4 — PDF Generation
**Library:** ReportLab

Generates `reports/audit_{audit_id}.pdf` with:
- Cover page: facility info table, compliance score (color-coded), summary stats
- **Violations by Room**: one section per audited room (e.g. "Restroom", "Hallway"), each listing all violations found in that room with severity color, ADA citation, finding, description, remediation, and cost estimate
- Rooms with no violations still appear with a "No violations found" note

### Step 5 — MongoDB Persist
Full report stored under `audit.report` with:
- `violations` — flat list of all violations across all rooms
- `module_violations` — violations grouped by room: `[{module_id, module_type, room_name, violations: [...]}]`
- `generated_at` — ISO timestamp of when this report was generated

### GET /report Response Shape
```json
{
  "overall_score": 72.0,
  "total_violations": 4,
  "critical_violations": 1,
  "modules_audited": 2,
  "violations": [...],
  "module_violations": [
    { "module_id": "...", "module_type": "restroom", "room_name": "Bathroom 1", "violations": [...] }
  ],
  "estimated_remediation_total": { "low": 1200, "high": 4500 },
  "generated_at": "2026-03-29T14:00:00",
  "pdf_url": "/reports/audit_xxx.pdf"
}
```

### ReportPage Freshness Check
`ReportPage` records the time it calls `triggerReport`, then polls `GET /report` every 3 seconds. It only accepts a report whose `generated_at` is ≥ the trigger time. This prevents the frontend from displaying a stale cached report from a prior session while the new one is still generating. A 2-minute fallback timeout shows whatever data is available if generation takes too long.

---

## Configuration (`config.py` + `.env`)

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | Atlas connection string |
| `MONGODB_DB` | `passline` | Database name |
| `GEMINI_API_KEY` | — | Gemini 2.5 Flash |
| `FEATHERLESS_API_KEY` | — | Featherless LLM gateway |
| `FEATHERLESS_MODEL` | `meta-llama/Meta-Llama-3.1-70B-Instruct` | Narrative model |
| `UPLOAD_DIR` | `./uploads` | Raw video storage |
| `FRAMES_DIR` | `./frames` | Extracted + annotated frames |
| `REPORTS_DIR` | `./reports` | PDF output |
| `DEPTH_MODEL_PATH` | `./checkpoints/depth_anything_v2_vits.pth` | Model weights |
| `BLUR_THRESHOLD` | `100.0` | Frame quality filter |
| `SSIM_DUPLICATE_THRESHOLD` | `0.92` | Duplicate frame filter |
| `EXTRACT_FPS` | `2` | Frame extraction rate |
| `MIN_FRAMES` / `MAX_FRAMES` | `3` / `12` | Frame count bounds |

---

## Key Libraries

### Backend
| Library | Purpose |
|---|---|
| `fastapi` | HTTP framework |
| `motor` | Async MongoDB driver |
| `certifi` | TLS CA bundle for MongoDB Atlas |
| `python-dotenv` | `.env` file loading |
| `pydantic` | Data models and validation |
| `google-genai` | Gemini 2.5 Flash API |
| `openai` | Featherless LLM API (OpenAI-compatible) |
| `opencv-python` (`cv2`) | Frame extraction, calibration, annotation |
| `torch` | DepthAnything V2 inference |
| `reportlab` | PDF generation |
| `numpy` | Depth map processing |

### Frontend
| Library | Purpose |
|---|---|
| `react` v19 | UI framework |
| `react-router-dom` v7 | Client-side routing |
| `react-scripts` v5 | CRA build tooling |

---

## Important Implementation Notes

### React 19 StrictMode Double-Effect
React 19 StrictMode invokes `useEffect` twice in development. `VideoUploadPage` uses a `createStartedRef = useRef(false)` guard to prevent two `createModule` API calls from spawning duplicate MongoDB entries.

### Lazy Depth Model Loading
`DepthEstimator` is instantiated inside the pipeline on first use (`app.state.depth_estimator = None` at startup). This avoids blocking the FastAPI lifespan with a multi-second PyTorch `torch.load` call.

### Multimodal Compliance Analysis
The pipeline combines **two independent Gemini signals** to drive rule evaluation:

1. **Feature detection** (Step 5A) — a universal Gemini call identifies every ADA-relevant element visible in the video frames, regardless of room type.
2. **Room classification** (Step 3) — a separate Gemini call identifies the room type from the same frames.

Both outputs feed Step 6 independently. Feature-level rules are evaluated against the detected elements; module-level rules are evaluated against the classified room type (e.g. a `restroom` classification triggers required-grab-bar checks even if no `grab_bar` feature was returned). This means a single video generates two complementary sets of violations that are merged into the final report.

Earlier versions used separate Gemini schemas per module type (`MODULE_SCHEMAS`). The current approach replaces that with a single universal feature call plus a separate classification call, keeping detection logic decoupled from room type while still using the classification for whole-room rule coverage.

### CORS Configuration
Frontend may run on ports 3000–3003 depending on what's available. All four origins are explicitly allowed in `main.py`.

### Bbox Coordinate Safety
Gemini sometimes returns bounding box coordinates as strings (`"0.5"` instead of `0.5`). All bbox reads use `float()` conversion before any arithmetic to prevent Python string multiplication.
