# Onboarding Carousel Design

**Date:** 2026-06-22  
**Status:** Approved

---

## Overview

A first-time onboarding experience for new Dobby users: a 5-slide fullscreen carousel shown after login, before profile setup. Covers the app's main features. Includes an EN/PT language toggle on every slide so Portuguese users can switch immediately. Accessible again from the More page after the first run.

---

## User Flow

```
Login → /onboarding → /profile/setup → /dashboard
```

- Triggers for **all** new users: both owners (who will set up Dobby's profile) and partners (who join an existing household and skip profile setup).
- After the user taps "Get started" or "Skip": set `onboarding_seen: true` in Supabase user metadata, then redirect to `/profile/setup`.
- Revisitable at any time via More → "How it works" — the page renders regardless of the `onboarding_seen` flag.

---

## Slides

| # | Icon | Title (EN) | Title (PT) | Content (EN) | Content (PT) |
|---|------|-----------|-----------|--------------|--------------|
| 1 | 🐾 | Welcome to Dobby | Bem-vindo ao Dobby | Everything you need to look after your dog, in one place. | Tudo o que precisas para cuidar do teu cão, num só lugar. |
| 2 | 💉 | Health Records | Registos de Saúde | Log vaccinations, track weight, and keep a full history of every vet visit. | Regista vacinas, acompanha o peso e guarda o histórico de visitas ao veterinário. |
| 3 | 🍖 | Daily Care | Cuidados Diários | Track food, diet changes, and medications — all in one place. | Acompanha a alimentação, mudanças de dieta e medicamentos — tudo num só lugar. |
| 4 | 📸 | Memories & Docs | Memórias e Documentos | Capture milestones and store important documents like insurance and certificates. | Guarda momentos especiais e documentos importantes como seguros e certificados. |
| 5 | 🤖 | AI Vet | Veterinário IA | Ask questions about your dog's health and get instant answers from our AI vet. | Faz perguntas sobre a saúde do teu cão e recebe respostas imediatas do nosso veterinário IA. |

---

## Visual Design

Matches the existing app theme exactly:

- **Background:** `#EFEFEF` (`bg-background`)
- **Icon card:** white, `rounded-card` (20px), soft shadow
- **Title:** `text-primary` (`#1A1A1A`), 20px bold
- **Description:** `text-secondary` (`#7A7A7A`), 13px
- **Progress dots:** inactive = `bg-lavender` (`#D5C9F0`), active = `bg-accent` (`#8B5CF6`), active dot expands to pill shape
- **Next / Get started button:** full-width, `bg-accent`, `rounded-pill` (28px)
- **Skip:** top-right, `text-secondary`, hidden on slide 5

---

## Language Toggle

- Visible on **every slide**, top-left corner
- A segmented control: `EN | PT`
- Active language shown with `bg-accent` background and white text; inactive is `text-secondary` on transparent
- Switching language:
  1. Calls the existing `setLanguage` server action → updates `auth.users.raw_user_meta_data.language` + sets `NEXT_LOCALE` cookie
  2. Updates local React state to re-render all slide content in the new language immediately
- Slide text is defined as a client-side constant object keyed by locale (not fetched via `useTranslations`, since we need instant client-side switching without a page reload)
- By the time the user reaches `/profile/setup`, the cookie is already set and the rest of the app renders in the chosen language

---

## Architecture

### New files

- `app/onboarding/page.tsx` — client component, renders the carousel

### Modified files

- `middleware.ts` — add redirect rule: if user is authenticated + `onboarding_seen` is not `true` in user metadata + destination is any protected route other than `/onboarding` or `/profile/setup` → redirect to `/onboarding` first. Also add `/onboarding` to the list of routes that don't require `puppy_members` (alongside `/profile/setup`).
- `app/more/page.tsx` — add "How it works" link that navigates to `/onboarding`
- `messages/en.json` — add `onboarding` namespace (slide titles + descriptions + button labels)
- `messages/pt.json` — same keys in Portuguese

### State tracking

- `onboarding_seen: true` stored in `auth.users.raw_user_meta_data` (same pattern as `language`)
- Set via a server action in `lib/actions/onboarding.ts` that calls `supabase.auth.updateUser({ data: { onboarding_seen: true } })`
- Middleware reads this flag on each request (already has access to session metadata)

### Navigation behaviour

- "Next" advances the slide index (local state)
- "Skip" and "Get started" both call the `markOnboardingSeen` server action then `router.push('/profile/setup')`
- Left/right swipe support via `touchstart` / `touchend` listeners (swipe threshold: 50px)

---

## More Page Link

- Added under an **App** section in `/more`
- Label: "How it works" (EN) / "Como funciona" (PT)
- Icon: `Info` from lucide-react
- Links to `/onboarding` — no flag check, always accessible

---

## Translation Keys

Slide titles and descriptions are **not** sourced from the message files — they are defined as a client-side constant in `app/onboarding/page.tsx` (keyed by locale) so language switching is instant without a page reload.

The message files only need the UI chrome and the More page link:

**`en.json`**
```json
"onboarding": {
  "skip": "Skip",
  "next": "Next",
  "getStarted": "Get started",
  "howItWorks": "How it works"
}
```

**`pt.json`**
```json
"onboarding": {
  "skip": "Saltar",
  "next": "Próximo",
  "getStarted": "Começar",
  "howItWorks": "Como funciona"
}
```
