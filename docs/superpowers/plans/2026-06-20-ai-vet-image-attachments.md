# AI Vet Image Attachments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a paperclip button to the AI Vet chat input so users can attach a photo (HEIC-safe, compressed) and ask Claude vision questions about their dog.

**Architecture:** All changes are in `app/ai-vet/AiVetClient.tsx`. Image is processed client-side (HEIC → JPEG via heic2any → compressed via browser-image-compression → base64 data URL), sent via `sendMessage()` experimental_attachments, rendered as a thumbnail in the user's message bubble, and stripped from localStorage before persisting.

**Tech Stack:** `heic2any` (already installed), `browser-image-compression` (already installed), `@ai-sdk/react` v3 `useChat` / `sendMessage`, `lucide-react` Paperclip icon, Tailwind CSS.

---

## File Map

| File | Change |
|---|---|
| `docs/superpowers/specs/2026-06-20-ai-vet-image-attachments-design.md` | Create — spec document |
| `app/ai-vet/AiVetClient.tsx` | Modify — all feature changes live here |

No other files change. `app/api/chat/route.ts` already handles image parts via `convertToModelMessages()`.

---

### Task 1: Write the spec file

**Files:**
- Create: `docs/superpowers/specs/2026-06-20-ai-vet-image-attachments-design.md`

- [ ] **Step 1: Create the spec file**

```markdown
# AI Vet — Image Attachments in Chat

**Date:** 2026-06-20
**Status:** Approved

## Context

The AI Vet chat supports text only. Users want to take a photo of something on their dog's body (skin, bumps, eyes, coat) and ask Claude for an opinion in-chat. Claude Haiku 4.5 supports vision. `heic2any` and `browser-image-compression` are already installed. All changes are contained to `AiVetClient.tsx`; the API route is unchanged.

---

## Decisions

| Question | Decision |
|---|---|
| Photo + text or photo alone? | Both work. Empty text with image is valid. |
| Persistence | Session-only. Images stripped from localStorage to avoid 5MB cap. |
| Photos per message | One. |
| HEIC/HEIF | Convert via `heic2any` (same pattern as `DocumentUpload.tsx`) before compression. |

---

## Architecture

### What changes

**`app/ai-vet/AiVetClient.tsx`** — all changes live here:
- Attachment button + hidden file input
- HEIC detection + conversion
- Image compression
- Base64 encoding
- Input preview thumbnail with remove button
- `sendMessage()` updated to include `experimental_attachments`
- Message rendering updated to display file parts above text
- localStorage save logic strips file parts before persisting

**`app/api/chat/route.ts`** — no changes. `convertToModelMessages()` already handles image parts for Anthropic.

---

## Detailed Design

### 1. Input bar UI

`Paperclip` icon (lucide-react) to the left of the textarea triggers a hidden `<input type="file" accept="image/*">` (no `capture` — lets iOS offer Camera / Photo Library sheet).

On file select:
1. **HEIC check:** if `file.type === "image/heic"` / `"image/heif"` or filename ends `.heic`/`.heif`, convert via `heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 })`. Fall back to original on error.
2. **Compress:** `browser-image-compression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true })`.
3. **Preview:** 56×56px rounded thumbnail above the input with × to remove.
4. Send button active when image pending (even with empty text).

### 2. Sending

```typescript
sendMessage({
  text: inputValue.trim(),
  experimental_attachments: [
    { contentType: "image/jpeg", url: base64DataUrl }
  ]
});
```

Empty text is valid — Claude responds naturally to image-only messages given the system prompt context.

### 3. LocalStorage

Strip file parts before persisting to stay under 5MB:

```typescript
const toSave = messages.map(msg => ({
  ...msg,
  parts: msg.parts.filter(p => p.type !== "file")
}));
localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
```

### 4. Message rendering

Image renders above text in user bubble:

```typescript
if (part.type === "file" && msg.role === "user") {
  return (
    <div key={i} className="flex justify-end">
      <img src={part.url} alt="Attached photo" className="max-w-[80%] max-h-48 rounded-[18px_18px_4px_18px] object-cover" />
    </div>
  );
}
```

---

## Verification

- Tap paperclip → select HEIC from library → no error, thumbnail appears
- Send photo + text → both visible in bubble, Claude references image
- Send photo alone → Claude responds naturally, no injected text in bubble
- Reload → text persists, image gone (session-only)
- localStorage stays under 5MB after heavy photo session
- `npx tsc --noEmit` — no type errors
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-06-20-ai-vet-image-attachments-design.md
git commit -m "docs: add AI vet image attachments spec"
```

---

### Task 2: Add image processing utilities + state to AiVetClient

**Files:**
- Modify: `app/ai-vet/AiVetClient.tsx`

- [ ] **Step 1: Add imports**

At the top of `app/ai-vet/AiVetClient.tsx`, update the import block:

