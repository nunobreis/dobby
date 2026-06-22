# Notifications Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Web Push + in-app notifications for upcoming vet visits and vaccinations, with a bell icon on the dashboard and a dedicated `/notifications` page.

**Architecture:** A Vercel Cron job runs daily at 8am UTC, queries events due in 1 or 3 days, inserts idempotent rows into a `notifications` table, and sends Web Push to subscribed devices. The dashboard shows a bell icon with unread badge; tapping it navigates to `/notifications` which groups unread vs read and includes a push permission prompt.

**Tech Stack:** `web-push` (npm), Vercel Cron, Supabase (service role for cron), next-intl, lucide-react, date-fns (already installed)

**Spec:** `docs/superpowers/specs/2026-06-22-notifications-design.md`

---

## File Map

**Create:**
- `public/sw.js` — Service Worker: handles push events + notificationclick
- `components/ServiceWorkerRegistration.tsx` — client component that registers SW on mount
- `components/NotificationBell.tsx` — bell icon + purple badge, links to /notifications
- `components/PushPermissionPrompt.tsx` — in-app card to request push permission and subscribe
- `app/notifications/page.tsx` — server component, fetches notifications for current user
- `app/notifications/NotificationsClient.tsx` — client component, renders list + mark-all-read
- `app/api/push/subscribe/route.ts` — POST: upsert push subscription for current user
- `app/api/cron/notifications/route.ts` — GET: daily cron, creates notification rows + sends push
- `lib/actions/notifications.ts` — markAllRead server action
- `vercel.json` — cron schedule

**Modify:**
- `middleware.ts` — skip `/api/cron/` from auth redirect (cron uses its own secret)
- `app/layout.tsx` — add `<ServiceWorkerRegistration />`
- `app/dashboard/page.tsx` — fetch unread count, add `<NotificationBell>` to top bar
- `components/SidebarNav.tsx` — add `/notifications` link with Bell icon
- `components/BottomNav.tsx` — add `/notifications` to morePaths so More tab stays active
- `lib/types.ts` — append `Notification` and `AppPushSubscription` interfaces
- `supabase/schema.sql` — append new tables
- `messages/en.json` — add `notifications` namespace + `nav.notifications` key
- `messages/pt.json` — same in Portuguese

---

## Task 1: Install package + DB schema + types

**Files:**
- Modify: `lib/types.ts`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Install web-push**

```bash
cd /path/to/dobby
pnpm add web-push
pnpm add -D @types/web-push
```

Expected: `web-push` and `@types/web-push` appear in `package.json`.

- [ ] **Step 2: Run SQL in Supabase Dashboard → SQL Editor**

Open the Supabase Dashboard for this project, go to SQL Editor, and run:

```sql
create table if not exists notifications (
  id            uuid primary key default gen_random_uuid(),
  puppy_id      uuid not null references puppies(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('vet_visit', 'vaccination')),
  body          text not null,
  reference_id  uuid,
  event_date    date not null,
  days_before   int not null,
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

create table if not exists push_subscriptions (
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

Expected: Both tables appear in the Supabase Table Editor.

- [ ] **Step 3: Update supabase/schema.sql**

Append the same SQL block from Step 2 to the bottom of `supabase/schema.sql`.

- [ ] **Step 4: Append types to lib/types.ts**

Add at the end of `lib/types.ts`:

```typescript
export interface Notification {
  id: string;
  puppy_id: string;
  user_id: string;
  type: 'vet_visit' | 'vaccination';
  body: string;
  reference_id: string | null;
  event_date: string;
  days_before: number;
  read: boolean;
  push_sent: boolean;
  created_at: string;
}

export interface AppPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
```

- [ ] **Step 5: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml supabase/schema.sql lib/types.ts
git commit -m "feat: add notifications + push_subscriptions schema and types"
```

---

## Task 2: i18n keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/pt.json`

- [ ] **Step 1: Add notifications namespace + nav key to messages/en.json**

In `messages/en.json`, add a top-level `"notifications"` key and extend `"nav"`:

