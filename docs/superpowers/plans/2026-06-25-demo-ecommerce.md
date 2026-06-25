# Demo Ecommerce Product Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add inline branded product cards to the AI Vet chat on a `demo/ecommerce` branch, so that when the AI answers food/training/toy questions it naturally mentions products by name and surfaces clickable Amazon cards inside its bubble.

**Architecture:** A `DEMO_ECOMMERCE` flag gates everything. When true, the system prompt instructs the AI to append a `[PRODUCTS:category]` signal token at the end of relevant responses. A parser strips that token from the displayed text on every render pass (including mid-stream) and returns the matching product category. The AI bubble then renders inline product cards below its text using a hardcoded product catalogue.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase, AI SDK (`useChat` / `streamText`), `next/image`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/demo/config.ts` | Create | `DEMO_ECOMMERCE` boolean flag |
| `lib/demo/products.ts` | Create | Typed product catalogue + `PRODUCTS_BY_CATEGORY` map |
| `lib/demo/parse-product-signal.ts` | Create | Strips `[PRODUCTS:category]` token from AI text |
| `components/demo/ProductCard.tsx` | Create | Inline product card rendered inside AI bubble |
| `public/demo/products/.gitkeep` | Create | Placeholder for user-provided product photos |
| `app/api/chat/route.ts` | Modify | Inject system prompt addendum when flag is true |
| `app/ai-vet/AiVetClient.tsx` | Modify | Run parser on AI text; render `ProductCard` when category found |

---

## Task 1: Create demo branch and config flag

**Files:**
- Create: `lib/demo/config.ts`

- [ ] **Step 1: Create the branch**

```bash
git checkout -b demo/ecommerce
```

Expected: prompt changes to `demo/ecommerce`

- [ ] **Step 2: Create the config file**

Create `lib/demo/config.ts`:

```ts
export const DEMO_ECOMMERCE = true;
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add lib/demo/config.ts
git commit -m "feat(demo): add demo ecommerce feature flag"
```

---

## Task 2: Build the product catalogue

**Files:**
- Create: `lib/demo/products.ts`
- Create: `public/demo/products/.gitkeep`

- [ ] **Step 1: Create the products directory placeholder**

```bash
mkdir -p public/demo/products && touch public/demo/products/.gitkeep
```

- [ ] **Step 2: Create `lib/demo/products.ts`**

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
  description: string;
  imagePath: string;   // path relative to /public, e.g. "/demo/products/pedigree-bites.jpg"
  amazonUrl: string;
  category: ProductCategory;
};

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: 'pedigree-training-bites',
    name: 'Pedigree Training Bites',
    description: 'Chicken · 125g · Low calorie',
    imagePath: '/demo/products/pedigree-training-bites.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=pedigree+training+bites',
    category: 'training-treats',
  },
  {
    id: 'royal-canin-mini-treats',
    name: 'Royal Canin Mini Treats',
    description: 'Liver flavour · 90g · Vet recommended',
    imagePath: '/demo/products/royal-canin-mini-treats.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=royal+canin+mini+treats',
    category: 'training-treats',
  },
  {
    id: 'hills-science-plan-puppy',
    name: "Hill's Science Plan Puppy",
    description: 'Chicken · 3kg · Complete nutrition',
    imagePath: '/demo/products/hills-science-plan-puppy.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=hills+science+plan+puppy',
    category: 'daily-food',
  },
  {
    id: 'yumove-joint-supplement',
    name: 'YuMOVE Joint Supplement',
    description: 'Tablets · 60 count · With glucosamine',
    imagePath: '/demo/products/yumove-joint-supplement.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=yumove+joint+supplement+dog',
    category: 'supplements',
  },
  {
    id: 'pedigree-dentastix',
    name: 'Pedigree Dentastix',
    description: 'Daily dental chews · 28 sticks · Medium/Large',
    imagePath: '/demo/products/pedigree-dentastix.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=pedigree+dentastix',
    category: 'dental',
  },
  {
    id: 'kong-classic',
    name: 'KONG Classic',
    description: 'Natural rubber · Stuffable · Size L',
    imagePath: '/demo/products/kong-classic.jpg',
    amazonUrl: 'https://www.amazon.com/s?k=kong+classic+dog+toy+large',
    category: 'toys',
  },
];

export const PRODUCTS_BY_CATEGORY: Record<ProductCategory, DemoProduct[]> = {
  'training-treats': DEMO_PRODUCTS.filter(p => p.category === 'training-treats'),
  'daily-food':      DEMO_PRODUCTS.filter(p => p.category === 'daily-food'),
  'supplements':     DEMO_PRODUCTS.filter(p => p.category === 'supplements'),
  'dental':          DEMO_PRODUCTS.filter(p => p.category === 'dental'),
  'toys':            DEMO_PRODUCTS.filter(p => p.category === 'toys'),
};
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add lib/demo/products.ts public/demo/products/.gitkeep
git commit -m "feat(demo): add product catalogue with 6 seed products"
```

