"""
Step 5A: Gemini Feature Detection

Sends key frames to Gemini 2.5 Flash with module-specific structured prompts.
Two calls per module:
  1. Feature classification (structured JSON)
  2. Bounding box extraction for measurement targets
"""

import base64
import json
import logging
from pathlib import Path
from typing import List, Optional

from google import genai  # type: ignore
from google.genai import types as genai_types  # type: ignore

from config import GEMINI_API_KEY, FRAMES_DIR

logger = logging.getLogger(__name__)

_genai_client = None

def _get_client():
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(api_key=GEMINI_API_KEY)
    return _genai_client

_SYSTEM_PREFIX = (
    "You are analyzing a physical building space for ADA accessibility features. "
    "Focus only on what is visually present. Do not guess measurements — only classify what you see. "
    "Return ONLY a JSON object with the exact structure specified. No markdown, no explanation."
)

MODULE_SCHEMAS = {
    "entrance": {
        "door_detected": "bool",
        "door_type": "single_swing | double | sliding | revolving | none",
        "handle_type": "lever | round_knob | push_bar | pull_handle | none_visible",
        "threshold_visible": "bool",
        "threshold_appears_raised": "bool",
        "signage_isa_symbol_present": "bool",
        "signage_directional_present": "bool",
        "ramp_present": "bool",
        "handrails_present": "bool",
        "handrails_both_sides": "bool",
        "obstructions_in_path": ["string"],
        "reference_object_detected": "bool",
        "reference_object_type": "credit_card | paper | none",
        "estimated_door_width_relative": "narrow | standard | wide",
        "confidence": "0.0-1.0",
    },
    "restroom": {
        "grab_bars_present": "bool",
        "grab_bars_both_sides": "bool",
        "grab_bar_type": "wall_mounted | fold_down | none",
        "toilet_detected": "bool",
        "sink_detected": "bool",
        "sink_type": "pedestal | wall_mounted | vanity",
        "faucet_type": "lever | knob | sensor | none_visible",
        "mirror_detected": "bool",
        "mirror_appears_tilted": "bool",
        "door_detected": "bool",
        "door_swings": "inward | outward | sliding | unknown",
        "coat_hook_detected": "bool",
        "paper_dispenser_height_relative": "low | standard | high",
        "floor_appears_slip_resistant": "bool",
        "estimated_clearance_relative": "tight | adequate | spacious",
        "confidence": "0.0-1.0",
    },
    "parking": {
        "accessible_spaces_detected": "number",
        "isa_signage_present": "bool",
        "vertical_sign_present": "bool",
        "van_accessible_sign_present": "bool",
        "striping_visible": "bool",
        "access_aisle_visible": "bool",
        "curb_ramp_present": "bool",
        "route_to_entrance_clear": "bool",
        "surface_appears_level": "bool",
        "obstructions": ["string"],
        "confidence": "0.0-1.0",
    },
    "hallway": {
        "width_appears": "narrow | standard | wide",
        "obstructions_present": "bool",
        "obstructions": ["string"],
        "floor_surface_type": "string",
        "floor_appears_level": "bool",
        "signage_visible": "bool",
        "handrails_present": "bool",
        "reference_object_detected": "bool",
        "confidence": "0.0-1.0",
    },
    "dining": {
        "tables_detected": "bool",
        "accessible_table_height_visible": "bool",
        "aisle_width_appears": "narrow | standard | wide",
        "accessible_seating_present": "bool",
        "reference_object_detected": "bool",
        "confidence": "0.0-1.0",
    },
    "counter": {
        "counter_detected": "bool",
        "counter_height_appears": "standard | lowered | mixed",
        "accessible_section_present": "bool",
        "approach_clearance_appears": "narrow | adequate | spacious",
        "reference_object_detected": "bool",
        "confidence": "0.0-1.0",
    },
}

BBOX_FIELDS = {
    "entrance": ["door_bounding_box"],
    "restroom": ["clearance_bounding_box"],
    "parking": [],
    "hallway": [],
    "dining": [],
    "counter": ["counter_bounding_box"],
}


def _load_frame_as_part(frame_path: str):
    """Load a frame from disk and return a Gemini-compatible image part."""
    full_path = FRAMES_DIR / frame_path
    with open(str(full_path), "rb") as f:
        data = f.read()
    return genai_types.Part.from_bytes(data=data, mime_type="image/jpeg")


