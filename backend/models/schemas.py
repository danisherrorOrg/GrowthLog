from pydantic import BaseModel, field_validator, EmailStr
from typing import Optional, List

# --- Auth & Profile ---
class RegisterModel(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty or only whitespace")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class LoginModel(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdateModel(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_emoji: Optional[str] = None
    timezone: Optional[str] = None
    email_notifications: Optional[bool] = None

class PasswordChangeModel(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v

class EmailChangeModel(BaseModel):
    new_email: str
    password: str

class PublicToggleModel(BaseModel):
    is_public: bool

# --- Categories ---
class CategoryModel(BaseModel):
    name: str
    icon: str
    color: str
    description: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Category name cannot be empty")
        return v

class CategoryTemplateModel(BaseModel):
    name: str
    icon: str
    color: str
    description: Optional[str] = ""

class CategoryUpdateModel(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None

# --- Goals ---
class GoalModel(BaseModel):
    category_id: str
    title: str
    description: Optional[str] = ""
    deadline: str

class GoalUpdateModel(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    category_id: Optional[str] = None

class GoalReflectModel(BaseModel):
    status: str
    reflection: str
    new_deadline: Optional[str] = None

class MicroGoalModel(BaseModel):
    text: str
    time_spent: Optional[int] = 0

class GoalReflectionAddModel(BaseModel):
    text: str
    date: Optional[str] = None

class NoteModel(BaseModel):
    text: str

# --- Daily Logs ---
class DailyLogEntryModel(BaseModel):
    category_id: str
    text: str
    mood: int
    energy: int
    emotions: Optional[List[str]] = []
    time_spent: Optional[int] = 0

    @field_validator("mood", "energy")
    @classmethod
    def clamp_rating(cls, v):
        if not (1 <= v <= 10):
            raise ValueError("Rating must be between 1 and 10")
        return v

class DailyLogModel(BaseModel):
    date: Optional[str] = None
    entries: List[DailyLogEntryModel]
    highlight: Optional[str] = ""
    overall_rating: Optional[int] = 5

    @field_validator("overall_rating")
    @classmethod
    def clamp_overall(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Overall rating must be between 1 and 10")
        return v

# --- Manifestations ---
class ManifestationModel(BaseModel):
    vision: str
    target_days: Optional[int] = None
    target_date: Optional[str] = None
    categories: Optional[List[str]] = []
    notes: Optional[str] = ""

class ManifestationUpdateModel(BaseModel):
    vision: Optional[str] = None
    target_date: Optional[str] = None
    notes: Optional[str] = None
    categories: Optional[List[str]] = None

class ManifestationProgressModel(BaseModel):
    text: str
    type: Optional[str] = "improvement"

class ManifestationProgressUpdateModel(BaseModel):
    text: Optional[str] = None
    type: Optional[str] = None

class ManifestationCompleteModel(BaseModel):
    text: str

# --- Snapshots ---
class SnapshotModel(BaseModel):
    description: str
    values: Optional[List[str]] = []
    mood: Optional[int] = 5
    date: Optional[str] = None

    @field_validator("mood")
    @classmethod
    def clamp_mood(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Mood must be between 1 and 10")
        return v

class SnapshotUpdateModel(BaseModel):
    description: Optional[str] = None
    values: Optional[List[str]] = None
    mood: Optional[int] = None