---

## Task 3: Write the response parser

**Files:**
- Create: `lib/demo/parse-product-signal.ts`

- [ ] **Step 1: Create `lib/demo/parse-product-signal.ts`**

```ts
import type { ProductCategory } from './products';

const SIGNAL_REGEX = /\[PRODUCTS:(training-treats|daily-food|supplements|dental|toys)\]/;
const PARTIAL_SIGNAL_REGEX = /\[PRODUCTS:[^\]]*$/;

export function parseProductSignal(text: string): {
  cleanText: string;
  category: ProductCategory | null;
} {
  const match = text.match(SIGNAL_REGEX);
  const cleanText = text
    .replace(SIGNAL_REGEX, '')
    .replace(PARTIAL_SIGNAL_REGEX, '')
    .trimEnd();
  return {
    cleanText,
    category: match ? (match[1] as ProductCategory) : null,
  };
}
```

`SIGNAL_REGEX` matches the completed token and extracts the category. `PARTIAL_SIGNAL_REGEX` strips any incomplete `[PRODUCTS:...` that is still streaming in — this prevents the token from ever flashing on screen.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Manually verify parser logic in your head**

Check three cases:
- `"Get some Pedigree Training Bites.[PRODUCTS:training-treats]"` → `cleanText = "Get some Pedigree Training Bites."`, `category = "training-treats"`
- `"Get some Pedigree Training Bites.[PRODUCTS:training"` (partial) → `cleanText = "Get some Pedigree Training Bites."`, `category = null`
- `"Just some general advice."` → `cleanText = "Just some general advice."`, `category = null`

- [ ] **Step 4: Commit**

```bash
git add lib/demo/parse-product-signal.ts
git commit -m "feat(demo): add product signal parser for AI response tokens"
```

---

## Task 4: Build the ProductCard component

**Files:**
- Create: `components/demo/ProductCard.tsx`

- [ ] **Step 1: Create `components/demo/ProductCard.tsx`**

```tsx
'use client';

import type { DemoProduct } from '@/lib/demo/products';

interface Props {
  products: DemoProduct[];
  puppyName: string;
}

export default function ProductCard({ products, puppyName }: Props) {
  if (products.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="h-px bg-[#F0EDF8] mb-3" />
      <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-accent mb-2">
        Recommended for {puppyName}
      </p>
      <div className="flex flex-col gap-2">
        {products.slice(0, 3).map((product) => (
          <a
            key={product.id}
            href={product.amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#F8F6FF] rounded-[12px] p-3 no-underline"
          >
            <div className="w-12 h-12 rounded-[10px] overflow-hidden bg-lavender flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imagePath}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-text-primary truncate">{product.name}</p>
              <p className="text-[11px] text-text-secondary mt-0.5">{product.description}</p>
              <p className="text-[11px] font-semibold text-accent mt-1">Shop on Amazon →</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

Note: Using a plain `<img>` instead of `next/image` to avoid needing domain config, with an `onError` that hides the image element if the photo file isn't present yet (shows the lavender background instead).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/demo/ProductCard.tsx
git commit -m "feat(demo): add inline ProductCard component for chat"
```

---

## Task 5: Inject system prompt addendum

**Files:**
- Modify: `app/api/chat/route.ts`

The current file builds `systemPrompt` as a `const` template literal ending at line 165 with `` Always respond in ${language}.` ``. Add the `demoAddendum` variable before it and interpolate at the end.

- [ ] **Step 1: Add the import for `DEMO_ECOMMERCE` near the top of `app/api/chat/route.ts`**

Find the existing imports block at the top of the file and add:

```ts
import { DEMO_ECOMMERCE } from '@/lib/demo/config';
```

- [ ] **Step 2: Add `demoAddendum` variable just before the `systemPrompt` const**

Find the line that begins `const systemPrompt = \`You are "Dobby"` (line ~137). Insert this block immediately before it:

```ts
const demoAddendum = DEMO_ECOMMERCE ? `

## Product recommendations (demo mode)

You have access to a curated product catalogue organised into these categories:
- training-treats: small, low-calorie treats ideal for training sessions
- daily-food: complete dry or wet food for everyday feeding
- supplements: joint, coat, or digestive health supplements
- dental: dental chews or toothpaste
- toys: enrichment and play toys

When your response naturally calls for a product recommendation (e.g. the user asks about training treats, food brands, dental health, enrichment, or toys), do both of the following:
1. Mention the product(s) by name in your response text, as a natural recommendation.
2. Append exactly one signal token at the very end of your message: [PRODUCTS:category]
   where category is one of the five values above.

