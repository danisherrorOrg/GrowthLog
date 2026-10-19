from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal

DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"


class QuickCheckModel(BaseModel):
    text: str = Field(..., max_length=300)
    # 1 = unrelated to today's priorities, 5 = it IS a top task / directly helps one
    helps_today: int = Field(..., ge=1, le=5)
    # 1 = forgotten in a week, 5 = still matters in a week
    matters_week: int = Field(..., ge=1, le=5)
    # 1 = giving up nothing important, 5 = giving up something I care about
    giving_up: int = Field(..., ge=1, le=5)
    # The user's local date (YYYY-MM-DD), so "today" matches their day, not UTC
    date: str = Field(..., pattern=DATE_PATTERN)
    # The user's local hour (0-23), for "when do I get distracted?" patterns
    hour: Optional[int] = Field(None, ge=0, le=23)

    @field_validator("text")
    @classmethod
    def text_not_blank(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Tell us what you're about to do")
        return v


class QuickCheckUpdateModel(BaseModel):
    action: Optional[Literal["doing", "parked", "skipped"]] = None
    worth_it: Optional[bool] = None
