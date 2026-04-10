from pydantic import BaseModel
from typing import Optional

class TodoModel(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Optional[str] = "medium"
    category_id: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None

class TodoUpdateModel(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category_id: Optional[str] = None
    due_date: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
