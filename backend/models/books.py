from pydantic import BaseModel
from typing import Optional, List

class BookModel(BaseModel):
    title: str
    author: str
    status: Optional[str] = "reading" # reading, finished, wish-list
    rating: Optional[int] = None
    notes: Optional[str] = ""
    cover_emoji: Optional[str] = "📖"

class BookUpdateModel(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    status: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    cover_emoji: Optional[str] = None
