"""
Romora matching script v2.

Reads every profile and its preferences, then for each pair of students:
  1. HARD FILTERS (a pair that fails any of these is dropped):
       - gender: each person's preferred_roommate_gender must accept the other's gender
                 ('any' accepts everyone)
       - budget: the two budget ranges must overlap
       - move-in: same timeline, or at least one person is 'flexible'
  2. SOFT SCORE out of 100:
       furnishing 20, food 20, locality 20, year/branch 15, budget fit 15,
       bio similarity 10 (semantic similarity of the "About you" bios)
  3. Writes one row per surviving pair into `matches`, with a match_reasons JSON
     that the Groq explanation step will use later.

Run from the backend folder with the virtual environment active:
    python app/matching.py

NOTE: re-running deletes all existing matches first, which also clears any stored
ai_explanation. Run the matching script BEFORE the Groq explanation step, and
re-run the explanation step after any re-match.
"""

import os
import sys
from datetime import datetime, timezone
from itertools import combinations

from dotenv import load_dotenv
from supabase import create_client

try:  # imported by the API as app.matching
    from app.embeddings import similarity
except ModuleNotFoundError:  # run directly: python app/matching.py
    from embeddings import similarity

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_URL or not SERVICE_KEY:
    sys.exit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env")

sb = create_client(SUPABASE_URL, SERVICE_KEY)

WEIGHTS = {"furnishing": 20, "food": 20, "locality": 20,
           "year_branch": 15, "budget": 15, "bio": 10}
FURN_ORDER = {"unfurnished": 0, "semi_furnished": 1, "fully_furnished": 2}

# Cosine similarity range mapped onto 0..10 bio points (tune using python app/embeddings.py)
BIO_LOW, BIO_HIGH = 0.52, 0.80


def label(value: str) -> str:
    return str(value).replace("_", " ")


# ----------------------------------------------------------------- hard filters
def accepts(preferred: str, gender: str) -> bool:
    return preferred == "any" or preferred == gender


def hard_filter(a: dict, b: dict):
    """Return None if the pair passes, otherwise the name of the filter that failed."""
    if not (accepts(a["preferred_roommate_gender"], b["gender"])
            and accepts(b["preferred_roommate_gender"], a["gender"])):
        return "gender"
    if not (a["budget_min"] <= b["budget_max"] and b["budget_min"] <= a["budget_max"]):
        return "budget"
    ta, tb = a["move_in_timeline"], b["move_in_timeline"]
    if not (ta == tb or ta == "flexible" or tb == "flexible"):
        return "move_in"
    return None


# ----------------------------------------------------------------- soft scoring
def score_furnishing(a, b):
    diff = abs(FURN_ORDER[a["furnishing"]] - FURN_ORDER[b["furnishing"]])
    if diff == 0:
        return 20, f"Both prefer a {label(a['furnishing'])} place"
    if diff == 1:
        return 10, f"Close on furnishing ({label(a['furnishing'])} and {label(b['furnishing'])})"
    return 0, "Very different furnishing needs"


def score_food(a, b):
    fa, fb = a["food_preference"], b["food_preference"]
    if fa == fb:
        if fa == "no_preference":
            return 20, "Both are flexible about food"
        return 20, f"Both eat {label(fa)}"
    if "no_preference" in (fa, fb):
        return 16, "One of you is flexible about food"
    return 4, "Different food habits"


def score_locality(a, b):
    la, lb = a.get("preferred_locality"), b.get("preferred_locality")
    if la and lb:
        if la == lb:
            return 20, f"Both want {la}"
        return 0, f"Different preferred areas ({la} and {lb})"
    return 10, "One of you has not picked a preferred area"


def score_year_branch(a, b):
    points, notes = 0, []
    gap = abs(a["year_of_study"] - b["year_of_study"])
    if gap == 0:
        points += 8
        notes.append(f"both in year {a['year_of_study']}")
    elif gap == 1:
        points += 4
        notes.append("one year apart")
    if (a["branch"] or "").strip().lower() == (b["branch"] or "").strip().lower():
        points += 7
        notes.append(f"same branch ({a['branch']})")
    return points, ", ".join(notes).capitalize() if notes else "Different year and branch"


