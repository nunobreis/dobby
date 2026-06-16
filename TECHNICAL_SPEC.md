# Dobby's Health Tracker — Technical Specification

## Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 (App Router) | Full-stack, great DX, Vercel-native |
| Language | TypeScript | Type safety across DB ↔ UI |
| Auth + DB | Supabase | Auth, Postgres, RLS, Storage (photos) |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, mobile-first |
| Font | DM Sans (Google Fonts) | Used across all type styles |
| Charts | Recharts | Lightweight, good for weight line chart |
| Deployment | Vercel | Zero-config, free tier sufficient |
| Package manager | pnpm | Faster installs |

---

## Project Structure

```
/app
  layout.tsx                  # Root layout with auth guard
  /login
    page.tsx
  /dashboard
    page.tsx
  /vaccinations
    page.tsx
    /new/page.tsx
  /weight
    page.tsx
    /new/page.tsx
  /vet-visits
    page.tsx
    /new/page.tsx
  /food
    page.tsx
    /new/page.tsx
  /medications
    page.tsx
    /new/page.tsx
  /milestones
    page.tsx
    /new/page.tsx
  /documents
    page.tsx
    /new/page.tsx
  /profile
    page.tsx                  # Puppy profile setup / edit

/components
  /ui                         # shadcn/ui primitives
  Navbar.tsx
  BottomNav.tsx               # Mobile bottom navigation
  PuppyCard.tsx               # Dashboard summary card
  StatCard.tsx                # Single-metric card
  VaccinationBadge.tsx        # Due / Overdue / OK status badge
  WeightChart.tsx             # Recharts line chart
  Timeline.tsx                # Milestones timeline
  ImageUpload.tsx             # Mobile-friendly photo input (camera + library)
  DocumentUpload.tsx          # Mobile-friendly file input (PDF + images via Files app)
  DocumentViewer.tsx          # View/download button with signed URL fetch
  EmptyState.tsx              # Empty section prompt
  AddButton.tsx               # Floating + button

/lib
  supabase/
    client.ts                 # Browser Supabase client
    server.ts                 # Server Supabase client (RSC / API routes)
    middleware.ts             # Auth redirect middleware
  types.ts                    # All DB types (generated from schema)
  utils.ts                    # Date helpers, formatters

/supabase
  schema.sql                  # Full schema + RLS policies
  seed.sql                    # Optional: sample data for dev

.env.local.example            # Required env vars
README.md                     # Setup instructions
```

---

## Database Schema

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PUPPY PROFILES
create table puppies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  breed text not null default 'Golden Retriever',
  date_of_birth date not null,
  sex text check (sex in ('male', 'female')),
  colour text,
  microchip_number text,
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
  file_path text not null,           -- Supabase Storage path (used to generate signed URL)
  file_name text not null,           -- Original filename for display
  file_type text not null,           -- MIME type: 'application/pdf' or 'image/*'
  file_size_bytes integer,
  document_date date,                -- Optional: document date or expiry
  notes text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);
```

---

## Row Level Security (RLS)

The core pattern: a user can only access data for puppies they are a member of, via the `puppy_members` join table.

```sql
-- Enable RLS on all tables
alter table puppies enable row level security;
alter table puppy_members enable row level security;
alter table vaccinations enable row level security;
alter table weight_entries enable row level security;
alter table vet_visits enable row level security;
alter table food_entries enable row level security;
alter table medications enable row level security;
alter table milestones enable row level security;
alter table documents enable row level security;

-- Helper function: is the current user a member of this puppy?
create or replace function is_puppy_member(p_puppy_id uuid)
returns boolean as $$
  select exists (
    select 1 from puppy_members
    where puppy_id = p_puppy_id
    and user_id = auth.uid()
  );
$$ language sql security definer;

-- POLICIES (apply same pattern to each table)

-- puppies: can see/edit if member
create policy "Members can view puppy" on puppies
  for select using (is_puppy_member(id));

create policy "Members can update puppy" on puppies
  for update using (is_puppy_member(id));

-- puppy_members: can see own membership
create policy "Users see own memberships" on puppy_members
  for select using (user_id = auth.uid());

-- Insert policy for first-time puppy creation
create policy "Authenticated users can create puppy" on puppies
  for insert with check (auth.uid() is not null);

create policy "Authenticated users can join puppy" on puppy_members
  for insert with check (user_id = auth.uid());

-- All other tables: select / insert / update / delete if puppy member
-- (Repeat for vaccinations, weight_entries, vet_visits, food_entries, medications, milestones)
create policy "Members can view vaccinations" on vaccinations
  for select using (is_puppy_member(puppy_id));
create policy "Members can insert vaccinations" on vaccinations
  for insert with check (is_puppy_member(puppy_id));
create policy "Members can update vaccinations" on vaccinations
  for update using (is_puppy_member(puppy_id));
create policy "Members can delete vaccinations" on vaccinations
  for delete using (is_puppy_member(puppy_id));

