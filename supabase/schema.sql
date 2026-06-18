-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- PUPPY PROFILES
create table puppies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  breed text not null default 'Golden Retriever',
  date_of_birth date not null,
  sex text check (sex in ('male', 'female')),
  colour text,
  fur_type text[],
  microchip_number text,
  legal_owner text,
  photo_url text,
  created_at timestamptz default now()
);

-- USER ↔ PUPPY LINK (shared household)
create table puppy_members (
  id uuid primary key default uuid_generate_v4(),
  puppy_id uuid references puppies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (puppy_id, user_id)
);

-- VACCINATIONS
create table vaccinations (
  id uuid primary key default uuid_generate_v4(),
  puppy_id uuid references puppies(id) on delete cascade,
  vaccine_name text not null,
  date_given date not null,
  next_due_date date,
  batch_number text,
  vet_clinic text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- WEIGHT LOG
create table weight_entries (
  id uuid primary key default uuid_generate_v4(),
  puppy_id uuid references puppies(id) on delete cascade,
  date date not null,
  weight_kg decimal(5,2) not null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- VET VISITS
create table vet_visits (
  id uuid primary key default uuid_generate_v4(),
  puppy_id uuid references puppies(id) on delete cascade,
  date date not null,
  vet_clinic text,
  reason text not null,
  outcome text,
  next_appointment_date date,
  next_appointment_reason text,
  cost decimal(8,2),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- FOOD LOG
create table food_entries (
  id uuid primary key default uuid_generate_v4(),
  puppy_id uuid references puppies(id) on delete cascade,
  brand text not null,
  product_name text not null,
  food_type text check (food_type in ('dry', 'wet', 'raw', 'mixed')),
  daily_amount_g decimal(6,1),
  meals_per_day integer,
  start_date date not null,
  end_date date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- MEDICATIONS & DEWORMINGS
create table medications (
  id uuid primary key default uuid_generate_v4(),
  puppy_id uuid references puppies(id) on delete cascade,
  name text not null,
  medication_type text check (medication_type in ('deworming', 'flea_tick', 'antibiotic', 'other')),
  dosage text,
  frequency text,
  start_date date not null,
  end_date date,
  prescribed_by text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- MILESTONES
create table milestones (
  id uuid primary key default uuid_generate_v4(),
  puppy_id uuid references puppies(id) on delete cascade,
  title text not null,
  date date not null,
  notes text,
  photo_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- DOCUMENTS
create table documents (
  id uuid primary key default uuid_generate_v4(),
  puppy_id uuid references puppies(id) on delete cascade,
  title text not null,
  category text check (category in ('insurance', 'certificates', 'vet_records', 'other')),
  file_path text not null,
  file_name text not null,
  file_type text not null,
  file_size_bytes integer,
  document_date date,
  notes text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table puppies enable row level security;
alter table puppy_members enable row level security;
alter table vaccinations enable row level security;
alter table weight_entries enable row level security;
alter table vet_visits enable row level security;
alter table food_entries enable row level security;
alter table medications enable row level security;
alter table milestones enable row level security;
alter table documents enable row level security;

-- Helper: is the current user a member of this puppy?
create or replace function is_puppy_member(p_puppy_id uuid)
returns boolean as $$
  select exists (
    select 1 from puppy_members
    where puppy_id = p_puppy_id
    and user_id = auth.uid()
  );
$$ language sql security definer;

-- ============================================================
-- POLICIES: puppies
-- ============================================================
create policy "Members can view puppy" on puppies
  for select using (is_puppy_member(id));

create policy "Members can update puppy" on puppies
  for update using (is_puppy_member(id));

create policy "Authenticated users can create puppy" on puppies
  for insert with check (auth.uid() is not null);

-- ============================================================
-- POLICIES: puppy_members
-- ============================================================
create policy "Users see own memberships" on puppy_members
  for select using (user_id = auth.uid());

create policy "Authenticated users can join puppy" on puppy_members
  for insert with check (user_id = auth.uid());

-- ============================================================
-- POLICIES: vaccinations
-- ============================================================
create policy "Members can view vaccinations" on vaccinations
  for select using (is_puppy_member(puppy_id));

create policy "Members can insert vaccinations" on vaccinations
  for insert with check (is_puppy_member(puppy_id));

create policy "Members can update vaccinations" on vaccinations
  for update using (is_puppy_member(puppy_id));

create policy "Members can delete vaccinations" on vaccinations
  for delete using (is_puppy_member(puppy_id));

-- ============================================================
-- POLICIES: weight_entries
-- ============================================================
create policy "Members can view weight entries" on weight_entries
  for select using (is_puppy_member(puppy_id));

create policy "Members can insert weight entries" on weight_entries
  for insert with check (is_puppy_member(puppy_id));

create policy "Members can update weight entries" on weight_entries
  for update using (is_puppy_member(puppy_id));

create policy "Members can delete weight entries" on weight_entries
  for delete using (is_puppy_member(puppy_id));

-- ============================================================
-- POLICIES: vet_visits
-- ============================================================
create policy "Members can view vet visits" on vet_visits
  for select using (is_puppy_member(puppy_id));

create policy "Members can insert vet visits" on vet_visits
  for insert with check (is_puppy_member(puppy_id));

create policy "Members can update vet visits" on vet_visits
  for update using (is_puppy_member(puppy_id));

create policy "Members can delete vet visits" on vet_visits
  for delete using (is_puppy_member(puppy_id));

-- ============================================================
-- POLICIES: food_entries
-- ============================================================
create policy "Members can view food entries" on food_entries
  for select using (is_puppy_member(puppy_id));

create policy "Members can insert food entries" on food_entries
  for insert with check (is_puppy_member(puppy_id));

create policy "Members can update food entries" on food_entries
  for update using (is_puppy_member(puppy_id));

create policy "Members can delete food entries" on food_entries
  for delete using (is_puppy_member(puppy_id));

-- ============================================================
-- POLICIES: medications
-- ============================================================
create policy "Members can view medications" on medications
  for select using (is_puppy_member(puppy_id));

create policy "Members can insert medications" on medications
  for insert with check (is_puppy_member(puppy_id));

create policy "Members can update medications" on medications
  for update using (is_puppy_member(puppy_id));

create policy "Members can delete medications" on medications
  for delete using (is_puppy_member(puppy_id));

-- ============================================================
-- POLICIES: milestones
-- ============================================================
create policy "Members can view milestones" on milestones
  for select using (is_puppy_member(puppy_id));

create policy "Members can insert milestones" on milestones
  for insert with check (is_puppy_member(puppy_id));

create policy "Members can update milestones" on milestones
  for update using (is_puppy_member(puppy_id));

create policy "Members can delete milestones" on milestones
  for delete using (is_puppy_member(puppy_id));

-- ============================================================
-- POLICIES: documents
-- ============================================================
create policy "Members can view documents" on documents
  for select using (is_puppy_member(puppy_id));

create policy "Members can insert documents" on documents
  for insert with check (is_puppy_member(puppy_id));

create policy "Members can update documents" on documents
  for update using (is_puppy_member(puppy_id));

create policy "Members can delete documents" on documents
  for delete using (is_puppy_member(puppy_id));
