# Dobby's Health Tracker — Product Requirements Document

## Overview

A private, mobile-friendly web application for a couple to track their golden retriever puppy Dobby's health, growth, and milestones. It replaces the physical vet booklet with a shared digital experience accessible by two users from any device.

---

## Goals

- Replace the physical vet booklet with a structured digital record
- Allow both owners to log and view data from their own accounts
- Surface key upcoming events (next vaccination, vet appointment) prominently
- Be fast and pleasant to use on mobile

---

## Users

| User | Role |
|------|------|
| Owner 1 | Creates the puppy profile, invites partner |
| Owner 2 | Accepts invite, shares access to same puppy data |

Both users read and write all data. There is no admin distinction — it's a shared household account for one puppy.

---

## Authentication

- Email + password via Supabase Auth
- Owner 1 signs up and creates the puppy profile
- Owner 2 is invited via email (Supabase invite flow)
- Both accounts are linked to the same `puppy_id`
- Session persists across visits (stay logged in)
- `/login` is the only public route; everything else requires auth

---

## Puppy Profile

Set up on first login. Contains:

- Name
- Breed (pre-filled: Golden Retriever)
- Date of birth
- Sex (male/female)
- Colour / markings (optional notes)
- Profile photo (optional)
- Microchip number (optional)

---

## Sections & Data

### 1. Dashboard `/dashboard`

Summary view. Shows:
- Puppy name, photo, age (auto-calculated)
- **Next vaccination due** — name + date
- **Next vet appointment** — date + reason
- **Latest weight** — value + date logged
- **Current food** — brand + daily amount
- **Recent milestones** — last 2–3 entries
- Quick-add buttons for each section

### 2. Vaccinations `/vaccinations`

| Field | Type |
|-------|------|
| Vaccine name | text |
| Date given | date |
| Next due date | date |
| Batch number | text (optional) |
| Vet / clinic | text |
| Notes | text (optional) |

List view sorted by date. Badge shows overdue / due soon / up to date.

### 3. Weight `/weight`

| Field | Type |
|-------|------|
| Date | date |
| Weight (kg) | decimal |
| Notes | text (optional) |

List view + line chart showing growth over time.

### 4. Vet Visits `/vet-visits`

| Field | Type |
|-------|------|
| Date | date |
| Clinic / vet name | text |
| Reason for visit | text |
| Diagnosis / outcome | text (optional) |
| Next appointment date | date (optional) |
| Next appointment reason | text (optional) |
| Cost | decimal (optional) |
| Notes | text (optional) |

### 5. Food & Diet `/food`

| Field | Type |
|-------|------|
| Brand | text |
| Product name | text |
| Type | select: Dry / Wet / Raw / Mixed |
| Daily amount (g) | decimal |
| Meals per day | number |
| Start date | date |
| End date | date (optional — blank = current) |
| Notes / reason for change | text (optional) |

Shows current food prominently. Past foods shown as history log.

### 6. Medications & Dewormings `/medications`

| Field | Type |
|-------|------|
| Name | text |
| Type | select: Deworming / Flea & Tick / Antibiotic / Other |
| Dosage | text |
| Frequency | text |
| Start date | date |
| End date | date (optional) |
| Prescribed by | text (optional) |
| Notes | text (optional) |

Active medications shown at top. Past medications collapsed below.

### 7. Milestones `/milestones`

| Field | Type |
|-------|------|
| Title | text (e.g. "First bath", "First walk") |
| Date | date |
| Notes | text (optional) |
| Photo | image upload (optional) |

Displayed as a chronological timeline / scrapbook.

**Photo upload (mobile):** The photo input must use `<input type="file" accept="image/*">` which on mobile Safari automatically triggers the iOS share sheet — allowing the user to take a photo with the camera or pick from their photo library. No drag-and-drop. Photos are stored in Supabase Storage (`dobby-photos` bucket, public) and the public URL saved in `photo_url`. Images should be compressed client-side before upload (target max 1MB) to keep storage lean and loading fast.

### 8. Documents `/documents`

A secure file vault for important puppy-related documents. Examples: pet insurance policy, adoption/breeder certificate, pedigree papers, vet referral letters, microchip registration.

| Field | Type |
|-------|------|
| Title | text (e.g. "Pet Insurance Policy 2024") |
| Category | select: Insurance / Certificates / Vet Records / Other |
| File | PDF or image upload |
| Date | date (optional — document date or expiry) |
| Notes | text (optional) |
| Uploaded by | auto — current user |
| Uploaded at | auto — timestamp |

**File upload (mobile):** Same `<input type="file" accept=".pdf,image/*">` pattern — triggers iOS share sheet for camera, photo library, or Files app (for PDFs). Files stored in Supabase Storage (`dobby-documents` bucket, private). Files are served via signed URLs (not public) since these are sensitive documents.

List view grouped by category. Each entry shows title, category badge, date, and a download / view button. PDFs open in a new tab; images display in a lightbox.

---

## Design System

### Colour Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#EFEFEF` | App background (light grey) |
| `accent` | `#8B5CF6` | Primary buttons, FAB, active nav tab |
| `text-primary` | `#1A1A1A` | Headings, values, primary text |
| `text-secondary` | `#7A7A7A` | Labels, captions, secondary text |
| `blush-pink` | `#F2C4CE` | Overdue badge background |
| `sage-green` | `#C5DDD1` | Up-to-date badge background |
| `soft-yellow` | `#F5EAC2` | Due-soon badge background |
| `lavender` | `#D5C9F0` | Avatar / profile photo placeholder |
| `warm-peach` | `#F5DEC8` | Accent tint |
| `sky-blue` | `#C2DCF0` | Accent tint |

### Typography

Font family: **DM Sans** (all weights).

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| Hero / Name | 36px | 700 | App name, puppy name |
| Page Title | 32px | 700 | Section page headings |
| Section Title | 20px | 600 | Card group headings |
| Card Value | 28px | 700 | Metric values (weight, etc.) |
| Card Label | 11px | 700 | Uppercase metric labels |
| Body | 14px | 400 | General content text |
| Caption | 13px | 400 | Dates, secondary info |

### Components

| Component | Spec |
|-----------|------|
| Card | White `#FFFFFF`, 20px radius, 16–20px padding, flat (no shadow) |
| Input field | `#EBEBEB` fill, 12px radius, 52px height |
| Primary button | `#8B5CF6`, 28px radius, 56px height |
| FAB button | `#8B5CF6`, 28px radius, 56×56px |
| Bottom nav | Frosted glass `#FFFFFFB3` + backdrop-blur, 28px radius, 56px height, 16px from screen edges |
| Badge (up to date) | bg `#C5DDD1` / text `#2D6A4F`, 20px radius |
| Badge (due soon) | bg `#F5EAC2` / text `#B7791F`, 20px radius |
| Badge (overdue) | bg `#F2C4CE` / text `#9B1C1C`, 20px radius |

---

## Non-Functional Requirements

- **Mobile-first** — primary usage is on phone
- **Fast** — dashboard loads under 2 seconds
- **Offline-tolerant** — at minimum, show last loaded data if offline
- **Accessible** — readable font sizes, sufficient contrast
- **Secure** — all data scoped to puppy via RLS; no data leaks between users
- **Photo compression** — images compressed client-side before upload (target max 1MB)
- **Document privacy** — documents served via Supabase signed URLs, never public

---

## Out of Scope (v1)

- Push notifications / reminders
- Multiple puppies per account
- Sharing with vet externally
- Native mobile app

---

## Success Metrics (qualitative for v1)

- Both owners actively use it after vet visits
- Dashboard gives an accurate at-a-glance health summary
- No data loss or auth issues
