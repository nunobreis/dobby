# Onboarding Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show first-time users a 5-slide fullscreen carousel after login (before profile setup) explaining the app's main features, with an EN/PT language toggle on every slide.

**Architecture:** A new `/onboarding` client-side-only page holds all carousel state locally. The middleware gains an onboarding gate (before the existing membership gate) that redirects unauthenticated users who haven't seen onboarding. A server action persists `onboarding_seen: true` to Supabase user metadata on skip/finish. A "How it works" link in the More page makes the carousel revisitable.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase Auth (user metadata), next-intl (for More page link label only — slide content uses a client-side constant for instant language switching)

---

## File Map

| Status | File | Change |
|--------|------|--------|
| Create | `app/onboarding/page.tsx` | Full carousel client component |
| Create | `lib/actions/onboarding.ts` | `markOnboardingSeen` server action |
| Modify | `middleware.ts` | Add onboarding gate before membership gate |
| Modify | `app/more/page.tsx` | Add "How it works" link to App section |
| Modify | `messages/en.json` | Add `onboarding` namespace (UI chrome + more link) |
| Modify | `messages/pt.json` | Same keys in Portuguese |

---

## Task 1: Add translation keys

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/pt.json`

- [ ] **Step 1: Add `onboarding` namespace to `messages/en.json`**

Open `messages/en.json`. Add this block before the closing `}` of the top-level object (after the last existing namespace):

```json
  "onboarding": {
    "skip": "Skip",
    "next": "Next",
    "getStarted": "Get started",
    "howItWorks": "How it works",
    "howItWorksDescription": "Take a tour of the app"
  }
```

Also add `howItWorks` and `howItWorksDescription` to the existing `more` namespace in `en.json` (after `"settingsDescription"`):

```json
    "howItWorksLabel": "How it works",
    "howItWorksDescription": "Take a tour of the app"
```

- [ ] **Step 2: Add same keys to `messages/pt.json`**

Add this block before the closing `}` of the top-level object in `messages/pt.json`:

```json
  "onboarding": {
    "skip": "Saltar",
    "next": "Próximo",
    "getStarted": "Começar",
    "howItWorks": "Como funciona",
    "howItWorksDescription": "Explora as funcionalidades da app"
  }
```

Also add to the existing `more` namespace in `pt.json` (after `"settingsDescription"`):

```json
    "howItWorksLabel": "Como funciona",
    "howItWorksDescription": "Explora as funcionalidades da app"
```

- [ ] **Step 3: Verify no syntax errors**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en.json OK')"
node -e "JSON.parse(require('fs').readFileSync('messages/pt.json','utf8')); console.log('pt.json OK')"
```

Expected output:
```
en.json OK
pt.json OK
```

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/pt.json
git commit -m "feat: add onboarding translation keys"
```

---

## Task 2: Create `markOnboardingSeen` server action

**Files:**
- Create: `lib/actions/onboarding.ts`

- [ ] **Step 1: Create the file**

```ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function markOnboardingSeen() {
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { onboarding_seen: true } });
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/onboarding.ts
git commit -m "feat: add markOnboardingSeen server action"
```

---

## Task 3: Create the onboarding carousel page

**Files:**
- Create: `app/onboarding/page.tsx`

- [ ] **Step 1: Create `app/onboarding/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setLanguage } from "@/lib/actions/settings";
import { markOnboardingSeen } from "@/lib/actions/onboarding";

type Locale = "en" | "pt";

const SLIDES: Record<Locale, { icon: string; title: string; desc: string }[]> = {
  en: [
    { icon: "🐾", title: "Welcome to Dobby", desc: "Everything you need to look after your dog, in one place." },
    { icon: "💉", title: "Health Records", desc: "Log vaccinations, track weight, and keep a full history of every vet visit." },
    { icon: "🍖", title: "Daily Care", desc: "Track food, diet changes, and medications — all in one place." },
    { icon: "📸", title: "Memories & Docs", desc: "Capture milestones and store important documents like insurance and certificates." },
    { icon: "🤖", title: "AI Vet", desc: "Ask questions about your dog's health and get instant answers from our AI vet." },
  ],
  pt: [
    { icon: "🐾", title: "Bem-vindo ao Dobby", desc: "Tudo o que precisas para cuidar do teu cão, num só lugar." },
    { icon: "💉", title: "Registos de Saúde", desc: "Regista vacinas, acompanha o peso e guarda o histórico de visitas ao veterinário." },
    { icon: "🍖", title: "Cuidados Diários", desc: "Acompanha a alimentação, mudanças de dieta e medicamentos — tudo num só lugar." },
    { icon: "📸", title: "Memórias e Documentos", desc: "Guarda momentos especiais e documentos importantes como seguros e certificados." },
    { icon: "🤖", title: "Veterinário IA", desc: "Faz perguntas sobre a saúde do teu cão e recebe respostas imediatas do nosso veterinário IA." },
  ],
};

