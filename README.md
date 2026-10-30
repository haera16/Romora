# Romora

A roommate-matching platform for KIIT students. Students sign up with their KIIT email and ID card, describe what they are looking for in a home and a roommate, and get ranked matches with a plain-English reason for each one. When two students say hello to each other, a private chat opens.

Built as a 7th-semester major project by Ash (B.Tech CSE, KIIT University).

<!-- ![Romora landing page](docs/landing.png) -->

## Features

- **KIIT-only sign-up.** Only `<roll number>@kiit.ac.in` emails are accepted, with email confirmation.
- **ID verification at sign-up.** A vision model reads the roll number on the uploaded ID card, and it must match the email. The image is processed in memory and never stored. Only the verified roll number is saved.
- **Verified badge.** Each profile carries an `is_verified` flag, set by the system from the verified roll-number list. Users cannot set it themselves.
- **Profiles and preferences.** Budget range, locality, furnishing, food, move-in timing, group size, preferred roommate gender and a short bio.
- **Matching engine.** Hard filters (roommate gender preference, budget overlap, move-in timing) followed by weighted scoring on furnishing, food, year, branch and locality. Each match gets an AI-written explanation (Groq).
- **Bio similarity.** Bios are turned into embeddings locally with `fastembed` (no external API), stored in pgvector, and compared to add a bio-similarity factor to the score.
- **Live matching.** A new user is scored against everyone as soon as they finish their profile, with no batch script needed.
- **Explore page.** Match cards with score and explanation, a budget slider that re-ranks live, filters, a Verified badge, and a "Likes you" tag.
- **Likes and mutual matches.** Likes update in real time, and a popup appears the moment two students like each other.
- **Messages.** A dedicated inbox page listing your mutual matches with the latest message, and real-time chat between mutual matches only. No phone numbers or emails are shared by design.
- **Reports and auto-hide.** Students can report a profile. A profile reported by three different students is hidden from Explore and Messages until an admin reviews it.
- **Privacy notice.** A public `/privacy` page explains what is collected and how the ID card is handled.
- **Security.** Row Level Security on every table, locked columns, token-verified backend endpoints and rate limits on ID verification and match refresh.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, lucide-react |
| Backend | Python, FastAPI, Uvicorn |
| Database and auth | Supabase (Postgres, pgvector, Auth, Row Level Security, Realtime) |
| AI | Groq API (explanations and ID-card reading), `fastembed` (local bio embeddings) |

## Project structure

```
backend/
  app/
    main.py                API: /health, /matches/refresh
    ocr_verification.py    POST /verify-id-signup
    live_matching.py       score one user against everyone
    matching.py            batch matcher
    ai_explanations.py     Groq match explanations
  seed_demo.py             demo profiles
frontend/
  src/
    pages/                 Landing, Auth, CreateProfile, Explore, Messages, Privacy
    components/            cards, chat, report button, auth forms
database/                  SQL files (run in numeric order)
```

## Setup

### 1. Database (Supabase)

1. Create a Supabase project and enable the `vector` extension.
2. Run the SQL files in `database/` in numeric order in the SQL Editor. `03_checks.sql` is read-only checks, and the undo script is not part of the build.
3. Under Database, Replication, make sure `likes` and `messages` are in the `supabase_realtime` publication.
4. Turn on email confirmation and set up custom SMTP, so sign-up emails reach students.

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

`requirements.txt` includes `fastembed`. The first time bios are embedded, it downloads a small embedding model, so the first run needs an internet connection and takes a little longer.

Create `backend/.env`:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GROQ_API_KEY=...
GROQ_VISION_MODEL=...        # a Groq vision model that accepts images
DEMO_PASSWORD=...            # password for the seeded demo accounts
# GROQ_MODEL=...             # optional, for explanations
```

Run it:

```bash
uvicorn app.main:app --reload --port 8000
```

Check that `http://localhost:8000/health` returns `{"ok": true}`. Restart uvicorn after any change to `.env`.

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# VITE_API_URL=...           # only if the backend is not at http://localhost:8000
```

```bash
npm run dev
```

### 4. Demo data (optional)

From `backend/`, in order:

```bash
python seed_demo.py
python app/matching.py
python app/ai_explanations.py
```

`seed_demo.py` creates demo accounts whose email is the profile's own roll number (for example `23052001@kiit.ac.in`), with the password from `DEMO_PASSWORD`. Because a roll number must match the email, demo accounts follow the same rule as real ones.

Run `python app/matching.py` after seeding, and again whenever you change the scoring. It rebuilds every match and also computes bio similarity. Always rerun `ai_explanations.py` afterwards, because the matcher clears stored explanations.

Before inviting real students, delete the demo users and their rows in `verified_ids`, so demo roll numbers cannot block real sign-ups.

## Security notes

- Never commit `.env` files. The service-role key bypasses all security and must stay on the backend.
- All tables use Row Level Security. Users can read only their own likes and messages, and only mutual matches can message each other.
- **Locked columns.** Sensitive columns such as `roll_number` and `is_verified` cannot be written from the browser. A database trigger sets the roll number from the account's email, and the verified flag comes from the backend's verified list, so a user cannot claim someone else's roll number or badge.
- The backend identifies the user from the Supabase access token, never from an id sent by the browser.
- The ID image is sent to Groq's vision API to read the roll number and is not stored by Romora.

## Known limitations

- Live matching needs the backend running. If it is off, new users see estimated matches marked with `~`.
- Explanations use Groq's free tier, so a user with many matches waits about 20 to 30 seconds for all of them.
- ID reading depends on a vision model and works best with a clear, well-lit photo.
- Hiding reported profiles is enforced in the app, not in the database policies.
- Demo profiles are fake and are marked verified by SQL, not by uploading an ID.
- No contact reveal by design, so the connection happens only through in-app messages.
- No unread counts or read receipts in messages yet.
- Rental listings are not built.

## Author

Ashmita, KIIT University.
