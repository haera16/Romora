"""
Seed 16 fake KIIT students for the Romora demo.

For each student it creates:
  - an already-confirmed login  <roll number>@kiit.ac.in  (service key, no email sent)
  - a student_profiles row (roll number = email prefix, as the database requires)
  - a preferences row
  - a verified_ids row, so the demo profiles show the Verified badge
Then it adds one like: Rohan Rai -> Aarav Sharma, so that logging in as Aarav
(99000001@kiit.ac.in) and liking Rohan back makes the match mutual live.

Demo roll numbers are 99000001 to 99000016. They cannot be real KIIT roll numbers,
so they never clash with a real student's sign-up.

Safe to re-run: it first deletes earlier demo accounts (profiles with the demo
usernames below, and any email starting "demo"). Deleting the login cascades to
the profile, preferences and likes. It never deletes by roll-number range.

Run from the backend folder with the virtual environment active:
    python seed_demo.py
"""

import os
import sys

from dotenv import load_dotenv
from supabase import create_client

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD")

if not SUPABASE_URL or not SERVICE_KEY or not DEMO_PASSWORD:
    sys.exit(
        "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or DEMO_PASSWORD in backend/.env")
if len(DEMO_PASSWORD) < 8:
    sys.exit("DEMO_PASSWORD must be at least 8 characters")

sb = create_client(SUPABASE_URL, SERVICE_KEY)

DEMO_ROLL_BASE = 99000000

# (username, full_name, gender, year, branch, avatar,
#  budget_min, budget_max, furnishing, move_in, food, group, locality, pref_gender, bio)
STUDENTS = [
    ("aarav_sharma", "Aarav Sharma", "male", 3, "CSE", "arjun",
     8000, 12000, "semi_furnished", "within_month", "veg", "two", "Patia", "any",
     "Early riser who codes at night. Likes a tidy shared space and weekend cricket."),
    ("rohan_rai", "Rohan Rai", "male", 3, "CSE", "rohan",
     9000, 13000, "semi_furnished", "within_month", "veg", "two", "Patia", "male",
     "Quiet, organised and into open source. Happy to split chores on a schedule."),
    ("anika_sen", "Anika Sen", "female", 2, "ECE", "anika",
     7000, 10000, "fully_furnished", "immediate", "veg", "two", "Chandrasekharpur", "female",
     "Loves music and early morning walks. Looking for a calm, friendly flatmate."),
    ("meera_das", "Meera Das", "female", 3, "IT", "meera",
     9000, 14000, "semi_furnished", "within_month", "non_veg", "solo", "Patia", "female",
     "Studies late, cooks on weekends. Prefers a clean and quiet home."),
    ("zara_khan", "Zara Khan", "female", 4, "CSE", "zara",
     10000, 15000, "fully_furnished", "flexible", "no_preference", "two", "Nayapalli", "any",
     "Final year and placement-focused. Easygoing and open to any food habits."),
    ("kabir_singh", "Kabir Singh", "male", 2, "Mechanical", "kabir",
     6000, 9000, "unfurnished", "immediate", "non_veg", "three_plus", "KIIT Square", "male",
     "Sociable, plays guitar, fine with a bigger group and a budget place."),
    ("aisha_noor", "Aisha Noor", "female", 3, "Biotech", "aisha",
     8000, 11000, "semi_furnished", "within_month", "veg", "solo", "Chandrasekharpur", "female",
     "Lab-heavy schedule, values peace and a tidy kitchen."),
    ("tara_nair", "Tara Nair", "female", 1, "CSE", "tara",
     7000, 10000, "semi_furnished", "flexible", "veg", "two", "KIIT Square", "any",
     "First year, new to Bhubaneswar and keen to find a friendly flatmate."),
    ("arjun_mehta", "Arjun Mehta", "male", 4, "EEE", "arjun",
     12000, 18000, "fully_furnished", "immediate", "non_veg", "solo", "Nayapalli", "any",
     "Prefers a fully furnished place close to the main road. Keeps to himself."),
    ("vikram_patel", "Vikram Patel", "male", 3, "Civil", "kabir",
     5000, 8000, "unfurnished", "flexible", "no_preference", "three_plus", "Patia", "male",
     "Budget-conscious and flexible. Happy to share a room with friends."),
    ("sneha_roy", "Sneha Roy", "female", 2, "IT", "meera",
     8000, 12000, "semi_furnished", "within_month", "veg", "two", "Patia", "female",
     "Neat, early to bed, loves baking on Sundays."),
    ("dev_malhotra", "Dev Malhotra", "male", 3, "CSE", "rohan",
     9000, 12000, "semi_furnished", "within_month", "non_veg", "two", "Chandrasekharpur", "any",
     "Gym in the morning, projects at night. Easy to live with."),
    ("isha_gupta", "Isha Gupta", "female", 4, "ECE", "zara",
     10000, 14000, "fully_furnished", "immediate", "veg", "solo", "Nayapalli", "female",
     "Final year, wants a quiet, studious home."),
    ("neel_bose", "Neel Bose", "male", 1, "CSE", "arjun",
     6000, 9000, "semi_furnished", "flexible", "veg", "two", "KIIT Square", "any",
     "First year gamer and coder. Open to sharing with anyone considerate."),
    ("pooja_iyer", "Pooja Iyer", "female", 3, "Biotech", "anika",
     7000, 11000, "semi_furnished", "within_month", "no_preference", "two", "Patia", "any",
     "Friendly and organised. Likes cooking together and movie nights."),
    ("sam_verma", "Sam Verma", "male", 2, "Mechanical", "kabir",
     8000, 12000, "semi_furnished", "flexible", "no_preference", "two", "Chandrasekharpur", "any",
     "Relaxed and respectful of space. Easy to share with."),
]


