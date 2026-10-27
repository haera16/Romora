"""
Generate a short "why you match" explanation for every row in `matches`.

For each match it sends Groq ONLY the matching script's own facts (the notes and points
in match_reasons). No names, emails or bios are sent. The text is written about the pair as
"you two", so the same sentence reads correctly for either person viewing the card.

Run from the backend folder with the virtual environment active:
    python app\\ai_explanations.py              # fill rows that have no explanation yet
    python app\\ai_explanations.py --limit 3    # try it on 3 rows first
    python app\\ai_explanations.py --all        # regenerate every row

Needs GROQ_API_KEY in backend/.env (a real key from console.groq.com, not a placeholder).
Optional: GROQ_MODEL in backend/.env (default llama-3.3-70b-versatile).

ORDER RULE: matching.py deletes and rewrites `matches`, which clears explanations.
Always run:  seed_demo.py  ->  matching.py  ->  ai_explanations.py
"""

import argparse
import json
import os
import sys
import time

import httpx
from dotenv import load_dotenv
from supabase import create_client

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

if not SUPABASE_URL or not SERVICE_KEY:
    sys.exit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env")
if not GROQ_API_KEY or GROQ_API_KEY.strip().lower() in ("later", "your_key_here", "changeme"):
    sys.exit("GROQ_API_KEY in backend/.env is missing or still a placeholder. "
             "Create a key at console.groq.com and paste it in.")

sb = create_client(SUPABASE_URL, SERVICE_KEY)

SYSTEM_PROMPT = (
    "You write the short 'why you match' text on a roommate-matching app for college students. "
    "You are given facts about one pair of students. Write exactly 2 friendly sentences, "
    "at most 45 words in total, speaking to the pair as 'you two'. "
    "Rules: use ONLY the facts given; never invent details; do not use names; "
    "do not mention scores, percentages or points; do not mention a weakness unless no "
    "strengths are given; no emojis, no quotation marks, no lists. Output only the text."
)


def build_prompt(reasons: dict) -> str:
    lines = []
    for key, item in (reasons.get("breakdown") or {}).items():
        lines.append(
            f"- {key}: {item.get('note')} ({item.get('points')} of {item.get('max')})")
    return "Facts about this roommate pair:\n" + "\n".join(lines) + "\n\nWrite the 2 sentences now."


def ask_groq(prompt: str) -> str:
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 800,
    }
    if "gpt-oss" in MODEL:
        payload["reasoning_effort"] = "low"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}",
               "Content-Type": "application/json"}

    for attempt in range(5):
        resp = httpx.post(GROQ_URL, headers=headers, json=payload, timeout=30)
        if resp.status_code == 200:
            text = (resp.json()["choices"][0]
                    ["message"].get("content") or "").strip()
            text = text.strip('"').strip("'").strip()
            if not text:
                raise RuntimeError(
                    "Groq returned an empty answer (raise max_tokens)")
            return text
        if resp.status_code in (429, 500, 502, 503):
            wait = float(resp.headers.get("retry-after", 2 ** (attempt + 1)))
            print(
                f"    Groq said {resp.status_code}, waiting {wait:.0f}s and retrying...")
            time.sleep(wait)
            continue
        raise RuntimeError(f"Groq error {resp.status_code}: {resp.text[:300]}")
    raise RuntimeError("Groq kept failing after 5 attempts")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true",
                        help="regenerate every row")
    parser.add_argument("--limit", type=int, default=None,
                        help="only process this many rows")
    args = parser.parse_args()

    rows = sb.table("matches").select(
        "profile_a_id, profile_b_id, match_score, match_reasons, ai_explanation"
    ).execute().data

    todo = [r for r in rows if args.all or not r.get("ai_explanation")]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(rows)} matches in total, {len(todo)} to process (model: {MODEL})")

    done, failed = 0, 0
    for i, r in enumerate(todo, start=1):
        reasons = r["match_reasons"]
        if isinstance(reasons, str):
            reasons = json.loads(reasons)
        if not reasons or not reasons.get("breakdown"):
            print(f"  [{i}/{len(todo)}] skipped: no match_reasons")
            failed += 1
            continue
        try:
            text = ask_groq(build_prompt(reasons))
            sb.table("matches").update({"ai_explanation": text}).eq(
                "profile_a_id", r["profile_a_id"]
            ).eq("profile_b_id", r["profile_b_id"]).execute()
            done += 1
            print(f"  [{i}/{len(todo)}] {r['match_score']:>3}%  {text}")
        except Exception as exc:  # keep going; re-running fills the gaps
            failed += 1
            print(f"  [{i}/{len(todo)}] FAILED: {exc}")
        time.sleep(2.2)  # stay under the free-tier request limit

    print(f"\nDone. Written: {done}, failed or skipped: {failed}")
    if failed:
        print("Run the script again to fill the rows that failed.")


if __name__ == "__main__":
    main()