-- (Repeat pattern above for weight_entries, vet_visits, food_entries, medications, milestones, documents)
```

### Storage bucket RLS (Supabase Storage policies)

```sql
-- dobby-photos bucket: public read, authenticated write scoped to puppy members
-- dobby-documents bucket: NO public access — always use signed URLs
-- Signed URLs generated server-side via supabase.storage.from('dobby-documents').createSignedUrl(path, 3600)
-- Signed URLs expire after 1 hour; regenerate on each document view
```

---

## Auth Flow

1. **Sign up** — `/login` → Supabase creates user → redirect to `/profile/setup`
2. **Profile setup** — user fills in puppy details → creates `puppies` row + `puppy_members` row
3. **Invite partner** — from profile page, enter partner's email → Supabase sends invite email
4. **Partner accepts** — clicks link → lands on `/login` → account created → auto-linked to same `puppy_id` via invite metadata
5. **Returning users** — session cookie persists, middleware redirects `/` → `/dashboard`

### Middleware (`middleware.ts`)

```typescript
// Redirect unauthenticated users to /login
// Redirect authenticated users without a puppy to /profile/setup
// Allow all authenticated users with a puppy through
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # server-side only
```

---

## Design System Tokens (Tailwind theme extension)

Configure in `tailwind.config.ts`:

```ts
theme: {
  extend: {
    fontFamily: {
      sans: ['DM Sans', 'sans-serif'],
    },
    colors: {
      background: '#EFEFEF',
      accent: '#8B5CF6',
      charcoal: '#1A1A1A',
      'text-primary': '#1A1A1A',
      'text-secondary': '#7A7A7A',
      'blush-pink': '#F2C4CE',
      lavender: '#D5C9F0',
      'sage-green': '#C5DDD1',
      'warm-peach': '#F5DEC8',
      'sky-blue': '#C2DCF0',
      'soft-yellow': '#F5EAC2',
    },
    borderRadius: {
      card: '20px',
      input: '12px',
      badge: '20px',
      pill: '28px',
    },
  },
}
```

**Typography scale:**

| Class pattern | Size | Weight | Usage |
|--------------|------|--------|-------|
| hero | 36px / `text-4xl` | 700 | Puppy name, app name |
| page-title | 32px / `text-3xl` | 700 | Section headings |
| section-title | 20px / `text-xl` | 600 | Card group labels |
| card-value | 28px / `text-3xl` | 700 | Metric display values |
| card-label | 11px / `text-[11px]` | 700 | Uppercase metric labels |
| body | 14px / `text-sm` | 400 | Content text |
| caption | 13px / `text-[13px]` | 400 | Dates, secondary info |

**Component specs:**
- **Cards**: `bg-white rounded-[20px] p-4` — flat, no shadow
- **Inputs**: `bg-[#EBEBEB] rounded-[12px] h-[52px] px-4`
- **Primary button**: `bg-accent text-white rounded-[28px] h-[56px] font-semibold`
- **FAB**: `bg-accent rounded-[28px] w-[56px] h-[56px]` — absolute positioned
- **Bottom nav**: `bg-white/70 backdrop-blur-xl rounded-[28px] h-[56px]` — absolute, 16px from screen edges
- **Badge (up to date)**: `bg-[#C5DDD1] text-[#2D6A4F] rounded-[20px]`
- **Badge (due soon)**: `bg-[#F5EAC2] text-[#B7791F] rounded-[20px]`
- **Badge (overdue)**: `bg-[#F2C4CE] text-[#9B1C1C] rounded-[20px]`

---

## Key Implementation Notes

- **Server Components** for all data fetching (use `supabase/server.ts`)
- **Client Components** only for interactive forms and charts
- **Optimistic updates** on form submissions for snappy mobile feel
- **`created_by`** field on each record — used to show "Added by [name]" in the UI
- **Photo uploads (milestones + profile):**
  - Use `<input type="file" accept="image/*">` — on mobile Safari this triggers the iOS share sheet (camera or photo library)
  - No drag-and-drop UI — it's redundant on mobile and adds complexity
  - Compress images client-side before upload using the `browser-image-compression` npm package (target max 1MB, max dimension 1920px)
  - Upload to Supabase Storage `dobby-photos` bucket (public); store the public URL in `photo_url`
- **Document uploads:**
  - Use `<input type="file" accept=".pdf,image/*">` — triggers iOS share sheet with camera, photo library, and Files app options
  - Store files in Supabase Storage `dobby-documents` bucket (private, no public access)
  - Store the storage `file_path` in the DB, not a URL — generate a signed URL server-side at view time
  - Signed URLs via `supabase.storage.from('dobby-documents').createSignedUrl(path, 3600)` — expire after 1 hour
  - PDFs open in a new browser tab; images display in a simple lightbox modal
- **Date handling** — store as `date` in DB (no timezone issues), display with `date-fns`
- **Weight chart** — Recharts `LineChart` with dots, X axis = date, Y axis = kg

---

## Deployment Checklist

- [ ] Create Supabase project
- [ ] Run `schema.sql` in Supabase SQL editor
- [ ] Enable RLS policies
- [ ] Create `dobby-photos` storage bucket (public)
- [ ] Create `dobby-documents` storage bucket (private — disable public access)
- [ ] Push repo to GitHub
- [ ] Connect GitHub repo to Vercel
- [ ] Add environment variables in Vercel dashboard
- [ ] Deploy
