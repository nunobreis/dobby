# Notifications Feature — Design Spec

**Date:** 2026-06-22  
**Status:** Draft — awaiting implementation

---

## Context

Dobby has no way to proactively remind Nuno (or his partner) about upcoming health events. A vet appointment tomorrow or a vaccination due in 3 days can easily be missed. This spec designs a notification system with two layers: Web Push (native device alerts, even when the app is closed) and in-app (bell badge + notification history page, always available as fallback).

**v1 scope:** vet visits and vaccinations only, 3 days before and 1 day before the event.  
**Future scope:** medications, custom user-created reminders (food shopping, accessories), custom timing.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Panel style | Full page `/notifications` | Most room to grow; clean mobile pattern |
| Push vs in-app | Web Push primary, in-app fallback | Push covers locked-screen alerts; in-app covers denied/unsupported browsers |
| v1 trigger events | Vet visits + vaccinations | Most time-sensitive health events |
| Notification timing | 3 days before + 1 day before | Enough lead time to reschedule without being noisy |
| Storage | Stored notifications table | Supports read/unread, notification history, and extensible to custom reminders |

---

## Architecture Overview

```
Vercel Cron (daily 8am UTC)
  └─ /api/cron/notifications
       ├─ Query vet_visits + vaccinations due in 1 or 3 days
       ├─ Insert rows into notifications table (idempotent via UNIQUE constraint)
       └─ Send Web Push to subscribed users via web-push

Browser
  ├─ ServiceWorkerRegistration (client component in root layout)
  │    └─ registers /sw.js
  ├─ NotificationBell (dashboard top bar + desktop sidebar)
  │    └─ badge count = unread notifications for current user
  └─ /notifications page
       ├─ PushPermissionPrompt (if push not yet enabled)
       └─ Notification list (unread → read)
```

---

## Database Schema

### `notifications` table

```sql
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  puppy_id      uuid not null references puppies(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('vet_visit', 'vaccination')),
  body          text not null,          -- static detail: clinic + reason, or vaccine name
  reference_id  uuid,                   -- the vet_visit_id or vaccination_id
  event_date    date not null,          -- the actual appointment/due date
  days_before   int not null,           -- 1 or 3
  read          boolean not null default false,
  push_sent     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (reference_id, user_id, days_before)
);

alter table notifications enable row level security;
create policy "Users see their own notifications"
  on notifications for select using (auth.uid() = user_id);
create policy "Users update their own notifications"
  on notifications for update using (auth.uid() = user_id);
```

The `UNIQUE (reference_id, user_id, days_before)` constraint makes the cron idempotent — re-running it never duplicates a notification.

The display title ("Vet visit tomorrow", "Vaccination due in 3 days") is **computed at render time** from `type` + `event_date`, so it stays correct regardless of when the user reads it, and supports i18n naturally.

### `push_subscriptions` table

```sql
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;
create policy "Users manage their own subscriptions"
  on push_subscriptions for all using (auth.uid() = user_id);
```

---

## Service Worker (`public/sw.js`)

Handles two events:

**`push`** — parses notification payload, calls `self.registration.showNotification(title, options)`. Options include `body`, `icon: '/icons/icon-192.png'`, `badge`, `data: { url }`.

**`notificationclick`** — reads `event.notification.data.url` and calls `clients.openWindow(url)` to navigate to `/notifications`.

---

## New Components

### `components/ServiceWorkerRegistration.tsx`
Client component (`"use client"`). Runs `useEffect` once on mount to call `navigator.serviceWorker.register('/sw.js')`. Added to root `app/layout.tsx` inside `NextIntlClientProvider`.

### `components/NotificationBell.tsx`
Client component. Receives `unreadCount: number` as a prop (fetched server-side on the dashboard). Renders a `Bell` (lucide) icon in a white pill circle. Shows a purple `bg-accent` dot badge when `unreadCount > 0`. Links to `/notifications`.

### `components/PushPermissionPrompt.tsx`
Client component. Shown at the top of the `/notifications` page only when `Notification.permission !== 'granted'`.
- If `'default'`: shows "Enable push notifications" button → calls `Notification.requestPermission()` → on grant, creates `PushSubscription` via `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })` → POSTs to `/api/push/subscribe`.
- If `'denied'`: shows a static info message ("Notifications are blocked in your browser settings").
- If push API is unavailable (older browser, non-HTTPS): renders nothing.

---

## API Routes

### `POST /api/push/subscribe`
Auth-guarded. Receives `{ endpoint, keys: { p256dh, auth } }`. Upserts into `push_subscriptions` for the current user. Returns `200`.

### `GET /api/cron/notifications`
Protected by `Authorization: Bearer ${CRON_SECRET}` header (Vercel sets this automatically on cron invocations). Logic:

1. Get `today` date string.
2. Compute `in1day` = today + 1 day, `in3days` = today + 3 days.
3. Query all puppies → for each puppy get its members (user_ids).
4. Query `vet_visits` where `next_appointment_date IN (in1day, in3days)`.
5. Query `vaccinations` where `next_due_date IN (in1day, in3days)`.
6. For each matched record × each member user:
   - Compute `days_before` (1 or 3).
   - Build `body` text: for vet visits → `"${vet_clinic} · ${reason}"`, for vaccinations → vaccine_name.
   - `INSERT INTO notifications ... ON CONFLICT DO NOTHING` (idempotent).
   - If a row was inserted and user has a `push_subscription`:
     - Look up user language from `auth.users.raw_user_meta_data.language`.
     - Generate push title + body in user's language (EN/PT).
     - Send via `webpush.sendNotification(subscription, payload)`.
     - Update `push_sent = true`.
7. Return `{ sent: N, skipped: M }`.

