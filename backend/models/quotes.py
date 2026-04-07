from pydantic import BaseModel
from typing import Optional, List

class QuoteModel(BaseModel):
    content: str
    author: Optional[str] = "Unknown"
    source: Optional[str] = ""
    tags: Optional[List[str]] = []
    is_favorite: Optional[bool] = False

class QuoteUpdateModel(BaseModel):
    content: Optional[str] = None
    author: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[List[str]] = None
    is_favorite: Optional[bool] = None
