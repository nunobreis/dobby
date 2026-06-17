# Dobby — Claude Code Context

## What this project is

Dobby is a personal pet health tracker for a Golden Retriever named Dobby, owned by Nuno (nunobreis@gmail.com). It is a Next.js 14.2 App Router web app deployed on Vercel. It tracks vaccinations, weight, vet visits, food & diet, medications, milestones, and documents. It supports two users per household (owner + partner) via a shared `puppy_members` table.

The app is a PWA styled as a mobile-first app but also has a desktop sidebar layout.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database + Auth | Supabase (Postgres + Auth) |
| i18n | next-intl 4.x (cookie-based, no URL prefix) |
| Icons | lucide-react |
| Charts | recharts |
| Toasts | sonner |
| Font | DM Sans |
| Package manager | **pnpm** (never use npm) |
| Deployment | Vercel |

---

## Running locally

```bash
pnpm dev      # start dev server → http://localhost:3000
pnpm build    # production build
npx tsc --noEmit  # type check
```

> **Note:** Supabase Auth redirect URLs are configured to the Vercel deployment URL, so auth does not work on localhost. Test features by pushing to Vercel.

---

## Project structure

```
app/
  layout.tsx              # Root layout — NextIntlClientProvider, Sidebar, Toaster
  page.tsx                # Redirects → /dashboard
  dashboard/
    page.tsx              # Main dashboard (server component)
    MilestoneCards.tsx    # Client component — milestone grid + modal
  vaccinations/           # page.tsx (list) + new/page.tsx (form)
  weight/                 # page.tsx (list + chart) + new/page.tsx
  vet-visits/             # page.tsx + new/page.tsx
  food/                   # page.tsx + new/page.tsx
  medications/            # page.tsx + new/page.tsx
  milestones/             # page.tsx + new/page.tsx
  documents/              # page.tsx + new/page.tsx
  profile/
    page.tsx              # Server shell — fetches data, renders ProfileClient
    ProfileClient.tsx     # Client component — editable profile form
    setup/page.tsx        # First-run profile setup (client component)
    actions.ts            # Server action — invite partner
  more/page.tsx           # "More" menu: Dobby section + App section (Settings)
  settings/
    page.tsx              # Server component — passes locale to SettingsClient
    SettingsClient.tsx    # Client component — language radio picker
  login/page.tsx          # Auth page (client component)

components/
  BottomNav.tsx           # Mobile floating nav bar (lg:hidden)
  SidebarNav.tsx          # Desktop sidebar nav links
  Sidebar.tsx             # Desktop sidebar shell (hidden on mobile)
  VaccinationBadge.tsx    # Async server component — coloured status badge
  BackButton.tsx          # Simple back navigation button
  EmptyState.tsx          # Reusable empty state with icon + CTA
  ErrorState.tsx          # Reusable error state
  WeightChart.tsx         # Recharts weight chart (client component)
  ImageUpload.tsx         # Image picker with HEIC support + compression
  DocumentUpload.tsx      # File picker for documents
  LoadingSpinner.tsx      # Simple spinner

lib/
  types.ts                # All TypeScript interfaces (Puppy, Vaccination, etc.)
  utils.ts                # formatDate, calculateAge, formatWeight, getVaccinationStatus
  supabase/
    client.ts             # createClient() for client components
    server.ts             # createClient() for server components / actions
  actions/
    settings.ts           # setLanguage server action (saves to Supabase + cookie)

i18n/
  request.ts              # next-intl getRequestConfig — reads NEXT_LOCALE cookie

messages/
  en.json                 # English translations (280 keys across 14 namespaces)
  pt.json                 # Portuguese (Portugal) translations (same 280 keys)

middleware.ts             # Auth guard + locale cookie sync from Supabase metadata
supabase/
  schema.sql              # Full DB schema (reference — not auto-applied)
  seed.sql                # Seed data
```

---

## Database schema (Supabase)

All tables are in the `public` schema. Auth users are in `auth.users`.

