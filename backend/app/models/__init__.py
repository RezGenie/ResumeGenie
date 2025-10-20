# Import all models to ensure they are registered with SQLAlchemy
from .user import User
from .resume import Resume
from .job_comparison import JobComparison
from .genie_wish import GenieWish, DailyWishCount
from .guest_session import GuestSession, GuestDailyUpload, GuestDailyWish
from .job import Job
from .user_preferences import UserPreferences
from .job_swipe import JobSwipe
from .saved_job import SavedJob

__all__ = [
    "User",
    "Resume", 
    "JobComparison",
    "GenieWish",
    "DailyWishCount",
    "GuestSession",
    "GuestDailyUpload",
    "GuestDailyWish",
    "Job",
    "UserPreferences", 
    "JobSwipe",
    "SavedJob"
]