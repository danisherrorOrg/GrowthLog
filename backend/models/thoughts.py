from pydantic import BaseModel
from typing import Optional, List

class ThoughtModel(BaseModel):
    content: str
    sentiment: Optional[str] = None
    tags: Optional[List[str]] = []

class ThoughtUpdateModel(BaseModel):
    content: Optional[str] = None
    sentiment: Optional[str] = None
    tags: Optional[List[str]] = None
    is_bookmarked: Optional[bool] = None
