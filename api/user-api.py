import json
import os
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from datetime import datetime

router = APIRouter(prefix="/users", tags=["users"])

USERS_FILE = "users.json"

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    try:
        with open(USERS_FILE, "r") as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError("Malformed users file")
        return data
    except (json.JSONDecodeError, ValueError):
        return []


def save_users(data: list):
    try:
        with open(USERS_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to save users: {str(e)}")


users = load_users()


class User(BaseModel):
    username: str
    email: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Username cannot be empty")
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 50:
            raise ValueError("Username cannot exceed 50 characters")
        return v

    @field_validator("email")
    @classmethod
    def email_valid(cls, v):
        v = v.strip().lower()
        if not v:
            raise ValueError("Email cannot be empty")
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email address")
        return v


@router.post("", status_code=201)
def create_user(user: User):
    try:
        if any(u["username"].lower() == user.username.lower() for u in users):
            raise HTTPException(status_code=409, detail="Username already exists")
        if any(u["email"] == user.email for u in users):
            raise HTTPException(status_code=409, detail="Email already registered")
        entry = {
            "id": len(users) + 1,
            "username": user.username,
            "email": user.email,
            "created_at": datetime.utcnow().isoformat(),
        }
        users.append(entry)
        save_users(users)
        return {"message": "User created successfully", "user": entry}
    except HTTPException:
        raise
    except Exception as e:
        if users and users[-1].get("username") == user.username:
            users.pop()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


@router.post("/verify")
def verify_user(user: User):
    try:
        match = next(
            (u for u in users if u["username"].lower() == user.username.lower() and u["email"] == user.email),
            None,
        )
        if not match:
            raise HTTPException(status_code=404, detail="No user found with that username and email")
        return {"message": "User verified", "user": match}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify user: {str(e)}")
