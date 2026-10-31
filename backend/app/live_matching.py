"""
Live matching for ONE profile.

Uses the exact same hard filters and scoring as matching.py (imported from it),
but only re-scores a single profile against everyone else and replaces just that
profile's rows in `matches`. Used by the API so a new user gets results instantly.
"""

import time
from datetime import datetime, timezone

from app.embeddings import embed
from app.matching import hard_filter, score_pair, sb

try:  # explanations need GROQ_API_KEY; the API still works without it
    from app.ai_explanations import ask_groq, build_prompt
except SystemExit as exc:
    ask_groq = build_prompt = None
    print(f"AI explanations disabled: {exc}")

# Load the embedding model now so the first request is not slow
embed("warm up")


def match_one(profile_id: str) -> list[dict]:
    profiles = sb.table("student_profiles").select(
        "id, full_name, username, gender, year_of_study, branch, bio_raw"
    ).execute().data
    prefs = {p["profile_id"]: p for p in sb.table(
        "preferences").select("*").execute().data}

    people = []
    for p in profiles:
        pref = prefs.get(p["id"])
        if not pref:
            continue
        extras = {k: v for k, v in pref.items()
                  if k not in ("id", "profile_id", "created_at", "updated_at")}
        people.append({**extras, **p})

    me = next((p for p in people if p["id"] == profile_id), None)
    if me is None:
        raise ValueError("Profile or preferences not found")

    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for other in people:
        if other["id"] == profile_id:
            continue
        a, b = (me, other) if me["id"] < other["id"] else (other, me)
        if hard_filter(a, b):
            continue
        score, reasons = score_pair(a, b)
        rows.append({
            "profile_a_id": a["id"],
            "profile_b_id": b["id"],
            "match_score": score,
            "match_reasons": reasons,
            "computed_at": now,
        })

    # Replace only this profile's rows, leave everyone else's pairs alone
    sb.table("matches").delete().or_(
        f"profile_a_id.eq.{profile_id},profile_b_id.eq.{profile_id}"
    ).execute()
    for i in range(0, len(rows), 100):
        sb.table("matches").insert(rows[i:i + 100]).execute()
    return rows


def explain_rows(rows: list[dict]) -> None:
    """Fill ai_explanation for the given rows (runs in the background)."""
    if not ask_groq:
        return
    for r in rows:
        try:
            text = ask_groq(build_prompt(r["match_reasons"]))
            sb.table("matches").update({"ai_explanation": text}).eq(
                "profile_a_id", r["profile_a_id"]
            ).eq("profile_b_id", r["profile_b_id"]).execute()
        except Exception as exc:
            print(f"explanation failed: {exc}")
        time.sleep(2.2)  # stay under the free-tier request limit
