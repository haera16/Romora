import os
import re
import json
import time
import base64
from collections import defaultdict

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from supabase import create_client

load_dotenv()

router = APIRouter()

sb = create_client(os.environ["SUPABASE_URL"],
                   os.environ["SUPABASE_SERVICE_ROLE_KEY"])

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
VISION_MODEL = os.environ.get(
    "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
MAX_BYTES = 5 * 1024 * 1024

# In-memory rate limit (resets when the server restarts)
WINDOW_SECONDS = 600
LIMIT_PER_EMAIL = 5
LIMIT_PER_IP = 20
_hits = defaultdict(list)

PROMPT = (
    "This should be a KIIT University student ID card. Read it and reply with ONLY a JSON object: "
    '{"is_id_card": true or false, "roll_number": "the student roll number as printed, or empty string"}. '
    "The roll number is usually a numeric code. Do not guess; use an empty string if unreadable."
)


def _rate_limit(key: str, limit: int):
    now = time.time()
    recent = [t for t in _hits[key] if now - t < WINDOW_SECONDS]
    if len(recent) >= limit:
        _hits[key] = recent
        raise HTTPException(
            status_code=429, detail="Too many attempts. Please wait a few minutes and try again.")
    recent.append(now)
    _hits[key] = recent


def _read_id_with_vision(image_bytes: bytes, mime: str) -> dict:
    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "model": VISION_MODEL,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {"type": "image_url", "image_url": {
                        "url": f"data:{mime};base64,{b64}"}},
                ],
            }
        ],
    }
    headers = {"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"}
    r = httpx.post(GROQ_URL, json=payload, headers=headers, timeout=60)
    r.raise_for_status()
    text = r.json()["choices"][0]["message"]["content"]
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}


def _roll_matches(expected: str, raw_found: str) -> bool:
    """Exact match on the roll number (digits), ignoring spaces and other characters."""
    raw = str(raw_found)
    compact = re.sub(r"\D", "", raw)
    tokens = re.findall(r"\d+", raw)
    return compact == expected or expected in tokens


@router.post("/verify-id-signup")
def verify_id_signup(request: Request, email: str = Form(...), file: UploadFile = File(...)):
    email = email.strip().lower()
    if not re.fullmatch(r"[0-9]+@kiit\.ac\.in", email):
        raise HTTPException(
            status_code=400, detail="Use your KIIT email (roll number@kiit.ac.in).")

    ip = request.client.host if request.client else "unknown"
    _rate_limit(f"ip:{ip}", LIMIT_PER_IP)
    _rate_limit(f"email:{email}", LIMIT_PER_EMAIL)

    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(
            status_code=400, detail="Upload a JPG or PNG photo of your ID.")

    # Read at most MAX_BYTES + 1, so an oversized upload is rejected without loading it all
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(
            status_code=400, detail="Image is too large (max 5 MB).")

    roll = email.split("@")[0]

    try:
        result = _read_id_with_vision(data, file.content_type)
    except Exception:
        raise HTTPException(
            status_code=502, detail="Could not read the ID right now. Please try again.")

    ok = bool(result.get("is_id_card")) and _roll_matches(
        roll, result.get("roll_number", ""))

    if ok:
        sb.table("verified_ids").upsert(
            {"roll_number": roll}, on_conflict="roll_number").execute()
        return {"verified": True}

    return {"verified": False}