```json
"nav": {
  "home": "Home",
  "vaccinations": "Vaccinations",
  "weight": "Weight",
  "vetVisits": "Vet Visits",
  "more": "More",
  "aiVet": "Chat",
  "food": "Food",
  "medications": "Medications",
  "milestones": "Milestones",
  "documents": "Documents",
  "profile": "Profile",
  "vet": "Vet",
  "settings": "Settings",
  "notifications": "Notifications"
},
"notifications": {
  "title": "Notifications",
  "markAllRead": "Mark all read",
  "unread": "Unread",
  "earlier": "Earlier",
  "empty": "No notifications yet",
  "enablePush": "Enable push notifications",
  "enablePushDesc": "Get reminders about Dobby's appointments",
  "pushBlocked": "Notifications are blocked — update your browser settings to enable them",
  "vetVisitTomorrow": "Vet visit tomorrow",
  "vetVisitInDays": "Vet visit in {days} days",
  "vaccinationTomorrow": "Vaccination due tomorrow",
  "vaccinationInDays": "Vaccination due in {days} days"
}
```

- [ ] **Step 2: Add same keys to messages/pt.json**

```json
"nav": {
  ...existing keys...,
  "notifications": "Notificações"
},
"notifications": {
  "title": "Notificações",
  "markAllRead": "Marcar tudo como lido",
  "unread": "Não lidas",
  "earlier": "Anteriores",
  "empty": "Sem notificações",
  "enablePush": "Ativar notificações push",
  "enablePushDesc": "Recebe lembretes sobre as consultas do Dobby",
  "pushBlocked": "Notificações bloqueadas — atualiza as definições do navegador para as ativar",
  "vetVisitTomorrow": "Consulta veterinária amanhã",
  "vetVisitInDays": "Consulta veterinária em {days} dias",
  "vaccinationTomorrow": "Vacinação amanhã",
  "vaccinationInDays": "Vacinação em {days} dias"
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/pt.json
git commit -m "feat: add notifications i18n namespace"
```

---

## Task 3: Service Worker + registration

**Files:**
- Create: `public/sw.js`
- Create: `components/ServiceWorkerRegistration.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create public/sw.js**

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Dobby', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/notifications' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url ?? '/notifications')
  );
});
```

- [ ] **Step 2: Create components/ServiceWorkerRegistration.tsx**

```typescript
'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
```

- [ ] **Step 3: Add ServiceWorkerRegistration to app/layout.tsx**

Import and render it inside `NextIntlClientProvider` (it renders nothing, just registers the SW):

```typescript
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

// Inside NextIntlClientProvider, after the existing children:
<NextIntlClientProvider locale={locale} messages={messages}>
  <ServiceWorkerRegistration />
  <div className="flex min-h-screen">
    <Sidebar />
    <div className="flex-1 min-w-0">
      {children}
    </div>
  </div>
  <BottomNav />
  <Toaster position="top-center" richColors />
</NextIntlClientProvider>
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js components/ServiceWorkerRegistration.tsx app/layout.tsx
git commit -m "feat: add service worker and registration component"
```

---

## Task 4: Server action + subscribe API + middleware fix

**Files:**
- Create: `lib/actions/notifications.ts`
- Create: `app/api/push/subscribe/route.ts`
- Modify: `middleware.ts`

- [ ] **Step 1: Create lib/actions/notifications.ts**

```typescript
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markAllRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  revalidatePath('/notifications');
  revalidatePath('/dashboard');
}
```

- [ ] **Step 2: Create app/api/push/subscribe/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint, keys } = await req.json();

  await supabase.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: 'user_id,endpoint' }
  );

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Update middleware.ts to skip cron routes**

In `middleware.ts`, add this block immediately after the `pathname.startsWith("/auth/")` check (before any auth logic):

```typescript
if (pathname.startsWith('/api/cron/')) {
  return supabaseResponse;
}
```

