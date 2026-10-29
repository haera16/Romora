"""
Romora API.

Run from the backend folder with the virtual environment active:
    uvicorn app.main:app --reload --port 8000
"""

import time
from collections import defaultdict

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.live_matching import ask_groq, explain_rows, match_one
from app.matching import sb
from app import ocr_verification

app = FastAPI(title="Romora API")
app.include_router(ocr_verification.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory rate limit for match refreshes (resets when the server restarts)
REFRESH_LIMIT = 3
REFRESH_WINDOW = 60
_refresh_hits = defaultdict(list)


def _refresh_rate_limit(user_id: str):
    now = time.time()
    recent = [t for t in _refresh_hits[user_id] if now - t < REFRESH_WINDOW]
    if len(recent) >= REFRESH_LIMIT:
        _refresh_hits[user_id] = recent
        raise HTTPException(
            status_code=429, detail="Too many refreshes. Please wait a minute.")
    recent.append(now)
    _refresh_hits[user_id] = recent


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/matches/refresh")
def refresh_matches(background: BackgroundTasks, authorization: str = Header(default="")):
    """Score the logged-in user against everyone now; explanations follow in the background."""
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        user = sb.auth.get_user(token).user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    _refresh_rate_limit(user.id)

    found = sb.table("student_profiles").select("id").eq(
        "user_id", user.id).limit(1).execute().data
    if not found:
        raise HTTPException(
            status_code=404, detail="Create your profile first")

    try:
        rows = match_one(found[0]["id"])
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    if ask_groq:
        background.add_task(explain_rows, rows)
    return {"matches": len(rows), "explanations": "generating" if ask_groq else "disabled"}
