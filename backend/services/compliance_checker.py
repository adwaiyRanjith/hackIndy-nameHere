"""
Step 6: Compliance Rule Engine

Pure Python — no LLM calls.
Every check is a deterministic if-statement against rule_table.json.
"""

import json
import logging
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from models.audit import Violation, RemediationCost

logger = logging.getLogger(__name__)

_RULE_TABLE_PATH = Path(__file__).parent.parent / "data" / "rule_table.json"

with open(_RULE_TABLE_PATH) as f:
    _RULE_DATA = json.load(f)

RULES: List[dict] = _RULE_DATA["rules"]
PARKING_COUNT_TABLE: List[dict] = _RULE_DATA["parking_count_table"]
STATE_OVERRIDES: Dict[str, dict] = _RULE_DATA.get("state_overrides", {})


def _required_parking_spaces(total_spaces: int) -> int:
    for row in PARKING_COUNT_TABLE:
        lo = row["total_min"]
        hi = row.get("total_max")
        if hi is None:
            pct = row.get("required_pct", 0.02)
            if total_spaces >= lo:
                return max(1, int(total_spaces * pct))
        else:
            if lo <= total_spaces <= hi:
                return row["required"]
    return 1


def _apply_state_override(rule: dict, state: str) -> dict:
    """Return a copy of the rule with state-specific overrides applied."""
    overrides = STATE_OVERRIDES.get(state, {}).get(rule["rule_id"])
    if overrides:
        rule = dict(rule)
        rule["ada_section"] = overrides.get("standard", rule["ada_section"])
        if "minimum" in overrides:
            rule["minimum"] = overrides["minimum"]
    return rule


def _make_violation(
    rule: dict,
    module_id: str,
    measurement: Any,
    calibrated: bool,
    confidence: float,
    finding_override: Optional[str] = None,
) -> Violation:
    if finding_override:
        finding = finding_override
    elif measurement is not None:
        finding = f"Detected value: {measurement}. Required: {rule.get('minimum', 'see rule')}."
    else:
        finding = f"{rule['element']} not detected or non-compliant."

    return Violation(
        violation_id=str(uuid.uuid4()),
        module_id=module_id,
        module_type=rule["module"],
        rule_id=rule["rule_id"],
        code=rule["ada_section"],
        element=rule["element"],
        finding=finding,
        severity=rule["severity"],
        measurement_value=measurement,
        measurement_unit="inches" if rule.get("minimum") else None,
        required_value=rule.get("minimum"),
        calibrated=calibrated,
        confidence=confidence,
        remediation_cost=RemediationCost(
            low=rule["remediation_cost_low"],
            high=rule["remediation_cost_high"],
        ),
    )


