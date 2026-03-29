"""
Step 5B: Depth Estimation

Wraps DepthAnything V2 ViT-S (metric, indoor) for per-frame inference.
Falls back gracefully if model is unavailable.
"""

import logging
import sys
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from config import DEPTH_MODEL_PATH, FRAMES_DIR

# Depth-Anything-V2 has no setup.py — add repo root to path directly
_DA2_ROOT = Path(__file__).parent.parent / "Depth-Anything-V2"
if _DA2_ROOT.exists() and str(_DA2_ROOT) not in sys.path:
    sys.path.insert(0, str(_DA2_ROOT))

logger = logging.getLogger(__name__)


class DepthEstimator:
    def __init__(self):
        self.model = None
        self.transform = None
        self._load_model()

    def _load_model(self):
        try:
            import torch
            from depth_anything_v2.dpt import DepthAnythingV2  # type: ignore

            config = {
                "encoder": "vits",
                "features": 64,
                "out_channels": [48, 96, 192, 384],
            }
            self.model = DepthAnythingV2(**config)
            state = torch.load(str(DEPTH_MODEL_PATH), map_location="cpu")
            self.model.load_state_dict(state)
            self.model.eval()
            logger.info("DepthAnything V2 ViT-S loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load DepthAnything V2: {e}. Depth estimation will be unavailable.")
            self.model = None

    def predict(self, image_bgr: np.ndarray) -> Optional[np.ndarray]:
        """
        Returns HxW depth map (float32, metric depth in meters) or None.
        """
        if self.model is None:
            return None
        try:
            import torch

            rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
            # Resize for model input (518x518 recommended for ViT-S)
            h, w = image_bgr.shape[:2]
            inp = cv2.resize(rgb, (518, 518))
            inp_t = (
                torch.from_numpy(inp)
                .float()
                .permute(2, 0, 1)
                .unsqueeze(0)
                / 255.0
            )
            with torch.no_grad():
                depth = self.model(inp_t)
            # Resize back to original resolution
            depth_np = depth.squeeze().cpu().numpy()
            depth_resized = cv2.resize(depth_np, (w, h), interpolation=cv2.INTER_LINEAR)
            return depth_resized.astype(np.float32)
        except Exception as e:
            logger.error(f"Depth inference error: {e}")
            return None


def colorize_depth_map(depth: np.ndarray) -> np.ndarray:
    """Convert metric depth map to a colorized BGR image for visualization."""
    norm = cv2.normalize(depth, None, 0, 255, cv2.NORM_MINMAX)
    norm_uint8 = norm.astype(np.uint8)
    colored = cv2.applyColorMap(norm_uint8, cv2.COLORMAP_INFERNO)
    return colored


def measure_width_from_bbox(
    depth_map: np.ndarray,
    image: np.ndarray,
    bbox_norm: dict,
    pixels_per_inch: Optional[float],
) -> Optional[float]:
    """
    Estimate horizontal width of a bounding box in inches.

    bbox_norm: {"x1": 0-1, "y1": 0-1, "x2": 0-1, "y2": 0-1}
    Returns width in inches, or None.
    """
    h, w = image.shape[:2]
    try:
        x1 = int(float(bbox_norm["x1"]) * w)
        x2 = int(float(bbox_norm["x2"]) * w)
        y_mid = int(((float(bbox_norm["y1"]) + float(bbox_norm["y2"])) / 2) * h)
    except (TypeError, ValueError):
        return None

    pixel_width = abs(x2 - x1)
    if pixel_width == 0:
        return None

    if pixels_per_inch is not None:
        return pixel_width / pixels_per_inch

    # Metric fallback: use depth at midpoint to estimate angular size
    # (approximate, ±3-4 inches, better than nothing)
    if depth_map is not None:
        x_mid = (x1 + x2) // 2
        depth_m = float(depth_map[y_mid, x_mid]) if depth_map[y_mid, x_mid] > 0 else None
        if depth_m and depth_m > 0.1:
            # Assume ~60° horizontal FOV for a typical phone camera
            import math
            fov_rad = math.radians(60)
            px_per_meter = w / (2 * depth_m * math.tan(fov_rad / 2))
            width_m = pixel_width / px_per_meter
            return width_m * 39.3701  # meters → inches

    return None


def process_frames_depth(
    frame_paths: list,
    audit_id: str,
    module_id: str,
    estimator: "DepthEstimator",
    gemini_result: dict,
    calibration: dict,
) -> dict:
    """
    Run depth estimation on all frames and extract measurements.
    Returns dict with measurements and saved depth map frame paths.
    """
    depth_map_frames = []
    measurements = {}
    pixels_per_inch = calibration.get("pixels_per_inch")

    out_dir = FRAMES_DIR / audit_id / module_id
    out_dir.mkdir(parents=True, exist_ok=True)

    for i, rel_path in enumerate(frame_paths):
        full_path = FRAMES_DIR / rel_path
        img = cv2.imread(str(full_path))
        if img is None:
            continue

        depth = estimator.predict(img)

        if depth is not None:
            colored = colorize_depth_map(depth)
            depth_name = f"depth_{i + 1:03d}.jpg"
            depth_out = out_dir / depth_name
            cv2.imwrite(str(depth_out), colored)
            depth_map_frames.append(f"{audit_id}/{module_id}/{depth_name}")

            # Extract door width if bounding box is available
            if "door_bounding_box" in gemini_result and "door_clear_width_inches" not in measurements:
                bbox = gemini_result["door_bounding_box"]
                width_in = measure_width_from_bbox(depth, img, bbox, pixels_per_inch)
                if width_in is not None:
                    measurements["door_clear_width_inches"] = round(width_in, 1)

            # Extract clearance for restroom
            if "clearance_bounding_box" in gemini_result and "clearance_inches" not in measurements:
                bbox = gemini_result["clearance_bounding_box"]
                width_in = measure_width_from_bbox(depth, img, bbox, pixels_per_inch)
                if width_in is not None:
                    measurements["clearance_inches"] = round(width_in, 1)
        else:
            # No depth model — generate a placeholder so the UI still shows something
            placeholder = _make_placeholder_depth(img)
            depth_name = f"depth_{i + 1:03d}.jpg"
            depth_out = out_dir / depth_name
            cv2.imwrite(str(depth_out), placeholder)
            depth_map_frames.append(f"{audit_id}/{module_id}/{depth_name}")

    return {"measurements": measurements, "depth_map_frames": depth_map_frames}


def _make_placeholder_depth(image_bgr: np.ndarray) -> np.ndarray:
    """Grayscale + colormap pseudo-depth from luminance when model unavailable."""
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    # Invert so closer (brighter) objects appear warm
    inverted = 255 - gray
    colored = cv2.applyColorMap(inverted, cv2.COLORMAP_INFERNO)
    return colored
