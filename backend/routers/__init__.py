"""Routers package."""

from .auth import router as auth_router
from .food import router as food_router
from .entries import router as entries_router

__all__ = ["auth_router", "food_router", "entries_router"]
