from pydantic import BaseModel
from typing import Optional, List, Any


class RuleEntry(BaseModel):
    rule_id: str
    module: str
    check_type: str  # feature_presence | feature_value | measurement_minimum | count_minimum
    ada_section: str
    element: str
    description: str
    severity: str  # critical | high | medium | low
    remediation_cost_low: float
    remediation_cost_high: float

    # For feature_presence
    gemini_field: Optional[str] = None
    flag_if_false: Optional[bool] = None   # True → violation when field is falsy
    flag_if_true: Optional[bool] = None    # True → violation when field is truthy

    # For feature_value
    prohibited_values: Optional[List[Any]] = None

    # For measurement_minimum
    measurement_key: Optional[str] = None
    minimum: Optional[float] = None
    relative_field: Optional[str] = None   # Gemini field for fallback relative estimate

    # For count_minimum
    count_field: Optional[str] = None      # Gemini field holding detected count
    count_lookup: Optional[str] = None     # Name of lookup function to use

    # Conditional rule: only apply if another gemini field is true
    condition_field: Optional[str] = None
    condition_value: Optional[Any] = None

    # State overrides: applied at runtime
    state_code: Optional[str] = None       # Set when a state override is in effect
    state_standard: Optional[str] = None