This lets the cron route handle its own auth via `CRON_SECRET`.

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/actions/notifications.ts app/api/push/subscribe/route.ts middleware.ts
git commit -m "feat: add markAllRead action, push subscribe endpoint, cron middleware bypass"
```

---

## Task 5: NotificationBell component

**Files:**
- Create: `components/NotificationBell.tsx`

- [ ] **Step 1: Create components/NotificationBell.tsx**

```typescript
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface Props {
  unreadCount: number;
}

export default function NotificationBell({ unreadCount }: Props) {
  return (
    <Link href="/notifications">
      <div className="relative w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shadow-sm">
        <Bell size={16} className="text-text-primary" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-accent rounded-full border-[1.5px] border-background" />
        )}
      </div>
    </Link>
  );
}
```

Note: `NotificationBell` is a server component (no `"use client"`) — it receives its count as a prop and links to `/notifications`. The interactive behaviour lives in the notifications page itself.

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/NotificationBell.tsx
git commit -m "feat: add NotificationBell component"
```

---

## Task 6: PushPermissionPrompt component

**Files:**
- Create: `components/PushPermissionPrompt.tsx`

- [ ] **Step 1: Create components/PushPermissionPrompt.tsx**

```typescript
'use client';
import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushPermissionPrompt() {
  const t = useTranslations('notifications');
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  if (permission === null || permission === 'granted' || dismissed) return null;

  const handleEnable = async () => {
    setStatus('loading');
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      setPermission(result);
      setStatus('idle');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
    } catch {
      // Push subscription failed — in-app fallback still works
    }
    setStatus('done');
    setDismissed(true);
  };

  return (
    <div className="bg-white rounded-card p-4 flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-[10px] bg-lavender flex items-center justify-center flex-shrink-0">
        <Bell size={16} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-primary">{t('enablePush')}</p>
        <p className="text-[11px] text-text-secondary mt-0.5">{t('enablePushDesc')}</p>
        {permission === 'denied' ? (
          <p className="text-[11px] text-text-secondary mt-2">{t('pushBlocked')}</p>
        ) : (
          <button
            onClick={handleEnable}
            disabled={status === 'loading'}
            className="mt-2 px-3 py-1 bg-accent text-white text-[11px] font-semibold rounded-badge disabled:opacity-50"
          >
            {status === 'loading' ? '…' : t('enablePush')}
          </button>
        )}
      </div>
      <button onClick={() => setDismissed(true)} className="flex-shrink-0">
        <X size={14} className="text-text-secondary" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/PushPermissionPrompt.tsx
git commit -m "feat: add PushPermissionPrompt component"
```

---

## Task 7: Notifications page

**Files:**
- Create: `app/notifications/page.tsx`
- Create: `app/notifications/NotificationsClient.tsx`

