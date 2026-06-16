# Dobby's Health Tracker — Implementation Plan

Each commit represents a working, testable increment. Follow them in order. All commits should be made to `main` during solo vibe coding; switch to feature branches if you prefer a cleaner history.

---

## Phase 1 — Project Foundation

### Commit 1: `chore: scaffold Next.js project`
- `npx create-next-app@latest dobby-health-tracker` with TypeScript, Tailwind, App Router, pnpm
- Install dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `shadcn/ui`, `date-fns`, `recharts`, `lucide-react`
- Delete boilerplate (`page.tsx` default content, `globals.css` defaults)
- Add `.env.local.example` with the three Supabase env var keys
- Add `.env.local` to `.gitignore`

**Test:** `pnpm dev` runs without errors. Blank page loads at `localhost:3000`.

---

### Commit 2: `chore: add Supabase schema and RLS`
- Write `supabase/schema.sql` with all tables: `puppies`, `puppy_members`, `vaccinations`, `weight_entries`, `vet_visits`, `food_entries`, `medications`, `milestones`
- Include all RLS policies and the `is_puppy_member()` helper function
- Write `supabase/seed.sql` with a sample puppy + one row per table for dev use
- **Manual step:** run `schema.sql` in Supabase SQL Editor

**Test:** Tables visible in Supabase dashboard. RLS enabled on all tables.

---

### Commit 3: `chore: configure Supabase clients and middleware`
- `lib/supabase/client.ts` — browser client using `createBrowserClient`
- `lib/supabase/server.ts` — server client using `createServerClient` (for RSC + API routes)
- `middleware.ts` — auth redirect logic:
  - Unauthenticated → `/login`
  - Authenticated, no puppy → `/profile/setup`
  - Authenticated, has puppy → pass through
- `lib/types.ts` — TypeScript types for all DB tables
- `lib/utils.ts` — helper functions: `formatDate`, `calculateAge`, `formatWeight`

**Test:** Visiting `localhost:3000` redirects to `/login`.

---

## Phase 2 — Auth & Puppy Setup

### Commit 4: `feat: login and signup page`
- `/app/login/page.tsx` — client component
- Email + password fields, toggle between Sign In / Sign Up modes
- Supabase Auth calls: `signInWithPassword`, `signUp`
- Error handling with inline messages
- Redirect to `/dashboard` on success (or `/profile/setup` if new user)
- Styling: centred card on `#EFEFEF` background; app name (DM Sans 28px 700) + paw-print icon; `#8B5CF6` sign-in button (28px radius, 56px height); inputs `#EBEBEB` fill, 12px radius

**Test:** Can sign up with a new email. Can sign in. Wrong password shows error. Redirects correctly.

---

### Commit 5: `feat: puppy profile setup`
- `/app/profile/setup/page.tsx` — shown to new users with no puppy yet
- Form fields: name (pre-filled "Dobby"), breed (pre-filled "Golden Retriever"), date of birth, sex, colour, microchip number
- On submit: inserts into `puppies` + `puppy_members`, redirects to `/dashboard`
- `/app/profile/page.tsx` — edit profile + "Invite partner" button (triggers Supabase `inviteUserByEmail`)
- Photo upload to Supabase Storage (`puppy-photos` bucket)

**Test:** New user completes setup → lands on dashboard. Invited partner receives email, signs up, sees same puppy data.

---

## Phase 3 — Dashboard

### Commit 6: `feat: dashboard page`
- `/app/dashboard/page.tsx` — server component, fetches all summary data in parallel
- `components/StatCard.tsx` — reusable card: icon + label (11px 700 uppercase) + value (28px 700) + subtext; white bg, 20px radius, flat (no shadow)
- `components/VaccinationBadge.tsx` — pill badge (20px radius): sage-green `#C5DDD1`/`#2D6A4F` = up to date, soft-yellow `#F5EAC2`/`#B7791F` = due soon, blush-pink `#F2C4CE`/`#9B1C1C` = overdue
- `components/BottomNav.tsx` — frosted glass `bg-white/70 backdrop-blur-xl`, 28px radius, 56px height, 16px from screen edges; active tab highlight `#8B5CF6`
- Dashboard layout:
  - Puppy avatar + name + age + breed
  - 2×2 stat cards: next vaccine, next vet, latest weight, current food
  - Recent milestones strip (horizontal scroll, last 3)
  - Quick-add floating button (links to most relevant `/new` page)

**Test:** Dashboard loads with all cards. Empty states show correctly when no data. Age calculates correctly from DOB.

---

## Phase 4 — Health Sections

### Commit 7: `feat: vaccinations section`
- `/app/vaccinations/page.tsx` — server component, list of vaccination records
- `/app/vaccinations/new/page.tsx` — form: vaccine name, date given, next due, batch, vet, notes
- `components/VaccinationBadge.tsx` — status logic (overdue / due soon / up to date)
- Records sorted by date descending. Next due date highlighted on each card.

**Test:** Add a vaccination. It appears in the list. Badge shows correct status. Dashboard next-vaccine card updates.

---

### Commit 8: `feat: weight section`
- `/app/weight/page.tsx` — server component
- `components/WeightChart.tsx` — Recharts `LineChart`, accent purple `#8B5CF6` line, all entries plotted
- Weight entries list below chart (date + kg, sorted ascending for chart, descending for list)
- `/app/weight/new/page.tsx` — form: date, weight in kg, notes

**Test:** Add 3+ weight entries. Chart renders with correct data points. Latest weight appears on dashboard.

---