```typescript
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart, isStaticToolUIPart } from "ai";
import type { UIMessage } from "ai";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, Paperclip, Send, SquarePen, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import ConfirmationCard from "./ConfirmationCard";
```

- [ ] **Step 2: Add `isHeicFile` helper and `processImageFile` utility**

Add these two functions directly below the `CHAT_STORAGE_KEY` constant (before the `Props` interface):

```typescript
const CHAT_STORAGE_KEY = "dobby-ai-vet-messages";

function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  );
}

async function processImageFile(file: File): Promise<File> {
  let workingFile = file;

  if (isHeicFile(file)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      workingFile = new File(
        [blob],
        file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg"),
        { type: "image/jpeg" }
      );
    } catch {
      // fall back to original
    }
  }

  const compressed = await imageCompression(workingFile, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
  return compressed as File;
}

async function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 3: Add `pendingImage` state and `fileInputRef` inside the component**

Inside `AiVetClient`, after the existing `useState` and `useRef` declarations (around line 24–27), add:

```typescript
const fileInputRef = useRef<HTMLInputElement>(null);
const [pendingImage, setPendingImage] = useState<{
  file: File;
  previewUrl: string;
} | null>(null);
const [processingImage, setProcessingImage] = useState(false);
```

- [ ] **Step 4: Add `handleFileSelect` and `handleClearImage` handlers**

Add these handlers inside the component, just below `handleNewChat`:

```typescript
const handleClearImage = () => {
  if (pendingImage) {
    URL.revokeObjectURL(pendingImage.previewUrl);
  }
  setPendingImage(null);
  if (fileInputRef.current) fileInputRef.current.value = "";
};

const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setProcessingImage(true);
  try {
    const processed = await processImageFile(file);
    setPendingImage({
      file: processed,
      previewUrl: URL.createObjectURL(processed),
    });
  } catch {
    // silently ignore — user can retry
  } finally {
    setProcessingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};
```

- [ ] **Step 5: Verify TypeScript — no errors yet**

```bash
cd /Users/satoridigital/Development/2026/00_PERSONAL_WORK/dobby && npx tsc --noEmit
```

Expected: 0 errors (utilities are defined but not yet used — that's fine, TS won't error on unused functions).

- [ ] **Step 6: Commit**

```bash
git add app/ai-vet/AiVetClient.tsx
git commit -m "feat: add image processing utilities and state to AiVetClient"
```

---

### Task 3: Add attachment button and thumbnail preview to input bar

**Files:**
- Modify: `app/ai-vet/AiVetClient.tsx`

- [ ] **Step 1: Replace the fixed input bar JSX**

Find the `{/* Fixed input bar */}` section (currently starts around line 254). Replace the entire section with:

```tsx
{/* Fixed input bar */}
<div className="fixed bottom-24 lg:bottom-0 left-0 right-0 lg:left-[220px] bg-white border-t border-[#F0F0F0] px-4 py-3">
  {/* Pending image preview */}
  {pendingImage && (
    <div className="mb-2 flex items-center gap-2">
      <div className="relative w-14 h-14 shrink-0">
        <img
          src={pendingImage.previewUrl}
          alt="Attachment preview"
          className="w-14 h-14 rounded-[10px] object-cover"
        />
        <button
          type="button"
          onClick={handleClearImage}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1A1A1A] rounded-full flex items-center justify-center"
        >
          <X size={11} className="text-white" />
        </button>
      </div>
    </div>
  )}

  <div className="flex items-end gap-3">
    {/* Attachment button */}
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={isLoading || processingImage}
      className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors disabled:opacity-40 shrink-0"
    >
      {processingImage ? (
        <div className="w-5 h-5 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
      ) : (
        <Paperclip size={20} className="text-text-secondary" />
      )}
    </button>

    {/* Hidden file input */}
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleFileSelect}
      className="hidden"
    />

    <textarea
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={t("inputPlaceholder", { name: puppyName })}
      rows={1}
      disabled={isLoading}
      className="flex-1 bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 resize-none max-h-32 disabled:opacity-50 leading-snug"
      style={{ minHeight: "48px" }}
    />
    <button
      onClick={handleSend}
      disabled={(!inputValue.trim() && !pendingImage) || isLoading}
      className="w-11 h-11 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
    >
      <Send size={18} className="text-white" />
    </button>
  </div>
