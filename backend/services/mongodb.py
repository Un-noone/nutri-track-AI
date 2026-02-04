"""MongoDB connection and database operations."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from .config import get_settings

# Global database client
_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def connect_to_mongodb():
    """Connect to MongoDB."""
    global _client, _db
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    _db = _client.get_default_database()

    # Create indexes
    await _db.users.create_index("email", unique=True)
    await _db.food_entries.create_index([("user_id", 1), ("logged_at", -1)])

    print(f"Connected to MongoDB: {_db.name}")


async def close_mongodb_connection():
    """Close MongoDB connection."""
    global _client
    if _client:
        _client.close()
        print("MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance."""
    if _db is None:
        raise RuntimeError("Database not connected. Call connect_to_mongodb() first.")
    return _db


def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


# ============ User Operations ============

async def create_user(email: str, password_hash: str, name: str) -> dict:
    """Create a new user."""
    db = get_database()
    now = datetime.utcnow()
    user = {
        "email": email,
        "password_hash": password_hash,
        "name": name,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(user)
    user["_id"] = result.inserted_id
    return serialize_doc(user)


async def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email."""
    db = get_database()
    user = await db.users.find_one({"email": email})
    return serialize_doc(user)


async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID."""
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_doc(user)


# ============ Food Entry Operations ============

async def create_food_entry(user_id: str, entry_data: dict) -> dict:
    """Create a new food entry."""
    db = get_database()
    now = datetime.utcnow()
    entry = {
        **entry_data,
        "user_id": user_id,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.food_entries.insert_one(entry)
    entry["_id"] = result.inserted_id
    return serialize_doc(entry)


async def get_food_entries(user_id: str, limit: int = 100) -> List[dict]:
    """Get food entries for a user."""
    db = get_database()
    cursor = db.food_entries.find({"user_id": user_id}).sort("logged_at", -1).limit(limit)
    entries = await cursor.to_list(length=limit)
    return [serialize_doc(e) for e in entries]


async def get_food_entry_by_id(entry_id: str, user_id: str) -> Optional[dict]:
    """Get a specific food entry."""
    db = get_database()
    entry = await db.food_entries.find_one({
        "_id": ObjectId(entry_id),
        "user_id": user_id
    })
    return serialize_doc(entry)


async def delete_food_entry(entry_id: str, user_id: str) -> bool:
    """Delete a food entry."""
    db = get_database()
    result = await db.food_entries.delete_one({
        "_id": ObjectId(entry_id),
        "user_id": user_id
    })
    return result.deleted_count > 0


# ============ Goals Operations ============

async def get_user_goals(user_id: str) -> Optional[dict]:
    """Get user's nutritional goals."""
    db = get_database()
    goals = await db.user_goals.find_one({"user_id": user_id})
    if goals:
        return serialize_doc(goals)
    # Return defaults if no goals set
    return {
        "user_id": user_id,
        "calories": 2000,
        "protein_g": 50,
        "carbs_g": 250,
        "fat_g": 65,
    }


async def update_user_goals(user_id: str, goals_data: dict) -> dict:
    """Update user's nutritional goals."""
    db = get_database()
    now = datetime.utcnow()
    goals = {
        **goals_data,
        "user_id": user_id,
        "updated_at": now,
    }
    await db.user_goals.update_one(
        {"user_id": user_id},
        {"$set": goals},
        upsert=True
    )
    result = await db.user_goals.find_one({"user_id": user_id})
    return serialize_doc(result)


# ============ Settings Operations ============

async def get_user_settings(user_id: str) -> Optional[dict]:
    """Get user's app settings."""
    db = get_database()
    settings = await db.user_settings.find_one({"user_id": user_id})
    if settings:
        return serialize_doc(settings)
    # Return defaults if no settings
    return {
        "user_id": user_id,
        "theme": "light",
        "unit_system": "metric",
    }


async def update_user_settings(user_id: str, settings_data: dict) -> dict:
    """Update user's app settings."""
    db = get_database()
    now = datetime.utcnow()
    settings = {
        **settings_data,
        "user_id": user_id,
        "updated_at": now,
    }
    await db.user_settings.update_one(
        {"user_id": user_id},
        {"$set": settings},
        upsert=True
    )
    result = await db.user_settings.find_one({"user_id": user_id})
    return serialize_doc(result)