def check_module_compliance(
    module_type: str,
    module_id: str,
    gemini_result: dict,
    depth_measurements: dict,
    applicable_rule_ids: List[str],
    calibrated: bool,
    state: str = "federal",
    questionnaire: Optional[dict] = None,
) -> List[Violation]:
    """
    Run all applicable rules against Gemini + depth output.
    Returns list of Violation objects.
    """
    violations: List[Violation] = []
    gemini_confidence = float(gemini_result.get("confidence", 0.5))

    for rule in RULES:
        if rule["rule_id"] not in applicable_rule_ids:
            continue
        if rule["module"] != module_type:
            continue

        rule = _apply_state_override(rule, state)

        # Evaluate conditional guard
        cond_field = rule.get("condition_field")
        if cond_field is not None:
            cond_val = rule.get("condition_value")
            actual_cond = gemini_result.get(cond_field)
            if actual_cond != cond_val:
                # Condition not met — skip rule
                continue

        check_type = rule["check_type"]

        if check_type == "feature_presence":
            field = rule.get("gemini_field")
            value = gemini_result.get(field)

            flag_if_false = rule.get("flag_if_false", False)
            flag_if_true = rule.get("flag_if_true", False)

            violated = False
            finding = None

            if flag_if_false and not value:
                violated = True
                finding = f"{rule['element']} not detected or absent."
            elif flag_if_true and value:
                violated = True
                finding = f"{rule['element']} detected (non-compliant condition present)."

            if violated:
                violations.append(
                    _make_violation(rule, module_id, None, calibrated, gemini_confidence, finding)
                )

        elif check_type == "feature_value":
            field = rule.get("gemini_field")
            actual = gemini_result.get(field)
            prohibited = rule.get("prohibited_values", [])

            if actual in prohibited:
                finding = f"Detected '{actual}' — prohibited for ADA compliance."
                violations.append(
                    _make_violation(rule, module_id, actual, calibrated, gemini_confidence, finding)
                )

        elif check_type == "measurement_minimum":
            mkey = rule.get("measurement_key")
            measured = depth_measurements.get(mkey) if depth_measurements else None
            minimum = rule.get("minimum")

            if measured is not None:
                if float(measured) < float(minimum):
                    finding = f"Estimated {rule['element'].lower()}: {measured}\" — below {minimum}\" minimum."
                    violations.append(
                        _make_violation(rule, module_id, measured, calibrated, gemini_confidence, finding)
                    )
            else:
                # Fallback to Gemini relative estimate
                rel_field = rule.get("relative_field")
                rel_violation_value = rule.get("relative_violation_value", "narrow")
                if rel_field:
                    relative = gemini_result.get(rel_field)
                    if relative == rel_violation_value:
                        finding = (
                            f"{rule['element']} appears {relative} — likely below {minimum}\" minimum "
                            "(uncalibrated estimate)."
                        )
                        violations.append(
                            _make_violation(
                                rule, module_id, f"estimated {relative}", False,
                                gemini_confidence * 0.6, finding
                            )
                        )

        elif check_type == "count_minimum":
            actual_count = gemini_result.get(rule.get("gemini_field", "accessible_spaces_detected"), 0)
            total_spaces = (questionnaire or {}).get("parking_spaces", 0)
            required = _required_parking_spaces(total_spaces)

            if int(actual_count) < required:
                finding = (
                    f"Detected {actual_count} accessible space(s) — {required} required "
                    f"for a lot with {total_spaces} total spaces."
                )
                violations.append(
                    _make_violation(
                        rule, module_id, actual_count, calibrated, gemini_confidence, finding
                    )
                )

    return violations


_UNIVERSAL_MODULES = [
    "entrance", "hallway", "restroom", "elevator", "stairway", "signage", "drinking_fountain",
]

_FACILITY_MODULE_MAP: Dict[str, List[str]] = {
    "restaurant": _UNIVERSAL_MODULES + ["parking", "dining", "counter", "outdoor_seating"],
    "retail":     _UNIVERSAL_MODULES + ["parking", "sales_floor", "checkout", "fitting_room", "counter"],
    "office":     _UNIVERSAL_MODULES + ["parking", "reception", "conference_room", "break_room"],
    "medical":    _UNIVERSAL_MODULES + ["parking", "waiting_room", "exam_room", "patient_room", "pharmacy", "reception"],
    "hotel":      _UNIVERSAL_MODULES + ["parking", "lobby", "guest_room", "pool", "fitness_center", "dining", "counter"],
    "education":  _UNIVERSAL_MODULES + ["parking", "classroom", "cafeteria", "gymnasium", "auditorium", "library"],
    "assembly":   _UNIVERSAL_MODULES + ["parking", "assembly_seating", "stage", "concession", "ticket_booth"],
    "other":      _UNIVERSAL_MODULES + ["parking"],
}


def get_applicable_rules_for_questionnaire(questionnaire: dict) -> List[str]:
    """
    Determine which rule IDs apply based on questionnaire answers.
    """
    rule_map = _RULE_DATA.get("module_rule_map", {})
    facility_type = questionnaire.get("facility_type", "other")
    applicable_modules = get_applicable_modules(questionnaire)
    applicable = []

    for module_type in applicable_modules:
        rule_ids = rule_map.get(module_type, [])
        applicable.extend(rule_ids)

    return applicable


def get_applicable_modules(questionnaire: dict) -> List[str]:
    """Return list of modules that should be audited for this facility."""
    facility_type = questionnaire.get("facility_type", "other")
    modules = list(_FACILITY_MODULE_MAP.get(facility_type, _FACILITY_MODULE_MAP["other"]))

    if questionnaire.get("parking_spaces", 0) == 0 and "parking" in modules:
        modules.remove("parking")

    return modules
