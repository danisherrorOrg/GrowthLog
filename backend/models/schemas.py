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
    gratitude: Optional[List[str]] = []
    regret: Optional[str] = ""

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
    target_days: Optional[int] = None
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

# --- Insights: Anti-Goals & Habit Graveyard ---
class AntiGoalModel(BaseModel):
    text: str
    reason: Optional[str] = ""

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Anti-goal text cannot be empty")
        return v

class HabitGraveyardModel(BaseModel):
    habit: str
    reason: Optional[str] = ""
    started_at: Optional[str] = ""
    abandoned_at: Optional[str] = ""

    @field_validator("habit")
    @classmethod
    def habit_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Habit name cannot be empty")
        return v

# --- Time & Productivity ---
class TimeEntryModel(BaseModel):
    date: Optional[str] = None   # yyyy-MM-dd, defaults to today
    category: str                # e.g. work, learning, leisure
    hours: float
    notes: Optional[str] = ""

    @field_validator("category")
    @classmethod
    def cat_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Category cannot be empty")
        return v

class ScreenTimeModel(BaseModel):
    date: Optional[str] = None
    app_category: str            # e.g. Social, News, Work, Entertainment
    hours: float
    notes: Optional[str] = ""

    @field_validator("app_category")
    @classmethod
    def app_not_empty(cls, v):
        if not v.strip():
            raise ValueError("App category cannot be empty")
        return v

class ProcrastinationLogModel(BaseModel):
    date: Optional[str] = None
    what: str                    # what was avoided
    why: Optional[str] = ""
    outcome: Optional[str] = ""

    @field_validator("what")
    @classmethod
    def what_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Describe what was avoided")
        return v

class NotToDoModel(BaseModel):
    text: str
    reason: Optional[str] = ""

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Not-to-do item cannot be empty")
        return v

# --- Creativity & Passion Projects ---
class ProjectIdeaModel(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "backlog"   # backlog | in_progress | done
    link: Optional[str] = ""
    created_at: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Project title cannot be empty")
        return v

class CreativeSessionModel(BaseModel):
    date: Optional[str] = None
    project_name: str
    hours: float
    output_notes: Optional[str] = ""

    @field_validator("project_name")
    @classmethod
    def project_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Project name cannot be empty")
        return v

# --- Spirituality & Philosophy ---
class MeaningLogModel(BaseModel):
    date: Optional[str] = None
    experience: str
    why_meaningful: Optional[str] = ""

    @field_validator("experience")
    @classmethod
    def experience_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Experience cannot be empty")
        return v

# --- Fun, Play & Leisure ---
class TravelLogModel(BaseModel):
    date: Optional[str] = None
    destination: str
    memories: Optional[str] = ""
    photos_link: Optional[str] = ""

    @field_validator("destination")
    @classmethod
    def destination_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Destination cannot be empty")
        return v

class BucketListModel(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "not_started"   # not_started | in_progress | done
    target_date: Optional[str] = ""
    completed_date: Optional[str] = ""

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Bucket list item cannot be empty")
        return v

# --- Learning & Growth ---
class SkillModel(BaseModel):
    name: str
    category: Optional[str] = ""   # Technical, Creative, Soft Skills, etc.
    level: Optional[int] = 1       # 1-5
    notes: Optional[str] = ""
    started_at: Optional[str] = ""

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Skill name cannot be empty")
        return v

class CourseModel(BaseModel):
    title: str
    provider: Optional[str] = ""
    hours_spent: Optional[float] = 0.0
    status: Optional[str] = "in_progress"   # in_progress | completed | dropped
    what_learned: Optional[str] = ""
    started_at: Optional[str] = ""
    completed_at: Optional[str] = ""

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Course title cannot be empty")
        return v

class FailureLogEntryModel(BaseModel):
    date: Optional[str] = None
    what_happened: str
    lesson: Optional[str] = ""
    domain: Optional[str] = ""    # Work, Health, Relationships, etc.

    @field_validator("what_happened")
    @classmethod
    def what_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Describe what happened")
        return v

# --- Career & Work ---
class SkillsGapModel(BaseModel):
    skill: str
    current_level: Optional[str] = ""
    target_level: Optional[str] = ""
    why_needed: Optional[str] = ""
    resources: Optional[str] = ""

    @field_validator("skill")
    @classmethod
    def skill_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Skill name cannot be empty")
        return v

class FeedbackModel(BaseModel):
    date: Optional[str] = None
    from_person: Optional[str] = ""
    feedback_type: Optional[str] = "positive"   # positive | critical | mixed
    content: str
    action_taken: Optional[str] = ""

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Feedback content cannot be empty")
        return v

