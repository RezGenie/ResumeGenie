# Import all models to ensure they are registered with SQLAlchemy
from .user import User
from .resume import Resume
from .job_comparison import JobComparison
from .genie_wish import GenieWish, DailyWishCount
from .guest_session import GuestSession, GuestDailyUpload, GuestDailyWish

__all__ = [
    "User",
    "Resume", 
    "JobComparison",
    "GenieWish",
    "DailyWishCount",
    "GuestSession",
    "GuestDailyUpload",
    "GuestDailyWish"
]