def roll_for(n: int) -> str:
    return str(DEMO_ROLL_BASE + n)


def email_for(n: int) -> str:
    return f"{roll_for(n)}@kiit.ac.in"


def delete_old_demo_accounts() -> None:
    print("Removing earlier demo accounts...")
    usernames = [s[0] for s in STUDENTS]
    user_ids = set()
    old_rolls = set()

    # 1) any profile that uses one of the demo usernames (covers every earlier seed style)
    rows = sb.table("student_profiles").select(
        "user_id, roll_number, username"
    ).in_("username", usernames).execute().data
    for r in rows:
        user_ids.add(r["user_id"])
        old_rolls.add(r["roll_number"])
        print(f"  will remove {r['username']} ({r['roll_number']})")

    # 2) old-style logins whose email starts with "demo"
    page = 1
    while True:
        res = sb.auth.admin.list_users(page=page, per_page=200)
        users = res if isinstance(res, list) else getattr(res, "users", [])
        if not users:
            break
        for u in users:
            email = (u.email or "").lower()
            if email.startswith("demo") and email.endswith("@kiit.ac.in"):
                user_ids.add(u.id)
        if len(users) < 200:
            break
        page += 1

    for uid in user_ids:
        sb.auth.admin.delete_user(uid)
    if old_rolls:
        sb.table("verified_ids").delete().in_(
            "roll_number", list(old_rolls)).execute()
    print(f"  removed {len(user_ids)} old demo account(s)")


def main() -> None:
    delete_old_demo_accounts()

    profile_ids = {}
    verified = []
    for n, s in enumerate(STUDENTS, start=1):
        (username, full_name, gender, year, branch, avatar,
         bmin, bmax, furnishing, move_in, food, group, locality, pref_gender, bio) = s
        email = email_for(n)
        roll = roll_for(n)

        created = sb.auth.admin.create_user({
            "email": email,
            "password": DEMO_PASSWORD,
            "email_confirm": True,
            "user_metadata": {"username": username, "gender": gender},
        })
        user_id = created.user.id

        prof = sb.table("student_profiles").insert({
            "user_id": user_id,
            "roll_number": roll,
            "username": username,
            "full_name": full_name,
            "year_of_study": year,
            "branch": branch,
            "gender": gender,
            "bio_raw": bio,
            "avatar_seed": avatar,
        }).execute()
        profile_id = prof.data[0]["id"]
        profile_ids[username] = profile_id

        sb.table("preferences").insert({
            "profile_id": profile_id,
            "budget_min": bmin,
            "budget_max": bmax,
            "furnishing": furnishing,
            "move_in_timeline": move_in,
            "food_preference": food,
            "group_size": group,
            "preferred_locality": locality,
            "preferred_roommate_gender": pref_gender,
        }).execute()

        verified.append({"roll_number": roll})
        print(f"  created {email}  ->  {full_name}")

    # Demo profiles show the Verified badge (set by this script, not by an ID upload)
    sb.table("verified_ids").upsert(
        verified, on_conflict="roll_number").execute()
    print(f"Marked {len(verified)} demo profiles as verified")

    # Seeded moment: Rohan already liked Aarav. Log in as Aarav and like Rohan back.
    sb.table("likes").insert({
        "liker_profile_id": profile_ids["rohan_rai"],
        "liked_profile_id": profile_ids["aarav_sharma"],
    }).execute()
    print("Seeded like: Rohan Rai -> Aarav Sharma")

    print(
        f"\nDone. Log in as {email_for(1)} (Aarav Sharma) with your DEMO_PASSWORD.")


if __name__ == "__main__":
    main()
