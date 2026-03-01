import importlib.util
import json
import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


feedback_mod = load_module("feedback_api", "api/feedback-api.py")
user_mod = load_module("user_api", "api/user-api.py")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = [
        {"field": e["loc"][-1], "message": e["msg"].replace("Value error, ", "")}
        for e in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": "Validation failed", "errors": errors})


app.include_router(feedback_mod.router)
app.include_router(user_mod.router)


def run_tests():
    for f in ("data.json", "users.json"):
        if os.path.exists(f):
            os.remove(f)
    feedback_mod.feedbacks.clear()
    feedback_mod.stats.update({"total_submissions": 0, "rating_sum": 0})
    user_mod.users.clear()

    client = TestClient(app)
    passed = 0
    failed = 0

    def check(label, condition, detail=""):
        nonlocal passed, failed
        if condition:
            print(f"  [PASS] {label}")
            passed += 1
        else:
            print(f"  [FAIL] {label}" + (f" -- {detail}" if detail else ""))
            failed += 1

    # ── POST /feedback ───────────────────────────────────────────────
    print("\n POST /feedback")
    samples = [
        ("Alice", "Absolutely loved it!", 5),
        ("Bob",   "Pretty good overall",  4),
        ("Carol", "It was just okay",     3),
        ("Dan",   "Not great",            2),
    ]
    for name, msg, rating in samples:
        r = client.post("/feedback", json={"name": name, "message": msg, "rating": rating})
        check(f"status 201 for {name}",             r.status_code == 201)
        check(f"returns feedback entry for {name}", "feedback" in r.json())
        check(f"correct name for {name}",           r.json()["feedback"]["name"] == name)
        check(f"correct rating for {name}",         r.json()["feedback"]["rating"] == rating)

    # ── GET /feedback ────────────────────────────────────────────────
    print("\n GET /feedback")
    r = client.get("/feedback")
    body = r.json()
    check("status 200",                       r.status_code == 200)
    check("returns 'feedbacks' key",          "feedbacks" in body)
    check("returns at most 3 entries",        len(body["feedbacks"]) <= 3)
    check("most recent entry is first (Dan)", body["feedbacks"][0]["name"] == "Dan")
    check("second entry is Carol",            body["feedbacks"][1]["name"] == "Carol")
    check("third entry is Bob",               body["feedbacks"][2]["name"] == "Bob")

    # ── POST /stats ──────────────────────────────────────────────────
    print("\n POST /stats")
    r = client.post("/stats")
    body = r.json()
    check("status 200",                       r.status_code == 200)
    check("total_submissions == 4",           body["total_submissions"] == 4)
    check("average_sentiment == 3.5",         body["average_sentiment"] == 3.5)
    check("sentiment_label == 'positive'",    body["sentiment_label"] == "positive")

    # ── data.json persistence ────────────────────────────────────────
    print("\n data.json persistence")
    check("data.json exists",                 os.path.exists("data.json"))
    with open("data.json") as f:
        data = json.load(f)
    check("all 4 feedbacks stored",           len(data["feedbacks"]) == 4)
    check("stats total_submissions correct",  data["stats"]["total_submissions"] == 4)
    check("stats rating_sum correct",         data["stats"]["rating_sum"] == 14)

    # ── POST /users ──────────────────────────────────────────────────
    print("\n POST /users")
    r = client.post("/users", json={"username": "alice", "email": "alice@example.com"})
    check("create user returns 201",          r.status_code == 201)
    check("response contains user",           "user" in r.json())
    check("id assigned",                      r.json()["user"]["id"] == 1)
    check("duplicate username rejected 409",  client.post("/users", json={"username": "alice", "email": "x@x.com"}).status_code == 409)
    check("duplicate email rejected 409",     client.post("/users", json={"username": "bob",   "email": "alice@example.com"}).status_code == 409)
    check("invalid email rejected 422",       client.post("/users", json={"username": "charlie", "email": "not-an-email"}).status_code == 422)
    check("short username rejected 422",      client.post("/users", json={"username": "ab", "email": "ab@ab.com"}).status_code == 422)

    # ── POST /users/verify ───────────────────────────────────────────
    print("\n POST /users/verify")
    r = client.post("/users/verify", json={"username": "alice", "email": "alice@example.com"})
    check("valid user verified 200",          r.status_code == 200)
    check("returns correct user",             r.json()["user"]["username"] == "alice")
    check("wrong email returns 404",          client.post("/users/verify", json={"username": "alice", "email": "wrong@x.com"}).status_code == 404)
    check("unknown user returns 404",         client.post("/users/verify", json={"username": "ghost", "email": "alice@example.com"}).status_code == 404)

    # ── users.json persistence ───────────────────────────────────────
    print("\n users.json persistence")
    check("users.json exists",                os.path.exists("users.json"))
    with open("users.json") as f:
        udata = json.load(f)
    check("1 user stored",                    len(udata) == 1)
    check("stored user matches",              udata[0]["username"] == "alice")

    # ── summary ──────────────────────────────────────────────────────
    total = passed + failed
    print(f"\n Results: {passed}/{total} passed" + (" -- OK" if failed == 0 else f" -- {failed} FAILED"))


if __name__ == "__main__":
    if "--test" in sys.argv:
        run_tests()
    else:
        print("\n Starting server...")
        uvicorn.run(app, host="0.0.0.0", port=8000)
