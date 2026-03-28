import asyncio
import logging
import uuid
from datetime import datetime
from pathlib import Path

import cv2
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from config import UPLOAD_DIR, FRAMES_DIR, MODULE_INSTRUCTIONS
from models.audit import CreateModuleRequest, CreateModuleResponse, ModuleStatusResponse
from services.video_processing import extract_key_frames, VideoProcessingError
from services.calibration import calibrate_frames
from services.depth_estimation import process_frames_depth
from services.gemini_analysis import analyze_module, get_default_result
from services.compliance_checker import check_module_compliance

router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# POST /audits/{audit_id}/modules
# ---------------------------------------------------------------------------

@router.post("/audits/{audit_id}/modules")
async def create_module(
    audit_id: str,
    body: CreateModuleRequest,
    request: Request,
):
    db = request.app.state.db
    audit = await db["audits"].find_one({"audit_id": audit_id})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    module_id = str(uuid.uuid4())
    instructions_data = MODULE_INSTRUCTIONS.get(body.module_type, {})
    instructions = instructions_data.get("instructions", "Record the area slowly and steadily.")

    module_doc = {
        "module_id": module_id,
        "module_type": body.module_type,
        "status": "created",
        "progress": 0,
        "video_path": None,
        "key_frames": [],
        "gemini_analysis": None,
        "depth_measurements": None,
        "calibrated": False,
        "violations": [],
        "annotated_frames": [],
        "depth_map_frames": [],
        "error_message": None,
    }

    await db["audits"].update_one(
        {"audit_id": audit_id},
        {
            "$push": {"modules": module_doc},
            "$set": {"updated_at": datetime.utcnow().isoformat()},
        },
    )

    return CreateModuleResponse(module_id=module_id, instructions=instructions)


# ---------------------------------------------------------------------------
# POST /audits/{audit_id}/modules/{module_id}/upload
# ---------------------------------------------------------------------------

