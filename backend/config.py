import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "passline")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
FEATHERLESS_API_KEY = os.getenv("FEATHERLESS_API_KEY", "")
FEATHERLESS_MODEL = os.getenv("FEATHERLESS_MODEL", "meta-llama/Meta-Llama-3.1-70B-Instruct")

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
FRAMES_DIR = Path(os.getenv("FRAMES_DIR", "./frames"))
REPORTS_DIR = Path(os.getenv("REPORTS_DIR", "./reports"))
DEPTH_MODEL_PATH = Path(os.getenv("DEPTH_MODEL_PATH", "./checkpoints/depth_anything_v2_vits.pth"))

for d in (UPLOAD_DIR, FRAMES_DIR, REPORTS_DIR):
    d.mkdir(parents=True, exist_ok=True)

BLUR_THRESHOLD = 100.0
SSIM_DUPLICATE_THRESHOLD = 0.92
MIN_FRAMES = 3
MAX_FRAMES = 12
EXTRACT_FPS = 2

MODULE_TYPES = ["entrance", "hallway", "restroom", "parking", "dining", "counter"]

MODULE_INSTRUCTIONS = {
    "entrance": {
        "title": "Entrance / Door",
        "instructions": (
            "Walk slowly through your entrance area. Include the door fully open if possible, "
            "the handle/hardware, the threshold at floor level, and any signage nearby. "
            "Place a credit card flat on the door frame for measurement reference if possible. "
            "Record for 15-30 seconds."
        ),
        "tips": [
            "Hold phone at chest height",
            "Move slowly and steadily",
            "Ensure good lighting",
        ],
    },
    "restroom": {
        "title": "Restroom",
        "instructions": (
            "Record a slow pan of the entire restroom. Show the toilet area including grab bar "
            "locations (or absence), the sink and faucet, the mirror, the door, and the overall "
            "floor space. Place a credit card on a flat surface for scale. Record for 20-40 seconds."
        ),
        "tips": [
            "Start at the door, pan clockwise",
            "Show grab bar mounting points clearly",
            "Capture the floor clearance area",
        ],
    },
    "parking": {
        "title": "Parking Lot",
        "instructions": (
            "Walk through the accessible parking area. Show the parking spaces, signage (both "
            "ground markings and vertical signs), access aisles, and the path from parking to "
            "the building entrance including any curb ramps. Record for 20-40 seconds."
        ),
        "tips": [
            "Capture signage from a readable distance",
            "Show the path to the entrance",
            "Include curb ramp if present",
        ],
    },
    "hallway": {
        "title": "Hallway / Corridor",
        "instructions": (
            "Walk slowly down the hallway. Show the full width, any obstacles, signage, and "
            "floor surface. Place a credit card on the floor for scale. Record for 15-30 seconds."
        ),
        "tips": [
            "Walk down the center",
            "Capture any narrowing points",
            "Show both walls",
        ],
    },
    "dining": {
        "title": "Dining Area",
        "instructions": (
            "Pan through the dining area showing table heights, aisle widths between tables, "
            "and accessible seating arrangements. Record for 20-40 seconds."
        ),
        "tips": [
            "Show table heights at eye level",
            "Capture aisle widths",
            "Include accessible seating",
        ],
    },
    "counter": {
        "title": "Service Counter",
        "instructions": (
            "Record the service counter showing its height from the floor, accessible section "
            "if any, and the approach space. Place a credit card on the counter for scale. "
            "Record for 15-30 seconds."
        ),
        "tips": [
            "Show the counter height clearly",
            "Capture the accessible lowered section",
            "Show approach clearance",
        ],
    },
}