def _call_gemini(parts: list, prompt: str, retries: int = 2) -> dict:
    """Call Gemini 2.5 Flash with image parts and return parsed JSON."""
    contents = [prompt] + parts
    config = genai_types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.1,
    )
    for attempt in range(retries + 1):
        try:
            response = _get_client().models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=config,
            )
            text = response.text.strip()
            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except json.JSONDecodeError as e:
            if attempt == retries:
                logger.error(f"Gemini returned invalid JSON after {retries+1} attempts: {e}")
                raise
            logger.warning(f"Gemini JSON parse error (attempt {attempt+1}), retrying...")
        except Exception as e:
            if attempt == retries:
                raise
            logger.warning(f"Gemini API error (attempt {attempt+1}): {e}")
    return {}


async def analyze_module(
    module_type: str,
    frame_paths: List[str],
    include_bboxes: bool = True,
) -> dict:
    """
    Call 1: Feature classification
    Call 2 (optional): Bounding box extraction for measurement
    Returns merged result dict.
    """
    schema = MODULE_SCHEMAS.get(module_type, MODULE_SCHEMAS["entrance"])
    schema_str = json.dumps(schema, indent=2)

    # Use up to 8 frames for analysis
    selected_paths = frame_paths[:8]
    image_parts = []
    for p in selected_paths:
        try:
            image_parts.append(_load_frame_as_part(p))
        except Exception as e:
            logger.warning(f"Could not load frame {p}: {e}")

    if not image_parts:
        raise ValueError("No frames available for Gemini analysis.")

    # Call 1: Feature classification
    prompt1 = (
        f"{_SYSTEM_PREFIX}\n\n"
        f"Analyze this {module_type} area for ADA accessibility features.\n"
        f"Return ONLY a JSON object with this exact structure:\n{schema_str}"
    )

    result = _call_gemini(image_parts, prompt1)

    # Call 2: Bounding boxes for measurement targets
    bbox_fields = BBOX_FIELDS.get(module_type, [])
    if include_bboxes and bbox_fields:
        bbox_targets = ", ".join(f.replace("_bounding_box", "") for f in bbox_fields)
        bbox_schema = {f: {"x1": "0.0-1.0", "y1": "0.0-1.0", "x2": "0.0-1.0", "y2": "0.0-1.0"} for f in bbox_fields}
        prompt2 = (
            f"{_SYSTEM_PREFIX}\n\n"
            f"For each of the following features detected in these {module_type} images, "
            f"return normalized bounding box coordinates (0.0 to 1.0) for: {bbox_targets}.\n"
            "If a feature is not visible, omit it from the response.\n"
            f"Return ONLY a JSON object with this exact structure:\n{json.dumps(bbox_schema, indent=2)}"
        )
        try:
            bbox_result = _call_gemini(image_parts, prompt2)
            result.update(bbox_result)
        except Exception as e:
            logger.warning(f"Bounding box extraction failed: {e}. Proceeding without.")

    return result


def get_default_result(module_type: str) -> dict:
    """Return a safe default result when Gemini is unavailable."""
    defaults = {
        "entrance": {
            "door_detected": False,
            "door_type": "none",
            "handle_type": "none_visible",
            "threshold_visible": False,
            "threshold_appears_raised": False,
            "signage_isa_symbol_present": False,
            "signage_directional_present": False,
            "ramp_present": False,
            "handrails_present": False,
            "handrails_both_sides": False,
            "obstructions_in_path": [],
            "reference_object_detected": False,
            "reference_object_type": "none",
            "estimated_door_width_relative": "standard",
            "confidence": 0.0,
        },
        "restroom": {
            "grab_bars_present": False,
            "grab_bars_both_sides": False,
            "grab_bar_type": "none",
            "toilet_detected": False,
            "sink_detected": False,
            "sink_type": "wall_mounted",
            "faucet_type": "none_visible",
            "mirror_detected": False,
            "mirror_appears_tilted": False,
            "door_detected": False,
            "door_swings": "unknown",
            "coat_hook_detected": False,
            "paper_dispenser_height_relative": "standard",
            "floor_appears_slip_resistant": True,
            "estimated_clearance_relative": "adequate",
            "confidence": 0.0,
        },
        "parking": {
            "accessible_spaces_detected": 0,
            "isa_signage_present": False,
            "vertical_sign_present": False,
            "van_accessible_sign_present": False,
            "striping_visible": False,
            "access_aisle_visible": False,
            "curb_ramp_present": False,
            "route_to_entrance_clear": False,
            "surface_appears_level": True,
            "obstructions": [],
            "confidence": 0.0,
        },
    }
    return defaults.get(module_type, {"confidence": 0.0})
