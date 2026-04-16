from pydantic import BaseModel, field_validator, EmailStr, Field
from typing import Optional, List, Literal
# --- Auth & Profile ---
class RegisterModel(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr
    password: str = Field(..., max_length=128)

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
    password: str = Field(..., max_length=128)

class ProfileUpdateModel(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    avatar_emoji: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=60)
    email_notifications: Optional[bool] = None

class PasswordChangeModel(BaseModel):
    current_password: str = Field(..., max_length=128)
    new_password: str = Field(..., max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v

class EmailChangeModel(BaseModel):
    new_email: str = Field(..., max_length=200)
    password: str = Field(..., max_length=128)

class PublicToggleModel(BaseModel):
    is_public: bool

# --- Categories ---
class CategoryModel(BaseModel):
    name: str = Field(..., max_length=100)
    icon: str = Field(..., max_length=200)
    color: str = Field(..., max_length=200)
    description: Optional[str] = Field("", max_length=2000)

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Category name cannot be empty")
        return v

class CategoryTemplateModel(BaseModel):
    name: str = Field(..., max_length=100)
    icon: str = Field(..., max_length=200)
    color: str = Field(..., max_length=200)
    description: Optional[str] = Field("", max_length=2000)

class CategoryUpdateModel(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    icon: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)

# --- Goals ---
class GoalModel(BaseModel):
    category_id: str = Field(..., max_length=200)
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field("", max_length=2000)
    deadline: str = Field(..., max_length=30)

class GoalUpdateModel(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    deadline: Optional[str] = Field(None, max_length=30)
    category_id: Optional[str] = Field(None, max_length=500)

class GoalReflectModel(BaseModel):
    status: str = Field(..., max_length=200)
    reflection: str = Field(..., max_length=2000)
    new_deadline: Optional[str] = Field(None, max_length=30)

class MicroGoalModel(BaseModel):
    text: str = Field(..., max_length=2000)
    time_spent: Optional[int] = 0

class GoalReflectionAddModel(BaseModel):
    text: str = Field(..., max_length=2000)
    date: Optional[str] = Field(None, max_length=30)

class NoteModel(BaseModel):
    text: str = Field(..., max_length=2000)

# --- Daily Logs ---
class DailyLogEntryModel(BaseModel):
    category_id: str = Field(..., max_length=200)
    text: str = Field(..., max_length=2000)
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
    date: Optional[str] = Field(None, max_length=30)
    entries: List[DailyLogEntryModel]
    highlight: Optional[str] = Field("", max_length=500)
    overall_rating: Optional[int] = 5
    gratitude: Optional[List[str]] = []
    regret: Optional[str] = Field("", max_length=500)

    @field_validator("overall_rating")
    @classmethod
    def clamp_overall(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Overall rating must be between 1 and 10")
        return v

# --- Manifestations ---
class ManifestationModel(BaseModel):
    vision: str = Field(..., max_length=200)
    target_days: Optional[int] = None
    target_date: Optional[str] = Field(None, max_length=30)
    categories: Optional[List[str]] = []
    notes: Optional[str] = Field("", max_length=2000)

class ManifestationUpdateModel(BaseModel):
    vision: Optional[str] = Field(None, max_length=500)
    target_date: Optional[str] = Field(None, max_length=30)
    target_days: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=2000)
    categories: Optional[List[str]] = None

class ManifestationProgressModel(BaseModel):
    text: str = Field(..., max_length=2000)
    type: Optional[str] = Field("improvement", max_length=500)

class ManifestationProgressUpdateModel(BaseModel):
    text: Optional[str] = Field(None, max_length=500)
    type: Optional[str] = Field(None, max_length=500)

class ManifestationCompleteModel(BaseModel):
    text: str = Field(..., max_length=2000)

# --- Snapshots ---
class SnapshotModel(BaseModel):
    description: str = Field(..., max_length=200)
    values: Optional[List[str]] = []
    mood: Optional[int] = 5
    date: Optional[str] = Field(None, max_length=30)

    @field_validator("mood")
    @classmethod
    def clamp_mood(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Mood must be between 1 and 10")
        return v

class SnapshotUpdateModel(BaseModel):
    description: Optional[str] = Field(None, max_length=2000)
    values: Optional[List[str]] = None
    mood: Optional[int] = None

# --- Insights: Anti-Goals & Habit Graveyard ---
class AntiGoalModel(BaseModel):
    text: str = Field(..., max_length=2000)
    reason: Optional[str] = Field("", max_length=500)

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Anti-goal text cannot be empty")
        return v

class HabitGraveyardModel(BaseModel):
    habit: str = Field(..., max_length=200)
    reason: Optional[str] = Field("", max_length=500)
    started_at: Optional[str] = Field("", max_length=30)
    abandoned_at: Optional[str] = Field("", max_length=30)

    @field_validator("habit")
    @classmethod
    def habit_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Habit name cannot be empty")
        return v

# --- Time & Productivity ---
class TimeEntryModel(BaseModel):
    date: Optional[str] = Field(None, max_length=30) # yyyy-MM-dd, defaults to today
    category: str = Field(..., max_length=200) # e.g. work, learning, leisure
    hours: float
    notes: Optional[str] = Field("", max_length=2000)

    @field_validator("category")
    @classmethod
    def cat_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Category cannot be empty")
        return v

class ScreenTimeModel(BaseModel):
    date: Optional[str] = Field(None, max_length=30)
    app_category: str = Field(..., max_length=200) # e.g. Social, News, Work, Entertainment
    hours: float
    notes: Optional[str] = Field("", max_length=2000)

    @field_validator("app_category")
    @classmethod
    def app_not_empty(cls, v):
        if not v.strip():
            raise ValueError("App category cannot be empty")
        return v

class ProcrastinationLogModel(BaseModel):
    date: Optional[str] = Field(None, max_length=30)
    what: str = Field(..., max_length=200) # what was avoided
    why: Optional[str] = Field("", max_length=500)
    outcome: Optional[str] = Field("", max_length=500)

    @field_validator("what")
    @classmethod
    def what_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Describe what was avoided")
        return v

class NotToDoModel(BaseModel):
    text: str = Field(..., max_length=2000)
    reason: Optional[str] = Field("", max_length=500)

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Not-to-do item cannot be empty")
        return v

# --- Aging & Long-term Life (Time Capsule) ---
class RegretModel(BaseModel):
    text: str = Field(..., max_length=2000)
    action_to_avoid: Optional[str] = Field("", max_length=500)
    date: Optional[str] = Field(None, max_length=30)

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Regret cannot be empty")
        return v

class FutureAdviceModel(BaseModel):
    content: str = Field(..., max_length=2000)
    target_read_date: Optional[str] = Field("", max_length=30)
    target_age: Optional[int] = None
    created_at: Optional[str] = Field(None, max_length=30)

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Advice cannot be empty")
        return v

class PastAdviceModel(BaseModel):
    from_age: Optional[int] = None
    content: str = Field(..., max_length=2000)
    applied: Optional[str] = Field("", max_length=500)

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Advice cannot be empty")
        return v

class LifeLessonModel(BaseModel):
    principle: str = Field(..., max_length=200)
    context: Optional[str] = Field("", max_length=500)
    date_learned: Optional[str] = Field(None, max_length=30)
    category: Optional[str] = Field("", max_length=500)

    @field_validator("principle")
    @classmethod
    def principle_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Lesson principle cannot be empty")
        return v

# --- Creativity & Passion Projects ---
class ProjectIdeaModel(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field("", max_length=2000)
    status: Optional[str] = Field("backlog", max_length=500) # backlog | in_progress | done
    link: Optional[str] = Field("", max_length=500)
    created_at: Optional[str] = Field(None, max_length=30)

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Project title cannot be empty")
        return v

class CreativeSessionModel(BaseModel):
    date: Optional[str] = Field(None, max_length=30)
    project_name: str = Field(..., max_length=100)
    hours: float
    output_notes: Optional[str] = Field("", max_length=2000)

    @field_validator("project_name")
    @classmethod
    def project_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Project name cannot be empty")
        return v

# --- Spirituality & Philosophy ---
class MeaningLogModel(BaseModel):
    date: Optional[str] = Field(None, max_length=30)
    experience: str = Field(..., max_length=200)
    why_meaningful: Optional[str] = Field("", max_length=500)

    @field_validator("experience")
    @classmethod
    def experience_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Experience cannot be empty")
        return v

# --- Fun, Play & Leisure ---
class TravelLogModel(BaseModel):
    date: Optional[str] = Field(None, max_length=30)
    destination: str = Field(..., max_length=200)
    memories: Optional[str] = Field("", max_length=500)
    photos_link: Optional[str] = Field("", max_length=500)

    @field_validator("destination")
    @classmethod
    def destination_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Destination cannot be empty")
        return v

class BucketListModel(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = Field("", max_length=2000)
    status: Optional[str] = Field("not_started", max_length=500) # not_started | in_progress | done
    target_date: Optional[str] = Field("", max_length=30)
    completed_date: Optional[str] = Field("", max_length=30)

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Bucket list item cannot be empty")
        return v

# --- Learning & Growth ---
class SkillModel(BaseModel):
    name: str = Field(..., max_length=100)
    category: Optional[str] = Field("", max_length=500) # Technical, Creative, Soft Skills, etc.
    level: Optional[int] = 1       # 1-5
    notes: Optional[str] = Field("", max_length=2000)
    started_at: Optional[str] = Field("", max_length=30)

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Skill name cannot be empty")
        return v

class CourseModel(BaseModel):
    title: str = Field(..., max_length=200)
    provider: Optional[str] = Field("", max_length=500)
    hours_spent: Optional[float] = 0.0
    status: Optional[str] = Field("in_progress", max_length=500) # in_progress | completed | dropped
    what_learned: Optional[str] = Field("", max_length=500)
    started_at: Optional[str] = Field("", max_length=30)
    completed_at: Optional[str] = Field("", max_length=30)

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Course title cannot be empty")
        return v

class FailureLogEntryModel(BaseModel):
    date: Optional[str] = Field(None, max_length=30)
    what_happened: str = Field(..., max_length=200)
    lesson: Optional[str] = Field("", max_length=500)
    domain: Optional[str] = Field("", max_length=500) # Work, Health, Relationships, etc.

    @field_validator("what_happened")
    @classmethod
    def what_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Describe what happened")
        return v

# --- Career & Work ---
class SkillsGapModel(BaseModel):
    skill: str = Field(..., max_length=200)
    current_level: Optional[str] = Field("", max_length=500)
    target_level: Optional[str] = Field("", max_length=500)
    why_needed: Optional[str] = Field("", max_length=500)
    resources: Optional[str] = Field("", max_length=500)

    @field_validator("skill")
    @classmethod
    def skill_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Skill name cannot be empty")
        return v

class FeedbackModel(BaseModel):
    date: Optional[str] = Field(None, max_length=30)
    from_person: Optional[str] = Field("", max_length=500)
    feedback_type: Optional[str] = Field("positive", max_length=500) # positive | critical | mixed
    content: str = Field(..., max_length=2000)
    action_taken: Optional[str] = Field("", max_length=500)

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Feedback content cannot be empty")
        return v



# --- Health & Body ---
class SleepLogModel(BaseModel):
    date: str = Field(..., max_length=30)
    bedtime: str = Field(..., max_length=200)
    wake_time: str = Field(..., max_length=200)
    quality: int # 1-10
    notes: Optional[str] = Field("", max_length=2000)

    @field_validator("quality")
    @classmethod
    def clamp_quality(cls, v):
        if not (1 <= v <= 10):
            raise ValueError("Quality must be between 1 and 10")
        return v

class ExerciseSetModel(BaseModel):
    reps: int
    weight: float

class ExerciseLogEntryModel(BaseModel):
    exercise_name: str = Field(..., max_length=100)
    muscle_group: str = Field(..., max_length=200) # Chest, Back, Legs, Arms, Shoulders, Core, Cardio
    sets: List[ExerciseSetModel]
    notes: Optional[str] = Field("", max_length=2000)

class WorkoutSessionModel(BaseModel):
    date: str = Field(..., max_length=30)
    type: str = Field(..., max_length=200) # gym, run, yoga
    duration_minutes: int
    intensity: int # 1-10
    exercises: List[ExerciseLogEntryModel]
    notes: Optional[str] = Field("", max_length=2000)

    @field_validator("intensity")
    @classmethod
    def clamp_intensity(cls, v):
        if not (1 <= v <= 10):
            raise ValueError("Intensity must be between 1 and 10")
        return v

class ExerciseGoalModel(BaseModel):
    exercise_name: str = Field(..., max_length=100)
    muscle_group: str = Field(..., max_length=200)
    target_sets: int
    target_reps: int
    target_weight: float
    deadline: str = Field(..., max_length=30)
    status: Optional[str] = Field("pending", max_length=500) # pending, achieved, failed

class HealthMetricsModel(BaseModel):
    date: str = Field(..., max_length=30)
    water_ml: int
    nutrition_quality: int # 1-10
    notes: Optional[str] = Field("", max_length=2000)

class MealLogModel(BaseModel):
    date: str = Field(..., max_length=30)
    meal_type: str = Field(..., max_length=200) # Breakfast, Lunch, Dinner, Snack
    calories: int
    protein_g: Optional[int] = 0
    carbs_g: Optional[int] = 0
    fat_g: Optional[int] = 0
    notes: Optional[str] = Field("", max_length=2000)



class CustomExerciseIn(BaseModel):
    exercise_name: str = Field(..., max_length=100)
    muscle_group: str = Field(..., max_length=200)

class ExerciseGoalStatusPatch(BaseModel):
    status: Literal["pending", "achieved", "failed"]

# --- Lotus Blossom ---
from typing import Dict

class LotusNodeModel(BaseModel):
    id: str = Field(..., max_length=100)
    text: str = Field("", max_length=2000)
    description: Optional[str] = Field("", max_length=5000)
    parentId: Optional[str] = Field(None, max_length=100)
    childrenIds: List[Optional[str]]
    color: Optional[str] = Field(None, max_length=50)
    status: Optional[str] = Field(None, max_length=50)


class LotusBlossomModel(BaseModel):
    title: str = Field("Untitled Blossom", max_length=200)
    nodes: Dict[str, LotusNodeModel]
    activeNodeId: str = Field(..., max_length=100)
    created_at: Optional[str] = Field(None, max_length=30)
    updated_at: Optional[str] = Field(None, max_length=30)

class LotusBlossomUpdateModel(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    nodes: Optional[Dict[str, LotusNodeModel]] = None
    activeNodeId: Optional[str] = Field(None, max_length=100)