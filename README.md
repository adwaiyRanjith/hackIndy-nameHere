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
ANTHROPIC_API_KEY=...
UPLOAD_DIR=./uploads
FRAMES_DIR=./frames
REPORTS_DIR=./reports
DEPTH_MODEL_PATH=./checkpoints/depth_anything_v2_vits.pth
```

## Architecture

```
User records video
    ↓
Frontend (Next.js) → POST /upload → FastAPI
    ↓
FFmpeg: extract frames at 2fps
    ↓
OpenCV: blur filter + SSIM deduplication → 5-12 key frames
    ↓
OpenCV: Canny + contour → reference object calibration (pixels/inch)
    ↓
Gemini 2.5 Flash: structured JSON feature detection per module
    ↓
DepthAnything V2 ViT-S: metric depth maps + measurements
    ↓
Python rule engine: deterministic compliance checks (no LLM)
    ↓
Claude Sonnet: narrative descriptions for each violation
    ↓
ReportLab: PDF generation
    ↓
MongoDB: audit document storage
    ↓
Frontend polls /status → displays report
```

## Modules

| Module   | Rules | Key Checks |
|----------|-------|------------|
| Entrance | 5     | Door width, handle type, threshold, ISA signage, ramp handrails |
| Restroom | 5     | Grab bars, faucet, door swing, clearance, mirror height |
| Parking  | 5     | Space count, signage, van-accessible, access aisle, curb ramp |

## Processing Pipeline Risk Tiers

1. **Best**: Reference object detected → pixel calibration → accurate inch measurements
2. **Good**: No reference, metric depth model → flagged as "estimated"
3. **Fallback**: Gemini relative classifications only → flagged as "screening estimate"
4. **Demo floor**: Feature-presence rules only (no measurements needed)

Decide which tier you're on by hour 16 of development.
