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
  text,
  files: [{ type: "file", mediaType: file.type || "image/jpeg", url: base64DataUrl }],
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
