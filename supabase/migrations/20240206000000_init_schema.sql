-- Enable PostGIS for location data
create extension if not exists "postgis";

-- 1. Profiles Table (Extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text not null,
  full_name text,
  avatar_url text, -- Store Cloudinary/Supabase URL
  preferences jsonb default '{}'::jsonb, -- Store "Vibe" tags here
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Trips Table (The Core Entity)
create table public.trips (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) not null,
  title text not null, -- e.g., "Bali 2024"
  status text check (status in ('draft', 'confirmed', 'archived')) default 'draft',
  start_date date,
  end_date date,
  budget_currency text default 'USD',
  budget_limit numeric(10,2),
  cover_image_url text, -- From Unsplash
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Locations Table (Places within a Trip)
create table public.locations (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  name text not null, -- e.g., "Ubud Monkey Forest"
  description text,
  geo_location geography(POINT), -- PostGIS Point
  google_place_id text, -- For easier mapping/reviews later
  address text,
  arrival_time timestamptz,
  departure_time timestamptz,
  cost_estimate numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- 4. Itinerary Items (Enriched Data from AI)
create table public.itinerary_items (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  day_number int not null, -- Day 1, Day 2...
  title text not null, -- "Morning Yoga"
  activity_type text, -- 'food', 'adventure', 'relax'
  metadata jsonb default '{}'::jsonb -- Store AI prompt/reasoning here
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.locations enable row level security;

-- Profiles: Viewable by everyone (for sharing), editable only by self
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Trips: Users can only see/edit their own trips
create policy "Users can view own trips"
  on public.trips for select
  using ( auth.uid() = owner_id );

create policy "Users can insert own trips"
  on public.trips for insert
  with check ( auth.uid() = owner_id );

create policy "Users can update own trips"
  on public.trips for update
  using ( auth.uid() = owner_id );

-- Locations: Inherits access from Trip
create policy "Users can view locations of their trips"
  on public.locations for select
  using (
    exists ( select 1 from public.trips
             where public.trips.id = public.locations.trip_id
             and public.trips.owner_id = auth.uid() )
  );
