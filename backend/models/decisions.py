from pydantic import BaseModel, Field, field_validator
from typing import Optional

from utils.decision_matrix import FACTORS

NOTE_MAX = 2000


def _check_values(v: dict):
    missing = set(FACTORS) - set(v)
    extra = set(v) - set(FACTORS)
    if missing or extra:
        raise ValueError(f"Rate every question exactly once (missing: {sorted(missing)}, unknown: {sorted(extra)})")
    for key, val in v.items():
        if not isinstance(val, int) or isinstance(val, bool) or not 1 <= val <= 5:
            raise ValueError(f"'{key}' must be a whole number from 1 to 5")
    return v


class DecisionValuesModel(BaseModel):
    values: dict

    @field_validator("values")
    @classmethod
    def valid_values(cls, v):
        return _check_values(v)


class DecisionModel(DecisionValuesModel):
    task: str = Field(..., max_length=300)
    good: Optional[str] = Field("", max_length=NOTE_MAX)
    bad: Optional[str] = Field("", max_length=NOTE_MAX)
    ifnot: Optional[str] = Field("", max_length=NOTE_MAX)
    first_step: Optional[str] = Field("", max_length=300)

    @field_validator("task")
    @classmethod
    def task_not_blank(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Name the task or decision")
        return v


class DecisionUpdateModel(BaseModel):
    task: Optional[str] = Field(None, max_length=300)
    values: Optional[dict] = None
    good: Optional[str] = Field(None, max_length=NOTE_MAX)
    bad: Optional[str] = Field(None, max_length=NOTE_MAX)
    ifnot: Optional[str] = Field(None, max_length=NOTE_MAX)
    first_step: Optional[str] = Field(None, max_length=300)
    # Looking back: did it turn out worth it?
    worth_it: Optional[bool] = None
    outcome_note: Optional[str] = Field(None, max_length=NOTE_MAX)

    @field_validator("values")
    @classmethod
    def valid_values(cls, v):
        return v if v is None else _check_values(v)

    @field_validator("task")
    @classmethod
    def task_not_blank(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Name the task or decision")
        return v