@router.post("/audits/{audit_id}/modules/{module_id}/upload")
async def upload_video(
    audit_id: str,
    module_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
):
    db = request.app.state.db
    audit = await db["audits"].find_one({"audit_id": audit_id})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    module = _find_module(audit, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    # Save video to disk
    ext = Path(video.filename).suffix if video.filename else ".mp4"
    video_filename = f"{audit_id}_{module_id}{ext}"
    video_path = UPLOAD_DIR / video_filename

    contents = await video.read()
    with open(str(video_path), "wb") as f:
        f.write(contents)

    # Update status to uploading→extracting_frames
    await _update_module(db, audit_id, module_id, {
        "status": "extracting_frames",
        "progress": 5,
        "video_path": str(video_path),
    })

    # Kick off async pipeline
    background_tasks.add_task(
        run_processing_pipeline,
        audit_id=audit_id,
        module_id=module_id,
        module_type=module["module_type"],
        video_path=str(video_path),
        db=db,
        depth_estimator=request.app.state.depth_estimator,
    )

    return {"status": "processing", "module_id": module_id}


# ---------------------------------------------------------------------------
# GET /audits/{audit_id}/modules/{module_id}/status
# ---------------------------------------------------------------------------

@router.get("/audits/{audit_id}/modules/{module_id}/status")
async def get_module_status(audit_id: str, module_id: str, request: Request):
    db = request.app.state.db
    audit = await db["audits"].find_one({"audit_id": audit_id})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    module = _find_module(audit, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    violations_found = len(module.get("violations", [])) if module.get("status") == "complete" else None

    return ModuleStatusResponse(
        status=module.get("status", "unknown"),
        progress=module.get("progress", 0),
        module_type=module.get("module_type"),
        violations_found=violations_found,
        error_message=module.get("error_message"),
    )


# ---------------------------------------------------------------------------
# GET /audits/{audit_id}/modules/{module_id}/results
# ---------------------------------------------------------------------------

@router.get("/audits/{audit_id}/modules/{module_id}/results")
async def get_module_results(audit_id: str, module_id: str, request: Request):
    db = request.app.state.db
    audit = await db["audits"].find_one({"audit_id": audit_id})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    module = _find_module(audit, module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")

    if module.get("status") not in ("complete", "error"):
        raise HTTPException(status_code=202, detail="Processing not yet complete")

    return {
        "module_type": module.get("module_type"),
        "gemini_analysis": module.get("gemini_analysis"),
        "depth_measurements": module.get("depth_measurements"),
        "calibrated": module.get("calibrated", False),
        "violations": module.get("violations", []),
        "annotated_frames": module.get("annotated_frames", []),
        "depth_map_frames": module.get("depth_map_frames", []),
    }


# ---------------------------------------------------------------------------
# Processing pipeline (runs in background)
# ---------------------------------------------------------------------------

async def run_processing_pipeline(
    audit_id: str,
    module_id: str,
    module_type: str,
    video_path: str,
    db,
    depth_estimator,
):
    try:
        # --- Step 3: Extract key frames ---
        await _update_module(db, audit_id, module_id, {
            "status": "extracting_frames", "progress": 10
        })
        frame_paths = await extract_key_frames(video_path, audit_id, module_id)

        # --- Step 4: Calibration ---
        await _update_module(db, audit_id, module_id, {
            "status": "analyzing", "progress": 25, "key_frames": frame_paths
        })
        frames_bgr = []
        for p in frame_paths:
            img = cv2.imread(str(FRAMES_DIR / p))
            if img is not None:
                frames_bgr.append(img)

        from services.calibration import calibrate_frames
        calibration = calibrate_frames(frames_bgr)

        # --- Step 5A: Gemini analysis ---
        await _update_module(db, audit_id, module_id, {"progress": 40})
        try:
            gemini_result = await analyze_module(module_type, frame_paths)
        except Exception as e:
            logger.error(f"Gemini analysis failed: {e}. Using defaults.")
            gemini_result = get_default_result(module_type)

        # --- Step 5B: Depth estimation ---
        await _update_module(db, audit_id, module_id, {"progress": 60})
        if depth_estimator is None:
            from services.depth_estimation import DepthEstimator
            depth_estimator = DepthEstimator()

        depth_result = process_frames_depth(
            frame_paths, audit_id, module_id, depth_estimator, gemini_result, calibration
        )
        measurements = depth_result["measurements"]
        depth_map_frames = depth_result["depth_map_frames"]

        # --- Annotated frames ---
        await _update_module(db, audit_id, module_id, {"progress": 75})
        annotated_frames = _generate_annotated_frames(
            frame_paths, audit_id, module_id, gemini_result
        )

        # --- Step 6: Compliance check ---
        await _update_module(db, audit_id, module_id, {
            "status": "checking_compliance", "progress": 85
        })
        audit = await db["audits"].find_one({"audit_id": audit_id})
        applicable_rules = audit.get("applicable_rules", [])
        facility = audit.get("facility", {})

        violations = check_module_compliance(
            module_type=module_type,
            module_id=module_id,
            gemini_result=gemini_result,
            depth_measurements=measurements,
            applicable_rule_ids=applicable_rules,
            calibrated=calibration["calibrated"],
            state=facility.get("state", "federal"),
            questionnaire=facility,
        )

        violations_dicts = [v.model_dump() for v in violations]

        # --- Complete ---
        await _update_module(db, audit_id, module_id, {
            "status": "complete",
            "progress": 100,
            "gemini_analysis": gemini_result,
            "depth_measurements": measurements,
            "calibrated": calibration["calibrated"],
            "violations": violations_dicts,
            "annotated_frames": annotated_frames,
            "depth_map_frames": depth_map_frames,
        })
        logger.info(f"Module {module_id} complete. {len(violations_dicts)} violation(s) found.")

    except VideoProcessingError as e:
        logger.error(f"Video processing error for module {module_id}: {e}")
        await _update_module(db, audit_id, module_id, {
            "status": "error",
            "error_message": str(e),
        })
    except Exception as e:
        logger.exception(f"Unexpected error in pipeline for module {module_id}: {e}")
        await _update_module(db, audit_id, module_id, {
            "status": "error",
            "error_message": f"Unexpected error: {str(e)[:200]}",
        })


# ---------------------------------------------------------------------------
# Annotated frame generation
# ---------------------------------------------------------------------------

def _generate_annotated_frames(
    frame_paths: list,
    audit_id: str,
    module_id: str,
    gemini_result: dict,
) -> list:
    """Draw bounding boxes and feature labels on frames using OpenCV."""
    annotated = []
    out_dir = FRAMES_DIR / audit_id / module_id

    for i, rel_path in enumerate(frame_paths):
        full_path = FRAMES_DIR / rel_path
        img = cv2.imread(str(full_path))
        if img is None:
            continue

        h, w = img.shape[:2]

        # Draw door bounding box if present
        bbox = gemini_result.get("door_bounding_box")
        if bbox:
            x1 = int(bbox["x1"] * w)
            y1 = int(bbox["y1"] * h)
            x2 = int(bbox["x2"] * w)
            y2 = int(bbox["y2"] * h)
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(img, "Door", (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # Draw clearance bounding box if present
        cbbox = gemini_result.get("clearance_bounding_box")
        if cbbox:
            x1 = int(cbbox["x1"] * w)
            y1 = int(cbbox["y1"] * h)
            x2 = int(cbbox["x2"] * w)
            y2 = int(cbbox["y2"] * h)
            cv2.rectangle(img, (x1, y1), (x2, y2), (255, 165, 0), 2)
            cv2.putText(img, "Clearance", (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 165, 0), 2)

        ann_name = f"annotated_{i + 1:03d}.jpg"
        ann_path = out_dir / ann_name
        cv2.imwrite(str(ann_path), img)
        annotated.append(f"{audit_id}/{module_id}/{ann_name}")

    return annotated


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _find_module(audit: dict, module_id: str) -> dict | None:
    for m in audit.get("modules", []):
        if m.get("module_id") == module_id:
            return m
    return None


async def _update_module(db, audit_id: str, module_id: str, updates: dict):
    set_fields = {f"modules.$.{k}": v for k, v in updates.items()}
    set_fields["updated_at"] = datetime.utcnow().isoformat()
    await db["audits"].update_one(
        {"audit_id": audit_id, "modules.module_id": module_id},
        {"$set": set_fields},
    )
