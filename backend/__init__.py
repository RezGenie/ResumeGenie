# Re-export the FastAPI app from the main module for convenience in tests and external imports
from .main import app  # noqa: F401

__all__ = ["app"]
