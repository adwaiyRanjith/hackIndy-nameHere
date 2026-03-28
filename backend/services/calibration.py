"""
Step 4: Reference Object Calibration

Detects credit card or US letter paper in key frames using Canny + contour detection.
Returns pixels_per_inch scale factor or None.
"""

import logging
from typing import Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Known reference object dimensions (inches)
REFERENCE_OBJECTS = {
    "credit_card": {"long": 3.375, "short": 2.125},
    "letter_paper": {"long": 11.0, "short": 8.5},
}
ASPECT_RATIO_TOLERANCE = 0.10  # ±10%
MIN_CONTOUR_AREA_FRACTION = 0.01  # contour must be >1% of frame area


def detect_reference_object(
    frame: np.ndarray,
) -> Tuple[Optional[float], Optional[str], float]:
    """
    Returns (pixels_per_inch, reference_type, confidence) or (None, None, 0.0).
    """
    h, w = frame.shape[:2]
    frame_area = h * w

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best: Optional[Tuple[float, str, float]] = None

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < frame_area * MIN_CONTOUR_AREA_FRACTION:
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        if len(approx) != 4:
            continue

        rect = cv2.minAreaRect(approx)
        _, (rw, rh), _ = rect
        if rw == 0 or rh == 0:
            continue

        long_px = max(rw, rh)
        short_px = min(rw, rh)
        aspect = long_px / short_px

        for ref_name, dims in REFERENCE_OBJECTS.items():
            known_aspect = dims["long"] / dims["short"]
            if abs(aspect - known_aspect) / known_aspect <= ASPECT_RATIO_TOLERANCE:
                ppi = long_px / dims["long"]
                # Confidence based on how close the aspect ratio is
                confidence = 1.0 - abs(aspect - known_aspect) / known_aspect
                if best is None or confidence > best[2]:
                    best = (ppi, ref_name, confidence)

    if best:
        ppi, ref_name, conf = best
        logger.info(f"Reference object detected: {ref_name} at {ppi:.1f} px/in (confidence={conf:.2f})")
        return ppi, ref_name, conf

    return None, None, 0.0


def calibrate_frames(frames_bgr: list) -> dict:
    """
    Try to find a reference object in any of the provided frames.
    Returns calibration result dict.
    """
    best_ppi = None
    best_type = None
    best_conf = 0.0

    for img in frames_bgr:
        ppi, ref_type, conf = detect_reference_object(img)
        if ppi is not None and conf > best_conf:
            best_ppi = ppi
            best_type = ref_type
            best_conf = conf

    return {
        "pixels_per_inch": best_ppi,
        "reference_type": best_type,
        "confidence": best_conf,
        "calibrated": best_ppi is not None,
    }


def pixels_to_inches(pixels: float, pixels_per_inch: float) -> float:
    return pixels / pixels_per_inch