- [ ] **Step 1: Create app/notifications/page.tsx**

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NotificationsClient from './NotificationsClient';
import type { Notification } from '@/lib/types';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return <NotificationsClient notifications={(data ?? []) as Notification[]} />;
}
```

- [ ] **Step 2: Create app/notifications/NotificationsClient.tsx**

```typescript
'use client';
import { useTranslations } from 'next-intl';
import { Hospital, Syringe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import BackButton from '@/components/BackButton';
import PushPermissionPrompt from '@/components/PushPermissionPrompt';
import { markAllRead } from '@/lib/actions/notifications';
import type { Notification } from '@/lib/types';

interface Props {
  notifications: Notification[];
}

export default function NotificationsClient({ notifications }: Props) {
  const t = useTranslations('notifications');
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-[24px] font-bold text-text-primary">{t('title')}</h1>
        </div>
        {unread.length > 0 && (
          <form action={markAllRead}>
            <button type="submit" className="text-[13px] text-accent font-semibold">
              {t('markAllRead')}
            </button>
          </form>
        )}
      </div>

      <div className="px-5">
        <PushPermissionPrompt />

        {notifications.length === 0 && (
          <p className="text-text-secondary text-[14px] text-center py-16">{t('empty')}</p>
        )}

        {unread.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wide mb-2">
              {t('unread')}
            </p>
            <div className="flex flex-col gap-2">
              {unread.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          </div>
        )}

        {read.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wide mb-2">
              {t('earlier')}
            </p>
            <div className="flex flex-col gap-2 opacity-55">
              {read.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({ notification: n }: { notification: Notification }) {
  const t = useTranslations('notifications');
  const title = getTitle(n.type, n.event_date, t);
  const Icon = n.type === 'vet_visit' ? Hospital : Syringe;
  const iconBg = n.type === 'vet_visit' ? 'bg-lavender' : 'bg-pink-100';

  return (
    <div className="bg-white rounded-card p-4 flex gap-3 items-start">
      <div
        className={`w-9 h-9 rounded-[10px] ${iconBg} flex items-center justify-center flex-shrink-0`}
      >
        <Icon size={16} className="text-accent" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-text-primary leading-tight">{title}</p>
          {!n.read && (
            <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />
          )}
        </div>
        <p className="text-[11px] text-text-secondary mt-0.5">{n.body}</p>
        <p className="text-[10px] text-text-secondary mt-1">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function getTitle(
  type: 'vet_visit' | 'vaccination',
  eventDate: string,
  t: (key: string, values?: Record<string, unknown>) => string
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate + 'T00:00:00');
  const diffDays = Math.round((event.getTime() - today.getTime()) / 86_400_000);

  if (type === 'vet_visit') {
    return diffDays <= 1 ? t('vetVisitTomorrow') : t('vetVisitInDays', { days: diffDays });
  }
  return diffDays <= 1 ? t('vaccinationTomorrow') : t('vaccinationInDays', { days: diffDays });
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/notifications/page.tsx app/notifications/NotificationsClient.tsx
git commit -m "feat: add notifications page"
```

---

## Task 8: Dashboard integration

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Import NotificationBell in app/dashboard/page.tsx**

Add this import near the top with the other component imports:

```typescript
import NotificationBell from "@/components/NotificationBell";
```

- [ ] **Step 2: Add unread count query to the Promise.all block**

Inside the existing `Promise.all([...])`, add a new query as the last item:

```typescript
supabase
  .from('notifications')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('read', false),
```

Destructure the result by adding `{ count: unreadCount }` as the last element in the destructuring array.

- [ ] **Step 3: Add NotificationBell to the top bar**

Find the existing top bar JSX — the `<Link href="/profile">` avatar div. Place `<NotificationBell>` immediately before it:

```tsx
<div className="flex items-center gap-2">
  <NotificationBell unreadCount={unreadCount ?? 0} />
  <Link href="/profile">
    <div className="w-[50px] h-[50px] rounded-full bg-lavender overflow-hidden flex items-center justify-center">
      {puppy?.photo_url ? (
        <img src={puppy.photo_url} alt={puppy.name} className="w-full h-full object-cover" />
      ) : (
        <PawPrint size={20} className="text-accent opacity-70" />
      )}
    </div>
  </Link>
</div>
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add notification bell to dashboard header"
```

---

## Task 9: Sidebar + BottomNav updates

**Files:**
- Modify: `components/SidebarNav.tsx`
- Modify: `components/BottomNav.tsx`

- [ ] **Step 1: Add Bell to SidebarNav imports and tabs array**

In `components/SidebarNav.tsx`, add `Bell` to the lucide-react import line, then add a new entry to the `tabs` array:

```typescript
import {
  House, Syringe, Scale, UtensilsCrossed, Pill, Trophy,
  FileText, PawPrint, Stethoscope, CalendarDays, MessageCircle, Settings, Bell,
} from "lucide-react";

// In the tabs array, add after the aiVet entry:
{ href: "/notifications", icon: Bell, label: t("notifications") },
```

- [ ] **Step 2: Add /notifications to BottomNav morePaths**

In `components/BottomNav.tsx`, add `"/notifications"` to the `morePaths` array so the More tab stays highlighted when the user is on `/notifications`:

```typescript
const morePaths = ["/more", "/food", "/medications", "/milestones", "/documents", "/profile", "/settings", "/account", "/vet-visits", "/notifications"];
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/SidebarNav.tsx components/BottomNav.tsx
git commit -m "feat: add notifications link to sidebar and bottom nav paths"
```

---

## Task 10: Cron job + vercel.json

**Files:**
- Create: `app/api/cron/notifications/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json**

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

- [ ] **Step 2: Create app/api/cron/notifications/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const in1day = new Date(today);
  in1day.setUTCDate(in1day.getUTCDate() + 1);
  const in3days = new Date(today);
  in3days.setUTCDate(in3days.getUTCDate() + 3);

  const in1dayStr = in1day.toISOString().split('T')[0];
  const in3daysStr = in3days.toISOString().split('T')[0];

  // Fetch all puppy members
  const { data: members } = await supabase
    .from('puppy_members')
    .select('puppy_id, user_id');

  if (!members?.length) return NextResponse.json({ sent: 0, skipped: 0 });

  const puppyMembers: Record<string, string[]> = {};
  for (const m of members) {
    if (!puppyMembers[m.puppy_id]) puppyMembers[m.puppy_id] = [];
    puppyMembers[m.puppy_id].push(m.user_id);
  }
  const puppyIds = Object.keys(puppyMembers);
  const allUserIds = [...new Set(members.map((m) => m.user_id))];

  // Fetch upcoming records
  const [{ data: vetVisits }, { data: vaccinations }, { data: pushSubs }] = await Promise.all([
    supabase
      .from('vet_visits')
      .select('id, puppy_id, next_appointment_date, vet_clinic, reason')
      .in('puppy_id', puppyIds)
      .in('next_appointment_date', [in1dayStr, in3daysStr]),
    supabase
      .from('vaccinations')
      .select('id, puppy_id, next_due_date, vaccine_name')
      .in('puppy_id', puppyIds)
      .in('next_due_date', [in1dayStr, in3daysStr]),
    supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', allUserIds),
  ]);

  // Fetch user language preferences
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userLanguages: Record<string, string> = {};
  for (const u of users ?? []) {
    userLanguages[u.id] = (u.user_metadata?.language as string) ?? 'en';
  }

  const subsByUser: Record<string, Array<{ endpoint: string; p256dh: string; auth: string }>> = {};
  for (const s of pushSubs ?? []) {
    if (!subsByUser[s.user_id]) subsByUser[s.user_id] = [];
    subsByUser[s.user_id].push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
  }

  let sent = 0;
  let skipped = 0;

  const processRecord = async (
    type: 'vet_visit' | 'vaccination',
    record: { id: string; puppy_id: string; event_date: string; body: string },
    userIds: string[]
  ) => {
    const daysBefore = record.event_date === in1dayStr ? 1 : 3;
    for (const userId of userIds) {
      const lang = userLanguages[userId] ?? 'en';
      const { data: inserted, error } = await supabase
        .from('notifications')
        .insert({
          puppy_id: record.puppy_id,
          user_id: userId,
          type,
          body: record.body,
          reference_id: record.id,
          event_date: record.event_date,
          days_before: daysBefore,
          read: false,
          push_sent: false,
        })
        .select('id')
        .single();

      if (error || !inserted) { skipped++; continue; }

      const subs = subsByUser[userId] ?? [];
      const pushTitle =
        type === 'vet_visit'
          ? daysBefore === 1
            ? lang === 'pt' ? 'Consulta veterinária amanhã' : 'Vet visit tomorrow'
            : lang === 'pt' ? `Consulta veterinária em ${daysBefore} dias` : `Vet visit in ${daysBefore} days`
          : daysBefore === 1
          ? lang === 'pt' ? 'Vacinação amanhã' : 'Vaccination due tomorrow'
          : lang === 'pt' ? `Vacinação em ${daysBefore} dias` : `Vaccination due in ${daysBefore} days`;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: pushTitle, body: record.body, url: '/notifications' })
          );
          await supabase.from('notifications').update({ push_sent: true }).eq('id', inserted.id);
        } catch {
          // Subscription may be expired; silently skip
        }
      }
      sent++;
    }
  };

  for (const v of vetVisits ?? []) {
    if (!v.next_appointment_date) continue;
    const body = [v.vet_clinic, v.reason].filter(Boolean).join(' · ');
    await processRecord('vet_visit', { id: v.id, puppy_id: v.puppy_id, event_date: v.next_appointment_date, body }, puppyMembers[v.puppy_id] ?? []);
  }

  for (const v of vaccinations ?? []) {
    if (!v.next_due_date) continue;
    await processRecord('vaccination', { id: v.id, puppy_id: v.puppy_id, event_date: v.next_due_date, body: v.vaccine_name }, puppyMembers[v.puppy_id] ?? []);
  }

  return NextResponse.json({ sent, skipped });
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/notifications/route.ts vercel.json
git commit -m "feat: add notifications cron job and vercel.json schedule"
```

---

## Task 11: Environment variables + final verification

- [ ] **Step 1: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Copy the output — you'll get a Public Key and a Private Key.

- [ ] **Step 2: Add env vars to Vercel**

In Vercel Dashboard → Project Settings → Environment Variables, add:

| Name | Value | Environment |
|---|---|---|
| `VAPID_PUBLIC_KEY` | (from Step 1) | Production, Preview, Development |
| `VAPID_PRIVATE_KEY` | (from Step 1) | Production, Preview, Development |
| `VAPID_SUBJECT` | `mailto:nunobreis@gmail.com` | Production, Preview, Development |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | (same as VAPID_PUBLIC_KEY) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | (from Supabase Dashboard → Project Settings → API → service_role key) | Production, Preview, Development |
| `CRON_SECRET` | (any random string, e.g. `openssl rand -hex 32`) | Production, Preview |

- [ ] **Step 3: Add env vars to .env.local for local reference**

```bash
VAPID_PUBLIC_KEY=<your-public-key>
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:nunobreis@gmail.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<your-public-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
CRON_SECRET=<your-secret>
```

Note: `.env.local` is already git-ignored. Do not commit it.

- [ ] **Step 4: Production build check**

```bash
pnpm build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Push and deploy to Vercel preview**

```bash
git push
```

Open the Vercel preview URL once the deploy finishes.

- [ ] **Step 6: Verify Service Worker registers**

On the Vercel preview URL, open DevTools → Application → Service Workers. Confirm `sw.js` is registered and active.

- [ ] **Step 7: Verify push permission flow**

Navigate to `/notifications` on the preview URL. The "Enable push notifications" card should appear. Tap it, accept the browser prompt. Check Supabase Table Editor → `push_subscriptions` for a new row.

- [ ] **Step 8: Manually trigger cron to verify end-to-end**

First, ensure there's a vet visit or vaccination record with `next_appointment_date` or `next_due_date` set to tomorrow or 3 days from now.

Then call the cron endpoint with curl (replace `<url>` and `<secret>`):

```bash
curl -X GET "https://<preview-url>/api/cron/notifications" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Expected response: `{"sent": N, "skipped": 0}` where N > 0.

Check:
- Supabase `notifications` table has new row(s)
- Device received a push notification banner (if push was enabled in Step 7)

- [ ] **Step 9: Verify bell badge appears on dashboard**

Reload the dashboard. The bell icon should show a purple dot badge (unread count > 0).

- [ ] **Step 10: Verify mark-all-read**

Go to `/notifications`, tap "Mark all read". Reload the dashboard — the bell badge should be gone.

- [ ] **Step 11: Verify idempotency**

Run the curl command from Step 8 again. Expected response: `{"sent": 0, "skipped": N}` — no duplicates created.

- [ ] **Step 12: Verify in-app fallback**

In the browser, go to Settings → Notifications and block notifications for the site. Reload `/notifications`. The "Notifications are blocked" message should appear. The bell badge and notifications list should still work.

- [ ] **Step 13: Final commit**

```bash
git add .env.local  # Do NOT add .env.local — this is just a reminder
git push
```

Push any remaining uncommitted changes. Vercel will auto-deploy to production on merge.
