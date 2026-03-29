import logging
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import FileResponse

from config import REPORTS_DIR
from services.report_generator import generate_report

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/audits/{audit_id}/report")
async def trigger_report(
    audit_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
):
    db = request.app.state.db
    audit = await db["audits"].find_one({"audit_id": audit_id})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    completed_modules = [
        m for m in audit.get("modules", []) if m.get("status") == "complete"
    ]
    if not completed_modules:
        raise HTTPException(status_code=400, detail="No completed modules to report on.")

    background_tasks.add_task(_run_report, audit_id, audit, db)
    return {"status": "generating"}


@router.get("/audits/{audit_id}/report")
async def get_report(audit_id: str, request: Request):
    db = request.app.state.db
    audit = await db["audits"].find_one({"audit_id": audit_id}, {"_id": 0})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    report = audit.get("report")
    if not report:
        raise HTTPException(status_code=404, detail="Report not yet generated.")

    pdf_path = report.get("pdf_path")
    return {
        "overall_score": report.get("overall_score", 0),
        "total_violations": report.get("total_violations", 0),
        "critical_violations": report.get("critical_violations", 0),
        "modules_audited": report.get("modules_audited", 0),
        "violations": report.get("violations", []),
        "module_violations": report.get("module_violations", []),
        "estimated_remediation_total": report.get("estimated_remediation_total", {"low": 0, "high": 0}),
        "generated_at": report.get("generated_at"),
        "pdf_url": f"/reports/{pdf_path}" if pdf_path else None,
    }


@router.get("/audits/{audit_id}/report/pdf")
async def download_pdf(audit_id: str, request: Request):
    db = request.app.state.db
    audit = await db["audits"].find_one({"audit_id": audit_id})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    report = audit.get("report", {})
    pdf_name = report.get("pdf_path")
    if not pdf_name:
        raise HTTPException(status_code=404, detail="PDF not yet generated.")

    pdf_path = REPORTS_DIR / pdf_name
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF file not found on disk.")

    return FileResponse(
        str(pdf_path),
        media_type="application/pdf",
        filename=f"passline_audit_{audit_id[:8]}.pdf",
    )


async def _run_report(audit_id: str, audit: dict, db):
    try:
        await generate_report(audit_id, audit, db)
        logger.info(f"Report generated for audit {audit_id}")
    except Exception as e:
        logger.exception(f"Report generation failed for audit {audit_id}: {e}")
