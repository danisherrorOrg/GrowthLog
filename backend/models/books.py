from pydantic import BaseModel
from typing import Optional, List

class WisdomModel(BaseModel):
    chapter: str
    content: str
    thoughts: Optional[str] = ""

class BookmarkModel(BaseModel):
    page: str
    note: str

class BookModel(BaseModel):
    title: str
    author: str
    status: Optional[str] = "reading" # reading, finished, wish-list
    rating: Optional[int] = None
    notes: Optional[str] = ""
    cover_emoji: Optional[str] = "📖"
    description: Optional[str] = ""
    location: Optional[str] = ""
    progress_percentage: Optional[int] = 0
    wisdom: Optional[List[WisdomModel]] = []
    bookmarks: Optional[List[BookmarkModel]] = []

class BookUpdateModel(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    status: Optional[str] = None
    rating: Optional[int] = None
    notes: Optional[str] = None
    cover_emoji: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    progress_percentage: Optional[int] = None
    wisdom: Optional[List[WisdomModel]] = None
    bookmarks: Optional[List[BookmarkModel]] = None