Uses Supabase service-role key (`SUPABASE_SERVICE_ROLE_KEY` env var — must be added to Vercel env vars if not already present; available in Supabase Dashboard → Project Settings → API).

---

## `/notifications` Page

**`app/notifications/page.tsx`** — server component.
- Fetches `notifications` for the current user ordered by `created_at DESC`.
- Passes to `NotificationsClient`.

**`app/notifications/NotificationsClient.tsx`** — client component.
- Renders `PushPermissionPrompt` at top.
- Groups notifications: **Unread** section (purple dot, full opacity) then **Earlier** section (no dot, 55% opacity).
- Each item: type icon (🏥 or 💉 in coloured pill), computed title, `body` subtitle, relative time.
- "Mark all read" button (top-right) → calls `markAllRead` server action.
- Computed title helper: `type + event_date → i18n string` (e.g., `t('vetVisitTomorrow')` or `t('vetVisitInDays', { days: 3 })`).

**`lib/actions/notifications.ts`** — `markAllRead` server action.
Updates all `notifications` rows for current user where `read = false` → `read = true`. Calls `revalidatePath('/notifications')` and `revalidatePath('/dashboard')`.

---

## Bell in Dashboard Header

`app/dashboard/page.tsx`: fetch unread count alongside existing queries:
```ts
supabase.from('notifications')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('read', false)
```
Pass `unreadCount` to `<NotificationBell unreadCount={unreadCount} />` placed between the greeting block and the avatar link in the top bar.

**Desktop sidebar (v2):** A bell link with badge could be added to `SidebarNav.tsx` in a future iteration. For v1, the bell is dashboard-only — users see their count when they return to the main page.

---

## Vercel Cron (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/notifications",
      "schedule": "0 8 * * *"
    }
  ]
}
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `VAPID_PUBLIC_KEY` | Web Push: public VAPID key (sent to browser for subscription) |
| `VAPID_PRIVATE_KEY` | Web Push: private VAPID key (server-side only) |
| `VAPID_SUBJECT` | Web Push: `mailto:nunobreis@gmail.com` |
| `CRON_SECRET` | Protects the cron endpoint (Vercel sets this automatically on cron invocations) |
| `SUPABASE_SERVICE_ROLE_KEY` | Allows cron job to bypass RLS and query auth.users metadata |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Client-side alias of `VAPID_PUBLIC_KEY` (for SW subscription) |

Generate VAPID keys once via `npx web-push generate-vapid-keys`.

---

## i18n Keys

Add to `messages/en.json` and `messages/pt.json` under a new `notifications` namespace:

```json
{
  "notifications": {
    "title": "Notifications",
    "markAllRead": "Mark all read",
    "unread": "Unread",
    "earlier": "Earlier",
    "empty": "No notifications yet",
    "enablePush": "Enable push notifications",
    "enablePushDesc": "Get reminders about Dobby's appointments",
    "pushBlocked": "Notifications are blocked in your browser settings",
    "vetVisitTomorrow": "Vet visit tomorrow",
    "vetVisitInDays": "Vet visit in {days} days",
    "vaccinationTomorrow": "Vaccination due tomorrow",
    "vaccinationInDays": "Vaccination due in {days} days"
  }
}
```

---

## New Package

```
pnpm add web-push
pnpm add -D @types/web-push
```

---

## Files to Create

| File | Purpose |
|---|---|
| `public/sw.js` | Service Worker |
| `components/ServiceWorkerRegistration.tsx` | Registers SW on client |
| `components/NotificationBell.tsx` | Bell icon + badge |
| `components/PushPermissionPrompt.tsx` | In-app push permission flow |
| `app/notifications/page.tsx` | Notifications page (server) |
| `app/notifications/NotificationsClient.tsx` | Notifications page (client) |
| `app/api/push/subscribe/route.ts` | Save push subscription |
| `app/api/cron/notifications/route.ts` | Daily cron job |
| `lib/actions/notifications.ts` | markAllRead server action |
| `vercel.json` | Cron schedule |

## Files to Modify

| File | Change |
|---|---|
| `app/layout.tsx` | Add `ServiceWorkerRegistration`, pass unread count to `Sidebar` |
| `app/dashboard/page.tsx` | Fetch unread count, add `NotificationBell` to top bar |
| `components/SidebarNav.tsx` | Add `/notifications` link (no badge for v1) |
| `lib/types.ts` | Add `Notification`, `PushSubscription` types |
| `supabase/schema.sql` | Add new tables |
| `messages/en.json` + `messages/pt.json` | Add `notifications` namespace |
| `next.config.mjs` | No change needed — SW served from `public/` automatically |
| `.gitignore` | Already updated (`.superpowers/` added) |

---

## Verification

1. **DB:** Run SQL in Supabase Dashboard to create `notifications` and `push_subscriptions` tables. Verify RLS policies are active.
2. **VAPID keys:** Generate with `npx web-push generate-vapid-keys`, add to Vercel env vars + `.env.local`.
3. **Build:** `pnpm build` — no type errors (`npx tsc --noEmit`).
4. **Service worker:** Open app on HTTPS (Vercel preview), check DevTools → Application → Service Workers shows `sw.js` registered.
5. **Push permission:** Navigate to `/notifications`, tap "Enable push notifications", accept browser prompt. Check Supabase `push_subscriptions` table for new row.
6. **In-app fallback:** Deny push permission (or use a browser without push support), check that bell badge and `/notifications` page still show upcoming events correctly.
7. **Cron trigger:** Call `GET /api/cron/notifications` with correct `Authorization` header manually. Check that notification rows appear in DB and a push is received on the device.
8. **Mark as read:** On `/notifications`, tap "Mark all read". Verify bell badge disappears on dashboard.
9. **Idempotency:** Run cron twice — verify no duplicate notifications in DB.
