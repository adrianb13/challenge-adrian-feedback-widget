import importlib.util
import json
import os
import uvicorn
from fastapi.testclient import TestClient

spec = importlib.util.spec_from_file_location("feedback_api", "api/feedback-api.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def run_tests():
    # reset data.json for a clean test run
    if os.path.exists("data.json"):
        os.remove("data.json")
    module.feedbacks.clear()
    module.stats.update({"total_submissions": 0, "rating_sum": 0})

    client = TestClient(module.app)
    passed = 0
    failed = 0

    def check(label, condition, detail=""):
        nonlocal passed, failed
        if condition:
            print(f"  [PASS] {label}")
            passed += 1
        else:
            print(f"  [FAIL] {label}" + (f" — {detail}" if detail else ""))
            failed += 1

    # ── POST /feedback ──────────────────────────────────────────────
    print("\n POST /feedback")
    samples = [
        ("Alice", "Absolutely loved it!", 5),
        ("Bob",   "Pretty good overall", 4),
        ("Carol", "It was just okay",    3),
        ("Dan",   "Not great",           2),
    ]
    for name, msg, rating in samples:
        r = client.post("/feedback", json={"name": name, "message": msg, "rating": rating})
        check(f"status 200 for {name}",            r.status_code == 200)
        check(f"returns feedback entry for {name}", "feedback" in r.json())
        check(f"correct name for {name}",           r.json()["feedback"]["name"] == name)
        check(f"correct rating for {name}",         r.json()["feedback"]["rating"] == rating)

    # ── GET /feedback ───────────────────────────────────────────────
    print("\n GET /feedback")
    r = client.get("/feedback")
    body = r.json()
    check("status 200",                          r.status_code == 200)
    check("returns 'feedbacks' key",             "feedbacks" in body)
    check("returns at most 3 entries",           len(body["feedbacks"]) <= 3)
    check("most recent entry is first (Dan)",    body["feedbacks"][0]["name"] == "Dan")
    check("second entry is Carol",               body["feedbacks"][1]["name"] == "Carol")
    check("third entry is Bob",                  body["feedbacks"][2]["name"] == "Bob")

    # ── POST /stats ─────────────────────────────────────────────────
    print("\n POST /stats")
    r = client.post("/stats")
    body = r.json()
    check("status 200",                          r.status_code == 200)
    check("total_submissions == 4",              body["total_submissions"] == 4)
    check("average_sentiment == 3.5",            body["average_sentiment"] == 3.5)
    check("sentiment_label == 'positive'",       body["sentiment_label"] == "positive")

    # ── data.json persistence ────────────────────────────────────────
    print("\n data.json persistence")
    check("data.json exists",                    os.path.exists("data.json"))
    with open("data.json") as f:
        data = json.load(f)
    check("all 4 feedbacks stored",             len(data["feedbacks"]) == 4)
    check("stats total_submissions correct",     data["stats"]["total_submissions"] == 4)
    check("stats rating_sum correct",            data["stats"]["rating_sum"] == 14)

    # ── summary ──────────────────────────────────────────────────────
    total = passed + failed
    print(f"\n Results: {passed}/{total} passed" + (" -- OK" if failed == 0 else f" -- {failed} FAILED"))


if __name__ == "__main__":
    run_tests()
    print("\n Starting server...")
    uvicorn.run(module.app, host="0.0.0.0", port=8000)
