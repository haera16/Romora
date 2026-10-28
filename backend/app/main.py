"""
Romora API.

Run from the backend folder with the virtual environment active:
    uvicorn app.main:app --reload --port 8000
"""

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.live_matching import ask_groq, explain_rows, match_one
from app.matching import sb

app = FastAPI(title="Romora API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
