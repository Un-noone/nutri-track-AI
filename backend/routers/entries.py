"""Food entries CRUD API routes."""

from typing import List
from fastapi import APIRouter, HTTPException, Depends

from models import FoodEntry, UserGoals, UserSettings
from services import (
    get_current_user,
    create_food_entry,
    get_food_entries,
    get_food_entry_by_id,
    delete_food_entry,
    get_user_goals,
    update_user_goals,
    get_user_settings,
    update_user_settings,
)

router = APIRouter(prefix="/api", tags=["Entries"])


# ============ Food Entries ============

@router.get("/entries", response_model=List[FoodEntry])
async def list_entries(
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
):
    """Get all food entries for the current user."""
    entries = await get_food_entries(current_user["id"], limit=limit)
    return entries


@router.post("/entries", response_model=FoodEntry)
async def create_entry(
    entry: FoodEntry,
    current_user: dict = Depends(get_current_user),
):
    """Create a new food entry."""
    entry_dict = entry.model_dump(exclude={"id", "user_id", "created_at", "updated_at"})
    created = await create_food_entry(current_user["id"], entry_dict)
    return created


@router.get("/entries/{entry_id}", response_model=FoodEntry)
async def get_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a specific food entry."""
    entry = await get_food_entry_by_id(entry_id, current_user["id"])
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.delete("/entries/{entry_id}")
async def remove_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a food entry."""
    deleted = await delete_food_entry(entry_id, current_user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"message": "Entry deleted"}


# ============ Goals ============

@router.get("/goals", response_model=UserGoals)
async def get_goals(current_user: dict = Depends(get_current_user)):
    """Get user's nutritional goals."""
    goals = await get_user_goals(current_user["id"])
    return goals


@router.put("/goals", response_model=UserGoals)
async def set_goals(
    goals: UserGoals,
    current_user: dict = Depends(get_current_user),
):
    """Update user's nutritional goals."""
    goals_dict = goals.model_dump(exclude={"id", "user_id", "updated_at"})
    updated = await update_user_goals(current_user["id"], goals_dict)
    return updated


# ============ Settings ============

@router.get("/settings", response_model=UserSettings)
async def get_settings(current_user: dict = Depends(get_current_user)):
    """Get user's app settings."""
    settings = await get_user_settings(current_user["id"])
    return settings


@router.put("/settings", response_model=UserSettings)
async def set_settings(
    settings: UserSettings,
    current_user: dict = Depends(get_current_user),
):
    """Update user's app settings."""
    settings_dict = settings.model_dump(exclude={"id", "user_id", "updated_at"})
    updated = await update_user_settings(current_user["id"], settings_dict)
    return updated