### Commit 9: `feat: vet visits section`
- `/app/vet-visits/page.tsx` — list view, upcoming appointments highlighted at top
- `/app/vet-visits/new/page.tsx` — form: date, clinic, reason, outcome, next appointment date/reason, cost, notes
- Upcoming vs past visits visually separated

**Test:** Add a past visit and a future appointment. Both appear correctly. Dashboard next-vet card updates.

---

### Commit 10: `feat: food & diet section`
- `/app/food/page.tsx` — current food shown prominently at top, past entries as history log
- Current food = entry with no `end_date` or latest `end_date` in the future
- `/app/food/new/page.tsx` — form: brand, product name, type, daily amount, meals per day, start date, end date, notes
- When adding new food, prompt to set end date on current food

**Test:** Add current food. It appears on dashboard. Add a second food entry — first becomes history.

---

### Commit 11: `feat: medications & dewormings section`
- `/app/medications/page.tsx` — active medications at top, past medications collapsed
- Active = no `end_date` or `end_date` in the future
- `/app/medications/new/page.tsx` — form: name, type (select), dosage, frequency, start date, end date, prescribed by, notes

**Test:** Add a deworming. Add an antibiotic with an end date in the past. Active/past split works correctly.

---

### Commit 12: `feat: milestones section`
- `/app/milestones/page.tsx` — vertical timeline layout, chronological
- Each milestone: date, title, optional notes, optional photo thumbnail
- `components/ImageUpload.tsx` — wraps `<input type="file" accept="image/*">`, compresses with `browser-image-compression` before upload, uploads to Supabase Storage `dobby-photos` bucket
- No drag-and-drop — mobile-first tap-to-upload only
- `/app/milestones/new/page.tsx` — form: title, date, notes, photo upload via `ImageUpload` component
- Empty state: just the timeline line with a prompt to add the first milestone

**Test:** Add a milestone with a photo taken directly from the phone camera. Photo appears in timeline. Compression keeps file under 1MB.

---

### Commit 13: `feat: documents section`
- `/app/documents/page.tsx` — list grouped by category (Insurance, Certificates, Vet Records, Other)
- `components/DocumentUpload.tsx` — wraps `<input type="file" accept=".pdf,image/*">`, on mobile triggers iOS share sheet (camera / photo library / Files app)
- `components/DocumentViewer.tsx` — fetches a 1-hour signed URL server-side, opens PDF in new tab or shows image in lightbox modal
- `/app/documents/new/page.tsx` — form: title, category (select), file upload, date, notes
- Files stored in private `dobby-documents` Supabase Storage bucket; `file_path` saved in DB (not URL)
- Empty state: "No documents yet. Add your insurance policy or certificates."

**Test:** Upload a PDF from the Files app on iPhone. Document appears in list. Clicking view opens the PDF. Signed URL expires — refreshing the page generates a new one.

---

## Phase 5 — Polish & Deploy

### Commit 14: `feat: empty states and loading UI`
- `components/EmptyState.tsx` — reusable: paw print icon + message + CTA button
- Add to every list page when no records exist
- Add loading skeletons (`loading.tsx`) for dashboard and each section
- Ensure all forms show a loading spinner on submit

**Test:** Fresh account (no data) shows friendly empty states on all pages. Loading states appear briefly before data loads.

---

### Commit 15: `feat: error handling and form validation`
- Client-side validation on all forms (required fields, date logic, numeric ranges)
- Error boundaries on dashboard and section pages
- Toast notifications on successful saves (`sonner` or shadcn toast)
- Handle Supabase errors gracefully (network issues, RLS violations)

**Test:** Submit empty forms — validation errors appear. Save a record — success toast shows. Simulate offline — graceful error shown.

---

### Commit 16: `chore: mobile polish and responsive QA`
- Review all pages on 390px viewport (iPhone 14)
- Ensure touch targets are min 44px
- Verify photo upload triggers iOS camera/library sheet correctly
- Verify document upload triggers iOS Files app correctly
- Fix any overflow or spacing issues
- Test bottom navigation on mobile

**Test:** Full walkthrough on a real phone. All interactions feel native. Photo and document uploads work from camera, photo library, and Files app.

---

### Commit 17: `chore: deploy to Vercel`
- Push repo to GitHub
- Connect to Vercel, add environment variables
- Verify production build (`pnpm build`) has no errors
- Create both Supabase Storage buckets in production (`dobby-photos` public, `dobby-documents` private)
- Test sign up, puppy setup, and adding one record in production
- Share URL with girlfriend, test the invite flow end-to-end

**Test:** Both accounts can log in on production. All sections work. Photos upload. Documents upload and open via signed URL. Data persists across sessions.

---

## Commit Summary

| # | Commit | Phase |
|---|--------|-------|
| 1 | Scaffold project | Foundation |
| 2 | Supabase schema + RLS | Foundation |
| 3 | Supabase clients + middleware | Foundation |
| 4 | Login / signup | Auth |
| 5 | Puppy profile setup + invite | Auth |
| 6 | Dashboard | Dashboard |
| 7 | Vaccinations | Sections |
| 8 | Weight + chart | Sections |
| 9 | Vet visits | Sections |
| 10 | Food & diet | Sections |
| 11 | Medications | Sections |
| 12 | Milestones + photo upload | Sections |
| 13 | Documents + file upload | Sections |
| 14 | Empty states + loading UI | Polish |
| 15 | Error handling + validation | Polish |
| 16 | Mobile QA | Polish |
| 17 | Deploy to Vercel | Deploy |