```
puppies
  id, name, breed, date_of_birth, sex, colour, microchip_number, legal_owner, photo_url, created_at

puppy_members         -- links auth.users to puppies (max 2 per puppy)
  id, puppy_id, user_id, joined_at

vaccinations
  id, puppy_id, vaccine_name, date_given, next_due_date, batch_number, vet_clinic, notes, created_by, created_at

weight_entries
  id, puppy_id, date, weight_kg, notes, created_by, created_at

vet_visits
  id, puppy_id, date, vet_clinic, reason, outcome, next_appointment_date, next_appointment_reason, cost, notes, created_by, created_at

food_entries
  id, puppy_id, brand, product_name, food_type (dry/wet/raw/mixed), daily_amount_g, meals_per_day, start_date, end_date, notes, created_by, created_at

medications
  id, puppy_id, name, medication_type (deworming/flea_tick/antibiotic/other), dosage, frequency, start_date, end_date, prescribed_by, notes, created_by, created_at

milestones
  id, puppy_id, title, date, notes, photo_url, created_by, created_at

documents
  id, puppy_id, title, category (insurance/certificates/vet_records/other), file_path, file_name, file_type, file_size_bytes, document_date, notes, uploaded_by, created_at
```

Photos and documents are stored in the **`dobby-photos`** Supabase Storage bucket (public).

Language preference is stored in `auth.users.raw_user_meta_data.language` (value: `"en"` or `"pt"`).

> When adding a new column to an existing table, provide the SQL to run in the Supabase Dashboard → SQL Editor, e.g.:
> `alter table puppies add column if not exists new_field text;`
> Also update `supabase/schema.sql` and `lib/types.ts`.

---

## i18n — how translations work

- Locale is stored in the `NEXT_LOCALE` cookie (values: `"en"` or `"pt"`).
- `i18n/request.ts` reads this cookie on every server render to load the right messages file.
- `middleware.ts` syncs the cookie from Supabase `user_metadata.language` on every request (cross-device sync).
- Changing language: `SettingsClient` calls the `setLanguage` server action → updates Supabase metadata + cookie → `revalidatePath('/', 'layout')`.

**In server components:**
```ts
import { getTranslations } from "next-intl/server";
const t = await getTranslations("namespace");
```

**In client components:**
```ts
import { useTranslations } from "next-intl";
const t = useTranslations("namespace");
```

**Translation namespaces:** `nav`, `dashboard`, `vaccinations`, `weight`, `vetVisits`, `food`, `medications`, `milestones`, `documents`, `profile` (with nested `setup`), `more`, `settings`, `login`, `vaccinationBadge`.

When adding new visible strings: add the key to **both** `messages/en.json` and `messages/pt.json` under the appropriate namespace.

---

## Design system (Tailwind)

**Custom colours:**
- `bg-background` — `#EFEFEF` (page background)
- `text-accent` / `bg-accent` — `#8B5CF6` (purple, primary brand)
- `text-primary` — `#1A1A1A`
- `text-secondary` — `#7A7A7A`
- `bg-lavender` — `#D5C9F0` (icon backgrounds)
- `bg-blush-pink`, `bg-sage-green`, `bg-soft-yellow` — status colours

**Custom border radii:** `rounded-card` (20px), `rounded-input` (12px), `rounded-badge` (20px), `rounded-pill` (28px)

**Font:** DM Sans via `var(--font-dm-sans)`

---

## Layout — mobile vs desktop

- **Mobile:** `BottomNav` (fixed floating pill, `lg:hidden`, `bottom-3`)
- **Desktop:** `Sidebar` + `SidebarNav` (left rail, hidden on mobile via `hidden lg:flex`)
- Page content uses `pb-32 lg:pb-10` to clear the bottom nav on mobile.
- `/settings` is included in `morePaths` in both nav components so the More tab stays active.

---

## Auth flow (middleware)

1. `/login` — if already logged in → redirect to `/dashboard` (or `/profile/setup` if no membership)
2. All other routes — if not logged in → redirect to `/login`
3. All routes except `/profile/setup` — if no `puppy_members` row → redirect to `/profile/setup`

---

## Key conventions

- **Server components by default.** Only add `"use client"` when you need interactivity (useState, event handlers, useTranslations for client).
- **Supabase in server components:** `import { createClient } from "@/lib/supabase/server"` (async).
- **Supabase in client components:** `import { createClient } from "@/lib/supabase/client"` (sync).
- **Server actions** live in `lib/actions/` or co-located `actions.ts` files, always `"use server"` at the top.
- **Types** for all DB rows are in `lib/types.ts`. Keep this in sync with the schema.
- **No comments** unless the why is non-obvious. No console.logs left in.
- After any code change: run `npx tsc --noEmit` to verify no type errors before committing.
- Commit messages use `feat:`, `fix:`, `chore:` prefixes.
- Always `git push` after committing so Vercel deploys automatically.
