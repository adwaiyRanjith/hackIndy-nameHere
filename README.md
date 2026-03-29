# PASSLINE — ADA Compliance Self-Audit

Record video of your building. Get a professional ADA compliance report.

## Quick Start

### Backend

```bash
cd backend

# Create virtualenv
python3 -m venv venv && source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install FFmpeg (required for video processing)
# Ubuntu: sudo apt install ffmpeg
# macOS:  brew install ffmpeg

# Install DepthAnything V2 (optional — falls back to placeholder if unavailable)
git clone https://github.com/DepthAnything/Depth-Anything-V2
pip install -e ./Depth-Anything-V2
# Download ViT-S checkpoint:
# https://huggingface.co/depth-anything/Depth-Anything-V2-Small/resolve/main/depth_anything_v2_vits.pth
# Place at: backend/checkpoints/depth_anything_v2_vits.pth
mkdir -p checkpoints
curl -L -o checkpoints/depth_anything_v2_vits.pth \
  https://huggingface.co/depth-anything/Depth-Anything-V2-Small/resolve/main/depth_anything_v2_vits.pth

# Set environment variables
cp .env.example .env
# Edit .env with your API keys

# Run
source venv/bin/activate && uvicorn main:app --port 8000
```

### Frontend

```bash
cd client
brew install node
npm install
npm start   # Runs on http://localhost:3000
```

## Environment Variables

```
MONGODB_URI=mongodb+srv://...
MONGODB_DB=passline
GEMINI_API_KEY=...
FEATHERLESS_API_KEY=...
FEATHERLESS_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
UPLOAD_DIR=./uploads
FRAMES_DIR=./frames
REPORTS_DIR=./reports
DEPTH_MODEL_PATH=./checkpoints/depth_anything_v2_vits.pth
```

## Architecture

```
User records video
    ↓
Frontend (React) → POST /upload → FastAPI
    ↓
FFmpeg: extract frames at 2fps
    ↓
OpenCV: SSIM deduplication → 3-20 key frames
    ↓
OpenCV: Canny + contour → reference object calibration (pixels/inch)
    ↓
Gemini 2.5 Flash: room classification (34 room types)
    ↓                                      ↓
Gemini 2.5 Flash:              module-level ADA rule set
universal feature detection    (Pass B — driven by room type)
(40 feature types)
    ↓
feature-level ADA rule set
(Pass A — driven by detected features)
    ↓
Violations from both passes merged + deduped
    ↓
DepthAnything V2 ViT-S: metric depth maps + measurements
    ↓
Featherless LLM (Llama 3.1 70B): narrative descriptions for each violation
    ↓
ReportLab: PDF generation
    ↓
MongoDB: audit document storage
    ↓
Frontend polls /status → displays report
```

## Multimodal Compliance Analysis

The pipeline sends the same video frames to Gemini twice for two independent signals:

1. **Feature detection** — identifies every ADA-relevant element visible in the video (doors, grab bars, ramps, signage, etc.) across a 40-type closed enum. Each detected feature is evaluated against feature-level ADA rules (Pass A).

2. **Room classification** — identifies the room type from the same frames (one of 34 types: restroom, hallway, parking, elevator, etc.). The classified type drives a separate set of whole-room ADA rules (Pass B) covering requirements that may not be visible as individual features — for example, a restroom classification triggers required grab-bar checks even if no grab bar appears in the video.

Violations from both passes are merged and deduplicated into a single list per room.

## Processing Pipeline Risk Tiers

1. **Best**: Reference object detected → pixel calibration → accurate inch measurements
2. **Good**: No reference, metric depth model → flagged as "estimated"
3. **Fallback**: Gemini relative classifications only → flagged as "screening estimate"
4. **Demo floor**: Feature-presence rules only (no measurements needed)
