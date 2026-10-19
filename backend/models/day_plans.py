from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal

from models.quick_checks import DATE_PATTERN

Verdict = Literal["do_now", "schedule", "hand_off", "minimum", "drop"]


class TriageAnswers(BaseModel):
    goals: int = Field(..., ge=1, le=5)      # Does it move one of my goals?
    year: int = Field(..., ge=1, le=5)       # Will it matter in a year?
    skip: int = Field(..., ge=1, le=5)       # What happens if I skip it?
    cost: int = Field(..., ge=1, le=5)       # Time + energy it costs (5 = a lot)
    want: int = Field(..., ge=1, le=5)       # My own choice (5) vs pressure (1)


class TriageEvaluateModel(BaseModel):
    answers: TriageAnswers
    delegable: bool = False
    urgent: bool = False


class TriageApplyModel(BaseModel):
    date: str = Field(..., pattern=DATE_PATTERN)
    todo_id: str = Field(..., max_length=64)
    answers: TriageAnswers
    delegable: bool = False
    # The user may override the suggestion; omitted means "take the suggestion"
    verdict: Optional[Verdict] = None
    schedule_date: Optional[str] = Field(None, pattern=DATE_PATTERN)

    @model_validator(mode="after")
    def schedule_needs_future_date(self):
        if self.schedule_date and self.schedule_date <= self.date:
            raise ValueError("Schedule it for a later day than today")
        return self
