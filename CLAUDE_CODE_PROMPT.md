# Claude Code — Project Kickoff Prompt

Paste this as your first message in Claude Code to start the build.

---

## Prompt

I want to build a mobile-first web app called **Dobby's Health Tracker**. It's a private digital health booklet for a golden retriever puppy named Dobby, shared between two owners (a couple). I have a full PRD and technical spec — I'll share them with you. Please read them carefully before writing any code.

**Documents to read first:**
- `PRD.md` — product requirements
- `TECHNICAL_SPEC.md` — stack, schema, RLS, folder structure

**Stack:**
- Next.js 14 (App Router) + TypeScript
- Supabase (Auth + Postgres + Storage)
- Tailwind CSS + shadcn/ui
- Recharts (for weight chart)
- pnpm

**What I want you to do in this session:**

1. Scaffold the Next.js project with the folder structure in the spec
2. Set up Supabase client (browser + server), middleware for auth redirects
3. Create the full `schema.sql` file (I'll run it in Supabase manually)
4. Build the login/signup page (`/login`)
5. Build the puppy profile setup page (`/profile/setup`)
6. Build the dashboard page (`/dashboard`) with summary cards
7. Build the vaccinations section (`/vaccinations` list + `/vaccinations/new` form)
8. Build the weight section (`/weight` list + chart + `/weight/new` form)
9. Build the vet visits section
10. Build the food section
11. Build the medications section
12. Build the milestones section (timeline layout + mobile photo upload)
13. Build the documents section (file vault for PDFs and images)

**Photo & file upload (critical for mobile):**
- For milestone photos: use `<input type="file" accept="image/*">` — on mobile Safari this triggers the iOS share sheet (camera or photo library). No drag-and-drop.
- Compress images client-side before upload using `browser-image-compression` (target max 1MB, max 1920px). Install this package.
- Upload photos to Supabase Storage bucket `dobby-photos` (public). Store the public URL in `photo_url`.
- For documents: use `<input type="file" accept=".pdf,image/*">` — triggers iOS share sheet including the Files app for PDFs.
- Upload documents to Supabase Storage bucket `dobby-documents` (private, no public access).
- Store the storage `file_path` in the DB, not a URL. Generate signed URLs server-side at view time: `supabase.storage.from('dobby-documents').createSignedUrl(path, 3600)`. Signed URLs expire after 1 hour.
- PDFs open in a new browser tab. Images display in a lightbox modal.
- Create reusable components: `ImageUpload.tsx` and `DocumentUpload.tsx`

**Design direction:**
- Font: **DM Sans** throughout — all weights from regular to bold
- Background: `#EFEFEF` (light grey — not white)
- Primary / accent: `#8B5CF6` (violet-purple) — used for buttons, FAB, active nav tab
- Text primary: `#1A1A1A` (charcoal) / Text secondary: `#7A7A7A`
- Cards: white `#FFFFFF`, 20px border radius, flat (no shadows)
- Input fields: `#EBEBEB` fill, 12px radius, 52px height
- Primary button: `#8B5CF6`, 28px radius, 56px height
- FAB button: `#8B5CF6`, 28px radius, 56×56px, absolutely positioned
- Bottom nav: frosted glass `#FFFFFFB3` + `backdrop-blur`, 28px radius, 56px height, 16px from screen edges

**Typography scale (DM Sans):**
- Hero / App name: 36px Bold (700)
- Page title: 32px Bold (700)
- Section title: 20px SemiBold (600)
- Card value: 28px Bold (700)
- Card label: 11px Bold (700), uppercase, letter-spacing
- Body: 14px Regular
- Secondary / caption: 13px Regular

**Accent colour palette (section tints & badges):**
- Blush Pink: `#F2C4CE` — overdue badge bg
- Sage Green: `#C5DDD1` — up-to-date badge bg
- Soft Yellow: `#F5EAC2` — due-soon badge bg
- Lavender: `#D5C9F0` — avatar placeholder
- Warm Peach: `#F5DEC8`
- Sky Blue: `#C2DCF0`

**Status badges (pill shape, 20px radius):**
- Up to date: bg `#C5DDD1` / text `#2D6A4F`
- Due soon: bg `#F5EAC2` / text `#B7791F`
- Overdue: bg `#F2C4CE` / text `#9B1C1C`

- Mobile bottom navigation with icons for each section
- Generous touch targets (min 44px)

**Important implementation notes:**
- Use Server Components for all data fetching
- Use Client Components only for forms and charts
- All data must be scoped to `puppy_id` via the `puppy_members` join table
- RLS policies must be in place — don't skip them
- Store dates as `date` type in Postgres (no timezone complexity)
- Use `date-fns` for date formatting
- Photos stored in Supabase Storage bucket `dobby-photos` (public)
- Documents stored in Supabase Storage bucket `dobby-documents` (private — signed URLs only)
- Include a `created_by` field on all records (to show "Added by [name]" in UI)

**Auth flow:**
- Owner 1 signs up → creates puppy profile → gets linked via `puppy_members`
- Owner 1 invites Owner 2 via email from the profile page
- Owner 2 accepts invite → auto-linked to same puppy

**Environment variables needed:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Please start by confirming you've understood the requirements, then begin with project scaffolding. Ask me if anything is ambiguous before writing code. After scaffolding, walk me through each step so I can follow along and test as we go.
