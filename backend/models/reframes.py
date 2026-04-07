from pydantic import BaseModel
from typing import Optional, List

class ReframeModel(BaseModel):
    trigger: str
    original_thought: str
    distortion: Optional[str] = "unspecified"
    reframe: str
    feeling_before: Optional[int] = 5
    feeling_after: Optional[int] = 5
    tags: Optional[List[str]] = []

class ReframeUpdateModel(BaseModel):
    trigger: Optional[str] = None
    original_thought: Optional[str] = None
    distortion: Optional[str] = None
    reframe: Optional[str] = None
    feeling_before: Optional[int] = None
    feeling_after: Optional[int] = None
    tags: Optional[List[str]] = None
