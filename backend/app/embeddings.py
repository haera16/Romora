"""
Bio similarity for matching.

Turns each "About you" bio into a 384-number vector with a small local model
(BAAI/bge-small-en-v1.5 via fastembed) and compares two bios with cosine similarity.
Vectors are cached in memory by bio text, so each bio is embedded only once per run.
If fastembed is not installed, similarity() returns None and matching still works.
"""

import math

MODEL_NAME = "BAAI/bge-small-en-v1.5"

_model = None
_failed = False
_cache: dict[str, list[float]] = {}


def _get_model():
    global _model, _failed
    if _model is None and not _failed:
        try:
            from fastembed import TextEmbedding
            _model = TextEmbedding(MODEL_NAME)
        except Exception as exc:
            _failed = True
            print(f"Bio similarity disabled: {exc}")
    return _model


def embed(text):
    text = (text or "").strip()
    if not text:
        return None
    if text in _cache:
        return _cache[text]
    model = _get_model()
    if model is None:
        return None
    vec = [float(x) for x in list(model.embed([text]))[0]]
    _cache[text] = vec
    return vec


def similarity(text_a, text_b):
    """Cosine similarity of two bios, or None if either bio is empty or the model is unavailable."""
    va, vb = embed(text_a), embed(text_b)
    if va is None or vb is None:
        return None
    dot = sum(x * y for x, y in zip(va, vb))
    na = math.sqrt(sum(x * x for x in va))
    nb = math.sqrt(sum(y * y for y in vb))
    return dot / (na * nb) if na and nb else None


if __name__ == "__main__":
    # Look at real similarity values (run from backend/: python app/embeddings.py)
    import os
    import sys
    from dotenv import load_dotenv
    from supabase import create_client

    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv()
    sb = create_client(os.environ["SUPABASE_URL"],
                       os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    people = sb.table("student_profiles").select(
        "full_name, username, bio_raw").execute().data
    base = next(
        (p for p in people if p["username"] == "aarav_sharma"), people[0])
    print(f"Bio similarity with {base['full_name']}:")
    scored = []
    for p in people:
        if p is base:
            continue
        s = similarity(base.get("bio_raw"), p.get("bio_raw"))
        if s is not None:
            scored.append((s, p["full_name"]))
    for s, name in sorted(scored, reverse=True):
        print(f"  {s:.3f}  {name}")
