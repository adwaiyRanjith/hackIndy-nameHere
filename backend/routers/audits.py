from fastapi import APIRouter, HTTPException, Request
from datetime import datetime
import uuid

from models.audit import (
    QuestionnaireRequest,
    QuestionnaireResponse,
)
from services.compliance_checker import (
    get_applicable_rules_for_questionnaire,
    get_applicable_modules,
)

router = APIRouter()


@router.post("/audits")
async def create_audit(request: Request):
    db = request.app.state.db
    audit_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    doc = {
        "audit_id": audit_id,
        "created_at": now,
        "updated_at": now,
        "facility": None,
        "applicable_rules": [],
        "modules": [],
        "report": None,
    }
    await db["audits"].insert_one(doc)
    return {"audit_id": audit_id}


@router.put("/audits/{audit_id}/questionnaire")
async def save_questionnaire(
    audit_id: str,
    body: QuestionnaireRequest,
    request: Request,
):
    db = request.app.state.db
    audit = await db["audits"].find_one({"audit_id": audit_id})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    questionnaire = body.model_dump()
    applicable_rules = get_applicable_rules_for_questionnaire(questionnaire)
    applicable_modules = get_applicable_modules(questionnaire)

    await db["audits"].update_one(
        {"audit_id": audit_id},
        {
            "$set": {
                "facility": questionnaire,
                "applicable_rules": applicable_rules,
                "applicable_modules": applicable_modules,
                "updated_at": datetime.utcnow().isoformat(),
            }
        },
    )

    return QuestionnaireResponse(
        audit_id=audit_id,
        applicable_modules=applicable_modules,
        rule_count=len(applicable_rules),
    )


@router.get("/audits/{audit_id}")
async def get_audit(audit_id: str, request: Request):
    db = request.app.state.db
    audit = await db["audits"].find_one({"audit_id": audit_id}, {"_id": 0})
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit
