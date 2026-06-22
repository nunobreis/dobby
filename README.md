# Dobby

A personal pet health tracker for Dobby, a Golden Retriever. Built as a mobile-first PWA with a desktop sidebar layout.

## Features

- **Dashboard** — overview of Dobby's health status, upcoming vet visits, vaccinations, weight, and food
- **Vaccinations** — log vaccines, track next due dates, status badges (up to date / due soon / overdue)
- **Vet visits** — record past visits and upcoming appointments
- **Weight** — log weight entries with a trend chart
- **Food & diet** — track current food brand, type, and daily amount
- **Medications** — log deworming, flea/tick treatments, antibiotics, and other medications with edit/delete
- **Milestones** — capture memorable moments with photos and dates
- **Documents** — upload and organise insurance, certificates, vet records, and other files
- **AI Vet** — chat with an AI assistant about Dobby's health, with voice input and image attachments
- **Notifications** — web push + in-app alerts for upcoming vet visits and vaccinations (1 day and 3 days before)
- **Two-user households** — owner + partner share a single puppy profile via `puppy_members`
- **Bilingual** — English and Portuguese (Portugal), synced across devices

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database + Auth | Supabase (Postgres + Auth) |
| AI | Anthropic Claude via AI SDK |
| i18n | next-intl 4.x (cookie-based, no URL prefix) |
| Push notifications | web-push + Vercel Cron |
| Icons | lucide-react |
| Charts | recharts |
| Toasts | sonner |
| Font | DM Sans |
| Package manager | pnpm |
| Deployment | Vercel |

## Running locally

```bash
pnpm install
pnpm dev      # → http://localhost:3000
```

> **Note:** Supabase Auth redirect URLs point to the Vercel deployment URL, so login does not work on localhost. Test authenticated features by pushing to Vercel.

The cron endpoint (`/api/cron/notifications`) can be tested locally without auth:

```bash
curl -X GET "http://localhost:3000/api/cron/notifications" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (cron job only) |
| `ANTHROPIC_API_KEY` | Anthropic API key (AI Vet) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key (client-side push subscription) |
| `VAPID_PUBLIC_KEY` | VAPID public key (server-side push) |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | VAPID subject (`mailto:...`) |
| `CRON_SECRET` | Bearer token for securing the cron endpoint |

Generate VAPID keys with:
```bash
npx web-push generate-vapid-keys
```

## Project structure

```
app/
  dashboard/          # Main dashboard with health overview
  vaccinations/       # Vaccination log
  vet-visits/         # Vet visit log
  weight/             # Weight log + chart
  food/               # Food & diet log
  medications/        # Medication log
  milestones/         # Milestone gallery
  documents/          # Document storage
  ai-vet/             # AI chat with voice + image support
  notifications/      # Notifications page
  profile/            # Puppy profile + partner invite
  settings/           # Language preference
  more/               # Mobile "more" menu
  api/
    push/subscribe/   # POST: save web push subscription
    cron/notifications/ # GET: daily cron — create notifications + send push

components/
  NotificationBell.tsx        # Bell icon with unread badge
  PushPermissionPrompt.tsx    # In-app card to request push permission
  ServiceWorkerRegistration.tsx
  Sidebar.tsx / SidebarNav.tsx / BottomNav.tsx
  VaccinationBadge.tsx / WeightChart.tsx / ImageUpload.tsx / DocumentUpload.tsx

lib/
  types.ts            # All TypeScript interfaces
  utils.ts            # formatDate, calculateAge, formatWeight, getVaccinationStatus
  actions/            # Server actions (markAllRead, setLanguage, invitePartner)
  supabase/           # client.ts + server.ts

public/
  sw.js               # Service Worker for push notifications
  icons/              # PWA icons
  splash/             # iOS splash screens

messages/
  en.json             # English translations
  pt.json             # Portuguese translations
```

## Notifications

The cron job runs daily at **08:00 UTC** via Vercel Cron. It:
1. Finds vet visits and vaccinations due in 1 or 3 days
2. Inserts rows into the `notifications` table (idempotent via unique constraint)
3. Sends web push to all subscribed devices

Users who deny push permission still receive in-app notifications via the bell badge and `/notifications` page.
