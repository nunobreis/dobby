# Demo: Ecommerce Product Recommendations in AI Vet Chat

**Date:** 2026-06-25
**Branch:** `demo/ecommerce`
**Purpose:** Demonstration feature for pitching to pet food brands and retailers. Not for production.

---

## Overview

When a user asks the AI Vet a question related to food, training treats, supplements, dental care, or toys, the AI surfaces branded product recommendations inline inside its chat bubble. The AI mentions the product naturally in its response text, and a small card with a photo and Amazon link appears below the text — all within the same message bubble.

---

## Architecture

Three components work together:

1. **Product catalogue** — a typed config file listing all demo products, grouped by category
2. **System prompt addendum** — tells the AI about product categories and instructs it to emit a signal token when a product is relevant
3. **Response parser + inline card** — strips the signal token from the displayed text and renders product cards inside the AI bubble

Everything demo-specific is namespaced under `lib/demo/` and `components/demo/` so it can never accidentally reach `main`.

---

## Product Catalogue

**File:** `lib/demo/products.ts`

```ts
export type ProductCategory =
  | 'training-treats'
  | 'daily-food'
  | 'supplements'
  | 'dental'
  | 'toys';

export type DemoProduct = {
  id: string;
  name: string;
  description: string; // e.g. "Chicken · 125g · Low calorie"
  imagePath: string;   // relative to /public, e.g. "/demo/products/pedigree-bites.jpg"
  amazonUrl: string;
  category: ProductCategory;
};

export const DEMO_PRODUCTS: DemoProduct[] = [ /* populated before each pitch */ ];

export const PRODUCTS_BY_CATEGORY: Record<ProductCategory, DemoProduct[]> = {
  'training-treats': DEMO_PRODUCTS.filter(p => p.category === 'training-treats'),
  'daily-food':      DEMO_PRODUCTS.filter(p => p.category === 'daily-food'),
  'supplements':     DEMO_PRODUCTS.filter(p => p.category === 'supplements'),
  'dental':          DEMO_PRODUCTS.filter(p => p.category === 'dental'),
  'toys':            DEMO_PRODUCTS.filter(p => p.category === 'toys'),
};
```

Product photos go in `public/demo/products/`. The user provides photos before each demo.

---

## System Prompt Addendum

Appended to the existing system prompt in `app/api/chat/route.ts` when the demo flag is active.

```
## Product recommendations (demo mode)

You have access to a curated product catalogue organised into these categories:
- training-treats: small, low-calorie treats ideal for training sessions
- daily-food: complete dry or wet food for everyday feeding
- supplements: joint, coat, or digestive health supplements
- dental: dental chews or toothpaste
- toys: enrichment and play toys

When your response naturally calls for a product recommendation (e.g. the user asks about training treats, food brands, dental health, enrichment), do both of the following:
1. Mention the product(s) by name in your response text, as a natural recommendation.
2. Append exactly one signal token at the very end of your message: [PRODUCTS:category]
   where category is one of the five values above.

Only emit the token when a product recommendation is genuinely useful. Do not emit it on every message.
Do not mention the token to the user. Do not explain what it is.
```

The demo flag is a boolean constant `DEMO_ECOMMERCE = true` in `lib/demo/config.ts`. When false, the addendum is not appended and no product logic runs.

---

## Response Parser

**File:** `lib/demo/parse-product-signal.ts`

```ts
const SIGNAL_REGEX = /\[PRODUCTS:(training-treats|daily-food|supplements|dental|toys)\]/;

export function parseProductSignal(text: string): {
  cleanText: string;
  category: ProductCategory | null;
} {
  const match = text.match(SIGNAL_REGEX);
  return {
    cleanText: text.replace(SIGNAL_REGEX, '').trimEnd(),
    category: match ? (match[1] as ProductCategory) : null,
  };
}
```

Called once after the AI stream completes, before the message is stored in state.

---

## Inline Product Card Component

**File:** `components/demo/ProductCard.tsx`

A client component. Renders inside the AI bubble below the response text, separated by a subtle divider and a small "Recommended for [puppyName]" label in accent purple.

Each card shows:
- Product photo (from `imagePath`)
- Product name (bold)
- Description (secondary text)
- "Shop on Amazon →" link (opens in new tab, goes to `amazonUrl`)

Cards stack vertically. Max 2–3 products per category to keep the bubble compact.

---

## Chat Render Change

**File:** `app/ai-vet/AiVetClient.tsx`

The display text for every assistant message is passed through `parseProductSignal` on every render pass (not just post-stream). This ensures the `[PRODUCTS:...]` token is never visible to the user even as it streams in character-by-character.

1. During streaming: `cleanText` is displayed live; the token is stripped as soon as it appears in the partial content
2. After stream completes: `category` is non-null if a token was found — look up `PRODUCTS_BY_CATEGORY[category]` and render `<ProductCard>` components below the message text inside the bubble
3. If `DEMO_ECOMMERCE` is false or `category` is null, the message renders as a normal AI response

No structural changes to the streaming setup — only the render output is affected.

---

## File Map

| File | Purpose |
|---|---|
| `lib/demo/config.ts` | `DEMO_ECOMMERCE` boolean flag |
| `lib/demo/products.ts` | Product catalogue + `PRODUCTS_BY_CATEGORY` map |
| `lib/demo/parse-product-signal.ts` | Strips `[PRODUCTS:category]` token from AI text |
| `components/demo/ProductCard.tsx` | Inline product card UI |
| `public/demo/products/` | User-provided product photos |
| `app/api/chat/route.ts` | System prompt addendum (conditioned on `DEMO_ECOMMERCE`) |
| `app/ai-vet/AiVetClient.tsx` | Post-stream parsing + card rendering |

---

## Branch Strategy

- Branch `demo/ecommerce` cut from `main`
- All changes are confined to `lib/demo/`, `components/demo/`, `public/demo/`, and minimal targeted edits to `AiVetClient.tsx` and `route.ts`
- `main` is never affected
- To prep for a pitch: update `DEMO_PRODUCTS` in `lib/demo/products.ts` and drop photos into `public/demo/products/`
