# AI Vet — Data-Aware Chat + Record Mutations

**Date:** 2026-06-19
**Status:** Approved

## Context

The AI Vet chat currently only receives high-level summaries (e.g. "vaccination status: up to date", "active meds: NexGard") — not actual records with dates or details. When a user asks "when was Dobby's last rabies shot?" the AI cannot answer. Additionally, the AI has no ability to add records; users must leave the chat and navigate to a form page.

This spec covers two related improvements:
1. Make the AI aware of the full record history (all vaccinations, vet visits, weight entries, medications)
2. Allow the AI to propose new records through chat, with an in-chat confirmation step before saving

Editing existing records is explicitly out of scope for this phase but will be tackled in a follow-up.

---

## Architecture

### Data flow change (read)

**Before:** `page.tsx` fetches summary data → passes as `DogContext` to client → client sends with every message → API route builds summary prompt.

**After:** API route fetches all records itself on each request, using the authenticated user's cookie. The client sends only `{ messages }` — no context payload. This ensures the AI always sees fresh data (including records added in the same session).

### Mutation flow (write)

1. AI calls a tool (`addVaccination`, `addVetVisit`, `addWeightEntry`, `addMedication`)
2. Tool `execute` returns the proposed args — nothing is saved
3. AI SDK streams the tool result to the client as a `tool-invocation` message part
4. Client renders an inline `ConfirmationCard` for that tool result
5. User clicks **Confirm & Save** → calls a server action → record inserted → card shows success
6. User clicks **Dismiss** → card hides, no save

---

## Files to change

### `app/api/chat/route.ts`
- Remove `DogContext` import from request body
- Add Supabase fetches: all vaccinations, all vet visits, all weight entries (last 20), all active medications, current food, puppy profile
- Get locale from `user.user_metadata.language` directly
- Rewrite system prompt to inject full structured record history (with IDs included, needed for future edit support)
- Add `tools` to `streamText`: `addVaccination`, `addVetVisit`, `addWeightEntry`, `addMedication`
- Add `maxSteps: 2` to allow the model to call a tool and then produce a follow-up text response in one turn
- Remove `DogContext` export (no longer needed by client)

**System prompt record format:**
```
Vaccination records (N total):
- [id: abc123] Rabies: given 2025-06-10, next due 2026-06-10, at City Vet
- [id: def456] DHPP: given 2025-03-01, next due 2026-03-01

Vet visits (N total):
- [id: ghi789] 2026-05-20: Annual checkup at City Vet — All healthy

Weight history (last 20 entries):
- 2026-06-01: 28.5 kg

Active medications:
- [id: jkl012] NexGard (flea/tick): 1 chew monthly, since 2025-01-15
```

**Tool definitions:**
```typescript
addVaccination: {
  description: "Propose adding a vaccination record when the user wants to log one.",
  parameters: z.object({
    vaccine_name: z.string(),
    date_given: z.string(),         // YYYY-MM-DD
    next_due_date: z.string().optional(),
    vet_clinic: z.string().optional(),
    batch_number: z.string().optional(),
    notes: z.string().optional(),
  }),
  execute: async (args) => args,
}

addVetVisit: {
  parameters: z.object({
    date: z.string(),
    reason: z.string(),
    vet_clinic: z.string().optional(),
    outcome: z.string().optional(),
    cost: z.number().optional(),
    notes: z.string().optional(),
  }),
  execute: async (args) => args,
}

addWeightEntry: {
  parameters: z.object({
    date: z.string(),
    weight_kg: z.number(),
    notes: z.string().optional(),
  }),
  execute: async (args) => args,
}

addMedication: {
  parameters: z.object({
    name: z.string(),
    medication_type: z.enum(["deworming", "flea_tick", "antibiotic", "other"]).optional(),
    dosage: z.string().optional(),
    frequency: z.string().optional(),
    start_date: z.string(),
    end_date: z.string().optional(),
    prescribed_by: z.string().optional(),
    notes: z.string().optional(),
  }),
  execute: async (args) => args,
}
```

**System prompt addition for mutations:**
```
When the user asks to add a vaccination, vet visit, weight entry, or medication:
- Use the appropriate tool to propose the record.
- Do not confirm in plain text first — call the tool immediately.
- If the user asks to edit an existing record, explain that editing is not yet supported via chat and suggest using the app's edit page directly.
```

### `app/ai-vet/page.tsx`
- Remove all data fetches except: puppy name (for welcome UI) and display name
- Pass only `{ puppyName, displayName }` to `AiVetClient`
- Remove `DogContext` import

### `app/ai-vet/AiVetClient.tsx`
- Remove `context` prop and `DogContext` type — props become `{ puppyName: string; displayName: string }`
- Remove `context` from `DefaultChatTransport` body — send only `{ messages }`
- Add `isStaticToolUIPart` import from `ai`
- Extend message part renderer: alongside `isTextUIPart`, check `isStaticToolUIPart`
  - When `part.state === "output-available"`: render `<ConfirmationCard toolName={part.type} args={part.input} />`
  - When state is `"input-streaming"` or `"input-available"`: render nothing (typing indicator covers this)

### `app/ai-vet/ConfirmationCard.tsx` (new)
Client component. Props:
```typescript
interface Props {
  toolName: string;  // e.g. "tool-addVaccination" (the ToolUIPart type value)
  args: Record<string, unknown>;  // the tool's input fields
}
```

States: `idle` → `saving` → `saved | error`

UI:
- White card with `rounded-card` padding, left border in accent colour
- Header: record type label ("Add Vaccination", "Add Vet Visit", etc.)
- Field rows: human-readable label + formatted value (dates formatted with `formatDate` from `lib/utils`)
- Two buttons: **Dismiss** (text, secondary) and **Confirm & Save** (filled, accent)
- Saved state: green checkmark + "Saved!" + link to list page (`/vaccinations`, `/vet-visits`, etc.)
- Error state: red inline message, buttons reappear

### `lib/actions/ai-records.ts` (new)
Four `"use server"` functions: `saveAiVaccination`, `saveAiVetVisit`, `saveAiWeightEntry`, `saveAiMedication`.

Each function:
1. `const supabase = await createClient()`
2. `const { data: { user } } = await supabase.auth.getUser()` — return error if not authenticated
3. Look up `puppy_id` via `puppy_members`
4. Insert record with `created_by: user.id`
5. `revalidatePath('/vaccinations')` (or relevant path)
6. Return `{ success: true }` or `{ error: string }`

---

## Translations

No new translation keys needed. The confirmation card uses English/Portuguese labels derived from the tool name and field names (can be hardcoded inline since they are few and stable).

---

## Future work (out of scope)

- **Edit existing records via chat** — tool calls will include `record_id` targeting a specific row; IDs are already embedded in the system prompt context for when this is built
- **Milestones and documents** — lower priority, can follow the same pattern

---

## Verification

1. Ask the AI "when was Dobby's last vaccination?" — AI should respond with the actual vaccine name and date
2. Ask "add a rabies vaccination given today, next due in a year" — AI should call `addVaccination`, a confirmation card should appear in the chat
3. Click **Confirm & Save** — record appears in `/vaccinations` list, card shows success state
4. Click **Dismiss** on a second test — card disappears, no record added
5. Ask to edit a record — AI should respond explaining editing is not yet supported via chat
6. Switch locale to Portuguese — AI should respond in Portuguese, all behaviour unchanged
