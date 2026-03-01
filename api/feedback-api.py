import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from datetime import datetime

router = APIRouter(tags=["feedback"])

DATA_FILE = "data.json"


def load_data():
    if not os.path.exists(DATA_FILE):
        return {"feedbacks": [], "stats": {"total_submissions": 0, "rating_sum": 0}}
    try:
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
        if "feedbacks" not in data or "stats" not in data:
            raise ValueError("Malformed data file")
        return data
    except (json.JSONDecodeError, ValueError):
        return {"feedbacks": [], "stats": {"total_submissions": 0, "rating_sum": 0}}


def save_data(data: dict):
    try:
        with open(DATA_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Failed to save data: {str(e)}")


data = load_data()
feedbacks = data["feedbacks"]
stats = data["stats"]


class Feedback(BaseModel):
    name: str
    message: str
    rating: int

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if len(v) > 100:
            raise ValueError("Name cannot exceed 100 characters")
        return v

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 1000:
            raise ValueError("Message cannot exceed 1000 characters")
        return v

    @field_validator("rating")
    @classmethod
    def rating_in_range(cls, v):
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


def sentiment_label(avg: float) -> str:
    if avg == 5.0:
        return "perfect"
    elif avg >= 4.5:
        return "very positive"
    elif avg >= 3.5:
        return "positive"
    elif avg >= 2.5:
        return "neutral"
    elif avg >= 1.5:
        return "negative"
    return "very negative"


@router.get("/feedback")
def get_feedback():
    try:
        stored = load_data()
        recent = stored["feedbacks"][-3:][::-1]
        return {"feedbacks": recent}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve feedback: {str(e)}")


@router.post("/feedback", status_code=201)
def post_feedback(feedback: Feedback):
    try:
        entry = {
            "id": len(feedbacks) + 1,
            "name": feedback.name,
            "message": feedback.message,
            "rating": feedback.rating,
            "submitted_at": datetime.utcnow().isoformat(),
        }
        feedbacks.append(entry)
        stats["total_submissions"] += 1
        stats["rating_sum"] += feedback.rating
        save_data({"feedbacks": feedbacks, "stats": stats})
        return {"message": "Feedback submitted successfully", "feedback": entry}
    except HTTPException:
        raise
    except Exception as e:
        feedbacks.pop()
        stats["total_submissions"] -= 1
        stats["rating_sum"] -= feedback.rating
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")


@router.post("/stats")
def get_stats():
    try:
        total = stats["total_submissions"]
        if total == 0:
            return {"total_submissions": 0, "average_sentiment": None, "sentiment_label": "no data"}
        avg = stats["rating_sum"] / total
        result = {
            "total_submissions": total,
            "average_sentiment": round(avg, 2),
            "sentiment_label": sentiment_label(avg),
        }
        save_data({"feedbacks": feedbacks, "stats": stats})
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve stats: {str(e)}")
