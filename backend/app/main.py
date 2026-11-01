"""
Romora API.

Run from the backend folder with the virtual environment active:
    uvicorn app.main:app --reload --port 8000
"""

import json
import os
import time
from collections import defaultdict

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.live_matching import ask_groq, explain_rows, match_one
from app.matching import sb
from app import ocr_verification

load_dotenv()

app = FastAPI(title="Romora API")
app.include_router(ocr_verification.router)

# Local dev is always allowed; production sites come from FRONTEND_URL (comma-separated, no trailing slash)
ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
ORIGINS += [u.strip().rstrip("/")
            for u in os.getenv("FRONTEND_URL", "").split(",") if u.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory rate limits (they reset when the server restarts)
# match refreshes per user per minute
REFRESH_LIMIT, REFRESH_WINDOW = 3, 60
# explanation top-ups per user per 5 minutes
EXPLAIN_LIMIT, EXPLAIN_WINDOW = 6, 300
EXPLAIN_MAX_ROWS = 40                       # most rows one top-up will write
_hits = {"refresh": defaultdict(list), "explain": defaultdict(list)}

# Users whose explanations are being written right now (stops duplicate jobs and wasted Groq calls)
_explaining: set[str] = set()


def _rate_limit(bucket: str, key: str, limit: int, window: int, message: str):
    now = time.time()
    recent = [t for t in _hits[bucket][key] if now - t < window]
    if len(recent) >= limit:
        _hits[bucket][key] = recent
        raise HTTPException(status_code=429, detail=message)
    recent.append(now)
    _hits[bucket][key] = recent


def _user_from_token(authorization: str):
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        user = sb.auth.get_user(token).user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


def _profile_id_for(user) -> str:
    found = sb.table("student_profiles").select("id").eq(
        "user_id", user.id).limit(1).execute().data
    if not found:
        raise HTTPException(
            status_code=404, detail="Create your profile first")
    return found[0]["id"]


def _explain_job(user_id: str, rows: list[dict]) -> None:
    """Background job: write explanations, then free the user's slot."""
    try:
        explain_rows(rows)
    finally:
        _explaining.discard(user_id)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/matches/refresh")
def refresh_matches(background: BackgroundTasks, authorization: str = Header(default="")):
    """Score the logged-in user against everyone now; explanations follow in the background."""
    user = _user_from_token(authorization)
    _rate_limit("refresh", user.id, REFRESH_LIMIT, REFRESH_WINDOW,
                "Too many refreshes. Please wait a minute.")

    profile_id = _profile_id_for(user)

    try:
        rows = match_one(profile_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    if ask_groq:
        _explaining.add(user.id)
        background.add_task(_explain_job, user.id, rows)
    return {"matches": len(rows), "explanations": "generating" if ask_groq else "disabled"}


@app.post("/matches/explain")
def explain_missing(background: BackgroundTasks, authorization: str = Header(default="")):
    """Safety net: write explanations for this user's matches that still have none."""
    user = _user_from_token(authorization)
    _rate_limit("explain", user.id, EXPLAIN_LIMIT, EXPLAIN_WINDOW,
                "Too many requests. Please wait a few minutes.")

    if not ask_groq:
        return {"status": "disabled", "missing": 0}
    if user.id in _explaining:
        return {"status": "busy", "missing": 0}

    profile_id = _profile_id_for(user)
    rows = (
        sb.table("matches")
        .select("profile_a_id, profile_b_id, match_reasons")
        .or_(f"profile_a_id.eq.{profile_id},profile_b_id.eq.{profile_id}")
        .is_("ai_explanation", "null")
        .limit(EXPLAIN_MAX_ROWS)
        .execute()
        .data
    )
    for r in rows:
        if isinstance(r["match_reasons"], str):
            r["match_reasons"] = json.loads(r["match_reasons"])
    if not rows:
        return {"status": "none", "missing": 0}

    _explaining.add(user.id)
    background.add_task(_explain_job, user.id, rows)
    return {"status": "generating", "missing": len(rows)}
