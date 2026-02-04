"""Models package."""

from .food import (
    NutrientTotals,
    FoodItem,
    FoodEntry,
    FoodLogExtraction,
    FoodLogExtractionItem,
    ParseFoodLogRequest,
    ParseFoodLogResponse,
    AnalyzeImageRequest,
    UserGoals,
    UserSettings,
)
from .user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    UserInDB,
)

__all__ = [
    "NutrientTotals",
    "FoodItem",
    "FoodEntry",
    "FoodLogExtraction",
    "FoodLogExtractionItem",
    "ParseFoodLogRequest",
    "ParseFoodLogResponse",
    "AnalyzeImageRequest",
    "UserGoals",
    "UserSettings",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "UserInDB",
]