</div>
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/satoridigital/Development/2026/00_PERSONAL_WORK/dobby && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/ai-vet/AiVetClient.tsx
git commit -m "feat: add attachment button and image preview to AI vet input bar"
```

---

### Task 4: Wire sendMessage to include the image attachment

**Files:**
- Modify: `app/ai-vet/AiVetClient.tsx`

- [ ] **Step 1: Verify `sendMessage` experimental_attachments API via context7**

Before writing the send logic, confirm the exact `sendMessage` signature for `@ai-sdk/react` v3. Use context7 to query the AI SDK docs:

> Query: "useChat sendMessage experimental_attachments file image attachment" for library `@ai-sdk/react`

The expected signature (verify this matches):
```typescript
sendMessage({
  text?: string;
  experimental_attachments?: Array<{ name?: string; contentType?: string; url: string }>;
})
```

If the API differs from above, adjust Step 2 accordingly.

- [ ] **Step 2: Replace `handleSend` with the attachment-aware version**

Find the current `handleSend` function and replace it entirely:

```typescript
const handleSend = async () => {
  const text = inputValue.trim();
  if ((!text && !pendingImage) || isLoading) return;

  let attachments: Array<{ contentType: string; url: string }> | undefined;

  if (pendingImage) {
    const dataUrl = await fileToBase64DataUrl(pendingImage.file);
    attachments = [{ contentType: "image/jpeg", url: dataUrl }];
    URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  setInputValue("");
  sendMessage({
    text,
    ...(attachments ? { experimental_attachments: attachments } : {}),
  });
};
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/satoridigital/Development/2026/00_PERSONAL_WORK/dobby && npx tsc --noEmit
```

If TypeScript complains about `experimental_attachments` not existing on the `sendMessage` argument type, cast it:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
sendMessage({ text, ...(attachments ? { experimental_attachments: attachments } : {}) } as any);
```

(This cast is acceptable while the AI SDK types catch up — the runtime behaviour is correct.)

- [ ] **Step 4: Commit**

```bash
git add app/ai-vet/AiVetClient.tsx
git commit -m "feat: wire image attachment into sendMessage in AI vet chat"
```

---

### Task 5: Render image parts in message bubbles + strip from localStorage

**Files:**
- Modify: `app/ai-vet/AiVetClient.tsx`

- [ ] **Step 1: Add image part rendering in the message loop**

In the message rendering section, find the `msg.parts.map((part, i) => {` block. After the `isTextUIPart` check and before the `isStaticToolUIPart` check, add:

```tsx
// Render image/file parts (user-sent photos)
if (part.type === "file" && msg.role === "user") {
  return (
    <div key={i} className="flex justify-end">
      <img
        src={"url" in part ? (part.url as string) : ""}
        alt="Attached photo"
        className="max-w-[80%] max-h-48 rounded-[18px_18px_4px_18px] object-cover"
      />
    </div>
  );
}
```

The full `parts.map` block should now be in this order:
1. `isTextUIPart` → text bubble
2. `part.type === "file"` → image bubble
3. `isStaticToolUIPart` → ConfirmationCard
4. `return null` fallthrough

- [ ] **Step 2: Update the localStorage save effect to strip image parts**

Find the `useEffect` that saves to localStorage (currently around line 52–57):

```typescript
useEffect(() => {
  if (messages.length === 0) return;
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}, [messages]);
```

Replace with:

```typescript
useEffect(() => {
  if (messages.length === 0) return;
  try {
    const toSave = messages.map((msg) => ({
      ...msg,
      parts: msg.parts.filter((p) => p.type !== "file"),
    }));
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}, [messages]);
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/satoridigital/Development/2026/00_PERSONAL_WORK/dobby && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/ai-vet/AiVetClient.tsx
git commit -m "feat: render image parts in AI vet chat bubbles and strip from localStorage"
```

---

### Task 6: End-to-end verification

- [ ] **Step 1: Push and open on a real device (or Chrome DevTools mobile emulation)**

```bash
git push
```

Open the Vercel preview URL on your iPhone or in Chrome DevTools (toggle mobile mode, iPhone 15 Pro dimensions).

- [ ] **Step 2: Test HEIC photo from library**

Navigate to AI Vet → tap the paperclip icon → "Photo Library" → pick any existing photo (HEIC format on iPhone). Confirm:
- Spinner appears briefly while processing
- 56×56px thumbnail appears above the input
- × button on thumbnail works (clears it)

- [ ] **Step 3: Test photo + text message**

Type "What is this on Dobby's skin?" → attach a photo → send. Confirm:
- User bubble shows the image (above any text)
- Claude's response references or describes what it sees
- Typing indicator appears while Claude responds

- [ ] **Step 4: Test photo-only message**

Attach a photo with no text → send. Confirm:
- User bubble shows only the image (no text below it)
- Claude responds naturally describing what it sees

- [ ] **Step 5: Test persistence behaviour**

Send a few text messages, then a photo+text. Reload the page. Confirm:
- Text messages reappear
- The photo is gone (session-only — this is correct behaviour)

- [ ] **Step 6: Final TypeScript check**

```bash
cd /Users/satoridigital/Development/2026/00_PERSONAL_WORK/dobby && npx tsc --noEmit
```

Expected: 0 errors.