Only emit the token when a product recommendation is genuinely useful. Do not emit it on every message.
Do not mention the token to the user. Do not explain what it is.` : '';
```

- [ ] **Step 3: Interpolate `demoAddendum` at the end of `systemPrompt`**

The last line of the `systemPrompt` template literal currently reads:

```ts
Always respond in ${language}.`;
```

Change it to:

```ts
Always respond in ${language}.${demoAddendum}`;
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat(demo): inject product recommendation addendum into AI system prompt"
```

---

## Task 6: Wire parser and cards into AiVetClient

**Files:**
- Modify: `app/ai-vet/AiVetClient.tsx`

The key render block is the `isTextUIPart` branch starting at line 190. For assistant (`!isUser`) messages, replace `part.text` with `cleanText` and conditionally append `<ProductCard>`.

- [ ] **Step 1: Add imports at the top of `app/ai-vet/AiVetClient.tsx`**

After the existing imports, add:

```ts
import { DEMO_ECOMMERCE } from '@/lib/demo/config';
import { parseProductSignal } from '@/lib/demo/parse-product-signal';
import { PRODUCTS_BY_CATEGORY } from '@/lib/demo/products';
import ProductCard from '@/components/demo/ProductCard';
```

- [ ] **Step 2: Replace the assistant text render block**

Find the `isTextUIPart` branch (around line 190–218). The current inner render for non-user messages is:

```tsx
<div
  className={`max-w-[80%] px-4 py-3 text-[14px] leading-relaxed ${
    isUser
      ? "bg-accent text-white rounded-[18px_18px_4px_18px] whitespace-pre-wrap"
      : "bg-white text-text-primary rounded-[18px_18px_18px_4px]"
  }`}
>
  {isUser ? (
    part.text
  ) : (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
      }}
    >
      {part.text}
    </ReactMarkdown>
  )}
</div>
```

Replace the entire `isTextUIPart` branch return with:

```tsx
if (isTextUIPart(part) && part.text) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div key={i} className="flex justify-end">
        <div className="max-w-[80%] px-4 py-3 text-[14px] leading-relaxed bg-accent text-white rounded-[18px_18px_4px_18px] whitespace-pre-wrap">
          {part.text}
        </div>
      </div>
    );
  }

  const { cleanText, category } = parseProductSignal(part.text);
  const recommendedProducts = DEMO_ECOMMERCE && category ? PRODUCTS_BY_CATEGORY[category] : [];

  return (
    <div key={i} className="flex justify-start">
      <div className="max-w-[80%] px-4 py-3 text-[14px] leading-relaxed bg-white text-text-primary rounded-[18px_18px_18px_4px]">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
          }}
        >
          {cleanText}
        </ReactMarkdown>
        {recommendedProducts.length > 0 && (
          <ProductCard products={recommendedProducts} puppyName={puppyName} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/ai-vet/AiVetClient.tsx
git commit -m "feat(demo): wire product parser and inline cards into AI Vet chat"
```

---

## Task 7: Smoke test and push

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

Open http://localhost:3000 in a browser. Note: auth redirect URLs are configured to the Vercel deployment URL — you won't be able to sign in locally. Skip to Step 2 (deploy to Vercel for testing).

- [ ] **Step 2: Push to Vercel**

```bash
git push -u origin demo/ecommerce
```

Vercel will auto-deploy the `demo/ecommerce` branch. Open the preview URL from the Vercel dashboard.

- [ ] **Step 3: Sign in and open AI Vet**

Navigate to the AI Vet chat page on the preview deployment.

- [ ] **Step 4: Test a training question**

Send: `"I am training my dog, which treats should I give him?"`

Expected:
- AI response mentions a product by name (e.g. "Pedigree Training Bites")
- Inline product cards appear below the AI text inside the bubble
- "Recommended for Dobby" label in purple
- "Shop on Amazon →" links are clickable and open amazon.com

- [ ] **Step 5: Test a non-product question**

Send: `"How many times a day should I feed Dobby?"`

Expected: Normal AI response with no product cards.

- [ ] **Step 6: Test each remaining category**

Send one question per category to verify all five product categories surface correctly:
- `"What daily food do you recommend for a Golden Retriever?"` → `daily-food` products
- `"Are there any joint supplements I should give Dobby?"` → `supplements` products
- `"How do I keep Dobby's teeth clean?"` → `dental` products
- `"What toys are good for keeping Dobby entertained?"` → `toys` products

- [ ] **Step 7: Add product photos (optional, do before live demo)**

Drop product photos into `public/demo/products/` matching the `imagePath` values in `lib/demo/products.ts` (e.g. `pedigree-training-bites.jpg`). Commit and push. Without photos, the lavender placeholder background shows instead — acceptable fallback.

```bash
git add public/demo/products/
git commit -m "feat(demo): add product photos for pitch"
git push
```
