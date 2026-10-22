-- Run ONCE on a brand-new Supabase project only.
-- Do NOT run on the existing project: the tables already exist.
-- pg vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- STUDENT_PROFILES: bridge table to Supabase auth.users + public identity/presentation
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    roll_number TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    year_of_study INTEGER NOT NULL,
    branch TEXT NOT NULL,
    gender gender_type NOT NULL,

    bio_raw TEXT,
    bio_generated TEXT,
    avatar_seed TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- PREFERENCES
CREATE TYPE furnishing_type AS ENUM ('unfurnished', 'semi_furnished', 'fully_furnished');
CREATE TYPE move_in_type AS ENUM ('immediate', 'within_month', 'flexible');
CREATE TYPE food_type AS ENUM ('veg', 'non_veg', 'no_preference');
CREATE TYPE group_size_type AS ENUM ('solo', 'two', 'three_plus');
CREATE TYPE preferred_gender_type AS ENUM ('male', 'female', 'any');

CREATE TABLE preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    budget_min INTEGER NOT NULL,
    budget_max INTEGER NOT NULL,
    furnishing furnishing_type NOT NULL,
    move_in_timeline move_in_type NOT NULL,
    food_preference food_type NOT NULL,
    group_size group_size_type NOT NULL,
    preferred_locality TEXT,
    preferred_roommate_gender preferred_gender_type NOT NULL DEFAULT 'any'
);

-- BIO EMBEDDINGS
CREATE TABLE bio_embeddings (
    profile_id UUID PRIMARY KEY REFERENCES student_profiles(id) ON DELETE CASCADE,
    embedding vector(384) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX ON bio_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- LISTINGS
CREATE TYPE listing_type AS ENUM ('has_place', 'needs_place');

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    listing_type listing_type NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- MATCHES
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_a_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    profile_b_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    match_score FLOAT NOT NULL,
    match_reasons JSONB NOT NULL,
    ai_explanation TEXT,
    computed_at TIMESTAMP NOT NULL DEFAULT now()
);

-- LIKES
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liker_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    liked_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (liker_profile_id, liked_profile_id)
);

-- REPORTS
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed');

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    reported_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    reason TEXT NOT NULL,
    status report_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- MESSAGES: deferred until core matching/browsing flow is working

-- Grants (needed for any NEW project built from this file)
grant select, insert, update, delete on public.student_profiles to authenticated;
grant select, insert, update on public.preferences to authenticated;
grant select, insert, update on public.listings to authenticated;
grant select, insert, delete on public.likes to authenticated;
grant select, insert on public.reports to authenticated;

-- Backend only (no access for the browser)
grant select, insert, update, delete on
  public.student_profiles, public.preferences, public.listings,
  public.likes, public.reports, public.matches, public.bio_embeddings
to service_role;