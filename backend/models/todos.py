from pydantic import BaseModel, Field, field_validator
from typing import Optional

from models.schemas import _optional_iso_date

class TodoModel(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "medium"
    category_id: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = Field(None, ge=0)

    _check_dates = field_validator("due_date")(_optional_iso_date)

class TodoUpdateModel(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category_id: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = Field(None, ge=0)
    actual_minutes: Optional[int] = Field(None, ge=0)

    _check_dates = field_validator("due_date")(_optional_iso_date)