def score_budget(a, b):
    lo = max(a["budget_min"], b["budget_min"])
    hi = min(a["budget_max"], b["budget_max"])
    overlap = max(hi - lo, 0)
    narrower = min(a["budget_max"] - a["budget_min"],
                   b["budget_max"] - b["budget_min"])
    ratio = 1.0 if narrower <= 0 else min(overlap / narrower, 1.0)
    return round(WEIGHTS["budget"] * ratio, 1), f"Shared budget of ₹{lo} to ₹{hi}"


def score_bio(a, b):
    sim = similarity(a.get("bio_raw"), b.get("bio_raw"))
    if sim is None:
        return WEIGHTS["bio"] * 0.5, "No bio to compare yet"
    ratio = min(max((sim - BIO_LOW) / (BIO_HIGH - BIO_LOW), 0.0), 1.0)
    points = round(WEIGHTS["bio"] * ratio, 1)
    if ratio >= 0.6:
        note = "Your bios describe a similar lifestyle and interests"
    elif ratio >= 0.3:
        note = "Your bios share a few themes"
    else:
        note = "Your bios describe quite different interests"
    return points, note


def score_pair(a, b):
    parts = {
        "furnishing": score_furnishing(a, b),
        "food": score_food(a, b),
        "locality": score_locality(a, b),
        "year_branch": score_year_branch(a, b),
        "budget": score_budget(a, b),
        "bio": score_bio(a, b),
    }
    total = sum(points for points, _ in parts.values())
    breakdown = {
        key: {"points": points, "max": WEIGHTS[key], "note": note}
        for key, (points, note) in parts.items()
    }
    highlights = [
        v["note"] for v in breakdown.values() if v["points"] >= 0.6 * v["max"]
    ]
    reasons = {"breakdown": breakdown, "highlights": highlights}
    return int(round(total)), reasons


# ----------------------------------------------------------------- main
def main() -> None:
    profiles = sb.table("student_profiles").select(
        "id, full_name, username, gender, year_of_study, branch, bio_raw"
    ).execute().data
    prefs = sb.table("preferences").select("*").execute().data
    prefs_by_profile = {p["profile_id"]: p for p in prefs}

    people = []
    for p in profiles:
        pref = prefs_by_profile.get(p["id"])
        if not pref:
            print(f"  skipping {p['full_name']}: no preferences row")
            continue
        extras = {k: v for k, v in pref.items()
                  if k not in ("id", "profile_id", "created_at", "updated_at")}
        people.append({**extras, **p})

    print(f"Loaded {len(people)} profiles with preferences")

    rejected = {"gender": 0, "budget": 0, "move_in": 0}
    rows = []
    now = datetime.now(timezone.utc).isoformat()

    for x, y in combinations(people, 2):
        a, b = (x, y) if x["id"] < y["id"] else (
            y, x)  # one row per pair, stable order
        failed = hard_filter(a, b)
        if failed:
            rejected[failed] += 1
            continue
        score, reasons = score_pair(a, b)
        rows.append({
            "profile_a_id": a["id"],
            "profile_b_id": b["id"],
            "match_score": score,
            "match_reasons": reasons,
            "computed_at": now,
        })

    total_pairs = len(people) * (len(people) - 1) // 2
    print(f"Pairs considered: {total_pairs}")
    print(f"Rejected by gender: {rejected['gender']}, budget: {rejected['budget']}, "
          f"move-in: {rejected['move_in']}")
    print(f"Pairs that passed all filters: {len(rows)}")

    # Replace old matches (delete needs a filter, so match every row)
    sb.table("matches").delete().neq(
        "profile_a_id", "00000000-0000-0000-0000-000000000000"
    ).execute()
    for i in range(0, len(rows), 100):
        sb.table("matches").insert(rows[i:i + 100]).execute()
    print(f"Wrote {len(rows)} rows to matches")

    # Quick look at the demo account's best matches
    names = {p["id"]: p["full_name"] for p in people}
    demo = next((p for p in people if p["username"] == "aarav_sharma"), None)
    if demo:
        mine = [r for r in rows if demo["id"] in (
            r["profile_a_id"], r["profile_b_id"])]
        mine.sort(key=lambda r: r["match_score"], reverse=True)
        print(f"\nTop matches for {demo['full_name']} (demo01):")
        for r in mine[:5]:
            other = r["profile_b_id"] if r["profile_a_id"] == demo["id"] else r["profile_a_id"]
            print(f"  {r['match_score']:>3}%  {names[other]}")


if __name__ == "__main__":
    main()
