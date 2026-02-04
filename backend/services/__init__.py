"""Services package."""

from .config import get_settings, Settings
from .mongodb import (
    connect_to_mongodb,
    close_mongodb_connection,
    get_database,
    create_user,
    get_user_by_email,
    get_user_by_id,
    create_food_entry,
    get_food_entries,
    get_food_entry_by_id,
    delete_food_entry,
    get_user_goals,
    update_user_goals,
    get_user_settings,
    update_user_settings,
)
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
    get_current_user,
    authenticate_user,
)

__all__ = [
    "get_settings",
    "Settings",
    "connect_to_mongodb",
    "close_mongodb_connection",
    "get_database",
    "create_user",
    "get_user_by_email",
    "get_user_by_id",
    "create_food_entry",
    "get_food_entries",
    "get_food_entry_by_id",
    "delete_food_entry",
    "get_user_goals",
    "update_user_goals",
    "get_user_settings",
    "update_user_settings",
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_token",
    "get_current_user",
    "authenticate_user",
]
