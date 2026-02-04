"""Pydantic models for food-related data."""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class NutrientTotals(BaseModel):
    """Nutritional values for a food item."""
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0


class FoodItem(BaseModel):
    """Individual food item with nutrition info."""
    name: str
    quantity: float
    unit: str
    nutrients_total: NutrientTotals
    source: Literal["text", "image"] = "text"
    confidence: float = Field(default=1.0, ge=0, le=1)


class FoodEntry(BaseModel):
    """Complete food log entry."""
    id: Optional[str] = None
    user_id: Optional[str] = None
    logged_at: str  # ISO datetime string
    raw_text: str
    meal_label: Optional[Literal["Breakfast", "Lunch", "Dinner", "Snack"]] = None
    items: List[FoodItem]
    totals: NutrientTotals
    image_base64: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FoodLogExtractionItem(BaseModel):
    """Item extracted from food log parsing."""
    item_name: str
    qty: Optional[float] = None
    unit: Optional[str] = None
    brand: Optional[str] = None
    search_query: str
    notes: Optional[str] = None
    # Nutrition fields from AI parsing
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


class FoodLogExtraction(BaseModel):
    """Result of food log parsing."""
    meal: Literal["Breakfast", "Lunch", "Dinner", "Snack"]
    datetime_local: str
    items: List[FoodLogExtractionItem]
    needs_clarification: bool = False
    clarification_question: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0, le=1)


class ParseFoodLogRequest(BaseModel):
    """Request to parse a food log."""
    text: str
    current_datetime: Optional[str] = None
    timezone: Optional[str] = "UTC"
    country_iso2: Optional[str] = "US"


class ParseFoodLogResponse(BaseModel):
    """Response from food log parsing."""
    items: List[FoodItem]
    logged_at_iso: str
    meal_label: Optional[str] = None
    needs_clarification: bool = False
    clarification_question: Optional[str] = None
    confidence_score: float = 1.0


class AnalyzeImageRequest(BaseModel):
    """Request to analyze a food image."""
    context: Optional[str] = ""


class UserGoals(BaseModel):
    """User's nutritional goals."""
    id: Optional[str] = None
    user_id: Optional[str] = None
    calories: float = 2000
    protein_g: float = 50
    carbs_g: float = 250
    fat_g: float = 65
    updated_at: Optional[datetime] = None


class UserSettings(BaseModel):
    """User's app settings."""
    id: Optional[str] = None
    user_id: Optional[str] = None
    theme: Literal["light", "dark"] = "light"
    unit_system: Literal["metric", "imperial"] = "metric"
    updated_at: Optional[datetime] = None
