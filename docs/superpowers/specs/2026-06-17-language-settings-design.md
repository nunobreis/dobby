# Language Settings Design

**Date:** 2026-06-17  
**Status:** Approved

## Context

Dobby is a Next.js 14.2 pet health tracker. All text is hardcoded in English. The owner wants to support English and Portuguese (Portugal), with language preference remembered per user. A Settings option needs to be added to the More view to let the user switch language.

## Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| i18n library | `next-intl` | Best App Router server component support |
| Locale routing | Cookie-based (no URL prefix) | Avoids restructuring existing routes |
| Persistence | Supabase user metadata + cookie | Cross-device sync via Supabase; fast reads via cookie |
| Language picker UI | Radio list, instant switch | Lowest friction for 2 languages |
| Settings placement | "App" section in More view | Cleanly separates app config from pet content |
| Translation scope | Full app | All visible strings translated |

## Architecture

```
User picks language on /settings
        │
        ▼
Server Action: lib/actions/settings.ts
  ├── supabase.auth.updateUser({ data: { language: 'pt' } })
  └── cookies().set('NEXT_LOCALE', 'pt', { maxAge: 1yr, path: '/' })
        │
        ▼
revalidatePath('/', 'layout')  →  page re-renders in new locale

On every request:
  i18n/request.ts (getRequestConfig) reads NEXT_LOCALE cookie → selects messages file

On login:
  app/layout.tsx reads user.user_metadata.language → sets/refreshes NEXT_LOCALE cookie
  (ensures Supabase is authoritative; cookie is a cache)
```

## Files to Create

| File | Purpose |
|---|---|
| `i18n/request.ts` | `getRequestConfig` — reads `NEXT_LOCALE` cookie, loads message file |
| `messages/en.json` | All English strings |
| `messages/pt.json` | All Portuguese (Portugal) strings |
| `app/settings/page.tsx` | Settings page server component |
| `app/settings/SettingsClient.tsx` | Client component — language radio picker |
| `lib/actions/settings.ts` | Server action — saves language to Supabase + cookie |

## Files to Modify

| File | Change |
|---|---|
| `next.config.mjs` | Wrap config with `createNextIntlPlugin` |
| `app/layout.tsx` | Add `NextIntlClientProvider`; read Supabase metadata on load to sync cookie |
| `middleware.ts` | No structural change — next-intl without routing needs no middleware hook |
| `app/more/page.tsx` | Add "App" section with Settings link below existing items |
| `components/BottomNav.tsx` | Replace hardcoded nav labels with `useTranslations` |
| `components/SidebarNav.tsx` | Replace hardcoded nav labels with `useTranslations` |
| `components/Sidebar.tsx` | Replace any hardcoded strings |
| `components/EmptyState.tsx` | Translate default props if any |
| `components/ErrorState.tsx` | Translate default props if any |
| All `app/**/page.tsx` files | Replace hardcoded strings with `t('key')` |
| All `app/**/[action]/page.tsx` | Replace hardcoded form labels, buttons, validation messages |

## Translation Key Structure (`messages/en.json`)

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "vaccinations": "Vaccinations",
    "weight": "Weight",
    "vetVisits": "Vet Visits",
    "more": "More"
  },
  "more": {
    "title": "More",
    "sections": { "dobby": "Dobby", "app": "App" },
    "food": { "label": "Food & Diet", "description": "Current food and feeding history" },
    "medications": { "label": "Medications", "description": "Dewormings, flea treatment and more" },
    "milestones": { "label": "Milestones", "description": "First walks, tricks and memories" },
    "documents": { "label": "Documents", "description": "Insurance, certificates and vet records" },
    "profile": { "label": "Profile", "description": "Dobby's details and household members" },
    "settings": { "label": "Settings", "description": "Language & preferences" }
  },
  "settings": {
    "title": "Settings",
    "language": {
      "sectionLabel": "Language",
      "autoSave": "Changes save automatically",
      "en": "English",
      "pt": "Português (Portugal)"
    }
  },
  "dashboard": { ... },
  "vaccinations": { ... },
  "weight": { ... },
  "vetVisits": { ... },
  "food": { ... },
  "medications": { ... },
  "milestones": { ... },
  "documents": { ... },
  "profile": { ... },
  "login": { ... },
  "common": {
    "back": "Back",
    "save": "Save",
    "cancel": "Cancel",
    "add": "Add",
    "loading": "Loading...",
    "error": "Something went wrong",
    "empty": "Nothing here yet"
  }
}
```

*(Full key lists are defined during implementation by reading each page.)*

## Settings Page (`/settings`)

- Server component fetches user and passes current locale to `SettingsClient`
- `SettingsClient` renders two radio rows: 🇬🇧 English / 🇵🇹 Português (Portugal)
- Selecting a row calls the `setLanguage` server action immediately (no Save button)
- Below the list: small caption "Changes save automatically" (translated)
- Back navigation via `BackButton` component (already exists)
- Accessible from More → App → Settings

## More Page Changes

Current structure: one flat card with 5 items.

New structure:
```
Section label: pet name fetched from Supabase (dynamic, not a translation key)
└── Card: Food & Diet, Medications, Milestones, Documents, Profile

Section label: "App"  (translation key: more.sections.app)
└── Card: Settings  (accent-coloured icon, links to /settings)
```

## `i18n/request.ts`

```ts
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'en';
  const validLocale = ['en', 'pt'].includes(locale) ? locale : 'en';

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  };
});
```

## `lib/actions/settings.ts`

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export type Locale = 'en' | 'pt';

export async function setLanguage(locale: Locale) {
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { language: locale } });
  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, { maxAge: 60 * 60 * 24 * 365, path: '/' });
  revalidatePath('/', 'layout');
}
```

## Locale Sync in `app/layout.tsx`

On every server render, read `user.user_metadata.language` and set/refresh the cookie so Supabase is always the source of truth even if the cookie is missing (e.g. new device). Wrap with `NextIntlClientProvider`:

```tsx
const locale = await getLocale();
const messages = await getMessages();
// ...sync cookie from Supabase metadata if they differ...
return (
  <html lang={locale}>
    <body>
      <NextIntlClientProvider messages={messages} locale={locale}>
        {children}
      </NextIntlClientProvider>
    </body>
  </html>
);
```

## Dependency

```bash
npm install next-intl
```

## Verification

1. `npm run dev` — app loads in English
2. Navigate to More → Settings
3. Select Português — page re-renders immediately in Portuguese (nav, page titles, labels all change)
4. Refresh — Portuguese is still active (cookie persists)
5. Open a private/incognito window and log in — Portuguese is still active (synced from Supabase)
6. Switch back to English — app re-renders in English
7. `npm run build` — no TypeScript errors, build succeeds
