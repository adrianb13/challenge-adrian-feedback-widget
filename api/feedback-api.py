import json
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "data.json"


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {"feedbacks": [], "stats": {"total_submissions": 0, "rating_sum": 0}}


def save_data(data: dict):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


data = load_data()
feedbacks = data["feedbacks"]
stats = data["stats"]


class Feedback(BaseModel):
    name: str
    message: str
    rating: int


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


@app.get("/feedback")
def get_feedback():
    stored = load_data()
    recent = stored["feedbacks"][-3:][::-1]
    return {"feedbacks": recent}


@app.post("/feedback")
def post_feedback(feedback: Feedback):
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


@app.post("/stats")
def get_stats():
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
