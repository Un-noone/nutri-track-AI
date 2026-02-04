"""Pydantic models for user authentication."""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """Request to create a new user."""
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class UserLogin(BaseModel):
    """Request to login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User data returned in responses."""
    id: str
    email: str
    name: str
    created_at: datetime


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserInDB(BaseModel):
    """User as stored in database."""
    id: Optional[str] = None
    email: str
    password_hash: str
    name: str
    created_at: datetime
    updated_at: datetime