const LABELS: Record<Locale, { skip: string; next: string; getStarted: string }> = {
  en: { skip: "Skip", next: "Next", getStarted: "Get started" },
  pt: { skip: "Saltar", next: "Próximo", getStarted: "Começar" },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [locale, setLocale] = useState<Locale>("en");
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const slides = SLIDES[locale];
  const labels = LABELS[locale];
  const isLast = current === slides.length - 1;

  async function handleLanguageToggle(next: Locale) {
    setLocale(next);
    await setLanguage(next);
  }

  async function handleFinish() {
    await markOnboardingSeen();
    router.push("/profile/setup");
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const delta = touchStart - e.changedTouches[0].clientX;
    if (delta > 50 && current < slides.length - 1) setCurrent((c) => c + 1);
    if (delta < -50 && current > 0) setCurrent((c) => c - 1);
    setTouchStart(null);
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col px-6 pt-12 pb-10"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-[#E0E0E0] rounded-[10px] p-0.5">
          {(["en", "pt"] as const).map((l) => (
            <button
              key={l}
              onClick={() => handleLanguageToggle(l)}
              className={`text-[10px] font-bold px-3 py-1 rounded-[7px] transition-colors ${
                locale === l ? "bg-accent text-white" : "text-text-secondary"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {!isLast && (
          <button
            onClick={handleFinish}
            className="text-sm font-semibold text-text-secondary"
          >
            {labels.skip}
          </button>
        )}
      </div>

      {/* Slide content */}
      <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center py-10">
        <div className="w-24 h-24 bg-white rounded-[28px] flex items-center justify-center text-5xl shadow-sm">
          {slides[current].icon}
        </div>
        <div className="space-y-3 px-2">
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            {slides[current].title}
          </h1>
          <p className="text-[14px] text-text-secondary leading-relaxed">
            {slides[current].desc}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === current ? "w-5 bg-accent" : "w-1.5 bg-lavender"
              }`}
            />
          ))}
        </div>
        <button
          onClick={isLast ? handleFinish : () => setCurrent((c) => c + 1)}
          className="w-full bg-accent text-white font-bold text-[15px] rounded-pill py-4"
        >
          {isLast ? labels.getStarted : labels.next}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat: add onboarding carousel page"
```

---

## Task 4: Update middleware to add the onboarding gate

**Files:**
- Modify: `middleware.ts`

The current middleware has this block starting at line 62:

```ts
if (pathname !== "/profile/setup") {
  const { data: membership } = await supabase
    .from("puppy_members")
    .select("puppy_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(new URL("/profile/setup", request.url));
  }
}
```

- [ ] **Step 1: Replace the membership gate block with the new two-gate block**

Replace the entire block above with:

```ts
// Onboarding gate: redirect unseen users to /onboarding before anything else
if (pathname !== "/onboarding" && pathname !== "/profile/setup") {
  const onboardingSeen = user.user_metadata?.onboarding_seen === true;
  if (!onboardingSeen) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
}

// Membership gate: redirect users with no puppy to profile setup
if (pathname !== "/profile/setup" && pathname !== "/onboarding") {
  const { data: membership } = await supabase
    .from("puppy_members")
    .select("puppy_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(new URL("/profile/setup", request.url));
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual verification plan**

After pushing to Vercel, verify these flows work:

1. **New user (no `onboarding_seen`):** Log in → should land on `/onboarding`. Tap through all 5 slides → tap "Get started" → lands on `/profile/setup`. Subsequent logins go straight to `/dashboard`.

2. **Language toggle:** On any onboarding slide, tap `PT` → all text switches to Portuguese instantly. Navigate forward — text stays Portuguese. Log out and back in → app opens in Portuguese (cookie was set).

3. **Skip:** On slide 2, tap "Skip" → lands on `/profile/setup`. Skip should mark onboarding as seen (same as finishing).

4. **Partner joining:** Partner clicks invite link, logs in → sees `/onboarding` → taps "Get started" → lands on `/profile/setup` → joins household → redirects to `/dashboard`.

5. **Existing users unaffected:** Any user who already has `onboarding_seen: true` (or who was set up before this feature) goes straight to `/dashboard` as before.

> **Note for existing users:** Users created before this feature ship will not have `onboarding_seen` in their metadata. They will be shown the onboarding carousel on their next login. This is acceptable — it's a one-time mild inconvenience to introduce them to features they may have missed.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: add onboarding gate to middleware"
```

---

## Task 5: Add "How it works" link to the More page

**Files:**
- Modify: `app/more/page.tsx`

- [ ] **Step 1: Add `Info` to the lucide-react import**

In `app/more/page.tsx`, find the existing import:

```ts
import {
  UtensilsCrossed,
  Pill,
  Trophy,
  FileText,
  PawPrint,
  ChevronRight,
  Settings,
  Stethoscope,
  CalendarDays,
  Bot,
} from "lucide-react";
```

Replace with:

```ts
import {
  UtensilsCrossed,
  Pill,
  Trophy,
  FileText,
  PawPrint,
  ChevronRight,
  Settings,
  Stethoscope,
  CalendarDays,
  Bot,
  Info,
} from "lucide-react";
```

- [ ] **Step 2: Add the translation key read**

The page already calls `const t = await getTranslations("more");`. No change needed there — the `howItWorksLabel` and `howItWorksDescription` keys added in Task 1 are available via `t("howItWorksLabel")` etc.

- [ ] **Step 3: Add the "How it works" link after the Settings link in the App section**

Find the existing App section JSX (the `<div className="bg-white rounded-card overflow-hidden">` that wraps the Settings link). The current content is:

```tsx
        <div className="bg-white rounded-card overflow-hidden">
          <Link href="/settings">
            <div className="flex items-center gap-4 px-4 py-4 active:bg-[#F5F5F5] transition-colors">
              <div className="w-10 h-10 rounded-[12px] bg-accent flex items-center justify-center shrink-0">
                <Settings size={18} className="text-white" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[15px] font-semibold text-text-primary">
                  {t("settingsLabel")}
                </span>
                <span className="text-[12px] text-text-secondary">
                  {t("settingsDescription")}
                </span>
              </div>
              <ChevronRight size={16} className="text-[#AEAEAE] shrink-0" />
            </div>
          </Link>
        </div>
```

Replace with:

```tsx
        <div className="bg-white rounded-card overflow-hidden">
          <Link href="/settings">
            <div className="flex items-center gap-4 px-4 py-4 border-b border-[#F0F0F0] active:bg-[#F5F5F5] transition-colors">
              <div className="w-10 h-10 rounded-[12px] bg-accent flex items-center justify-center shrink-0">
                <Settings size={18} className="text-white" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[15px] font-semibold text-text-primary">
                  {t("settingsLabel")}
                </span>
                <span className="text-[12px] text-text-secondary">
                  {t("settingsDescription")}
                </span>
              </div>
              <ChevronRight size={16} className="text-[#AEAEAE] shrink-0" />
            </div>
          </Link>
          <Link href="/onboarding">
            <div className="flex items-center gap-4 px-4 py-4 active:bg-[#F5F5F5] transition-colors">
              <div className="w-10 h-10 rounded-[12px] bg-lavender flex items-center justify-center shrink-0">
                <Info size={18} className="text-accent" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[15px] font-semibold text-text-primary">
                  {t("howItWorksLabel")}
                </span>
                <span className="text-[12px] text-text-secondary">
                  {t("howItWorksDescription")}
                </span>
              </div>
              <ChevronRight size={16} className="text-[#AEAEAE] shrink-0" />
            </div>
          </Link>
        </div>
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit and push**

```bash
git add app/more/page.tsx
git commit -m "feat: add How it works link to More page"
git push
```

---

## Self-Review Checklist

- [x] **5 slides defined** — in `SLIDES` constant in `app/onboarding/page.tsx`
- [x] **EN/PT toggle on every slide** — top-left bar, always rendered, calls `setLanguage` + updates local state
- [x] **Skip on all slides except last** — `{!isLast && <button onClick={handleFinish}>...}`, Skip calls `markOnboardingSeen` + pushes to `/profile/setup`
- [x] **Get started on last slide** — `isLast ? handleFinish : () => setCurrent(...)` on the bottom button
- [x] **Swipe support** — `onTouchStart` / `onTouchEnd` with 50px threshold
- [x] **Middleware gate** — fires before membership check, skips `/onboarding` and `/profile/setup`
- [x] **`onboarding_seen` persisted** — `markOnboardingSeen` calls `supabase.auth.updateUser`
- [x] **Revisitable from More** — "How it works" link added to App section, no flag check on the page itself
- [x] **Translation keys complete** — both `en.json` and `pt.json` have `onboarding` namespace and `more.howItWorksLabel`/`more.howItWorksDescription`
- [x] **App theme** — `bg-background` (#EFEFEF), white icon card, `text-text-primary`, `bg-accent`, `rounded-pill`, `bg-lavender` dots
