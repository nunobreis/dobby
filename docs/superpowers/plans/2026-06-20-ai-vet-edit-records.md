# AI Vet — Edit Existing Records via Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to edit existing health records (vaccinations, vet visits, weight entries, medications) through the AI Vet chat, with an in-chat confirmation card before any write occurs.

**Architecture:** Four new `update*` server actions use `.update().eq("id",...).eq("puppy_id",...)` for ownership-safe writes. Four new `update*` tools in the API route let the AI propose edits. ConfirmationCard gains TOOL_META entries for update tools, ID_FIELDS exclusion from display, and routing for the new actions.

**Tech Stack:** Next.js 14.2 App Router, TypeScript, Supabase, AI SDK v6 (`ai`, `@ai-sdk/anthropic`), `tool()` + `jsonSchema()` from `ai`, `"use server"` server actions

---

### Task 1: Add update server actions to `lib/actions/ai-records.ts`

**Files:**
- Modify: `lib/actions/ai-records.ts`

- [ ] **Step 1: Add the four update functions**

Append the following four exports after the existing `saveAiMedication` function. The pattern is identical to the save actions but uses `.update()` instead of `.insert()`, includes the record ID field, skips `puppy_id` and `created_by` in the update payload, and verifies ownership via `.eq("puppy_id", ids.puppyId)`. The `.select("id")` + zero-rows check is the security gate — if the ID doesn't belong to this puppy, no rows are updated.

```typescript
export async function updateAiVaccination(data: {
  vaccination_id: string;
  vaccine_name: string;
  date_given: string;
  next_due_date?: string;
  vet_clinic?: string;
  batch_number?: string;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const ids = await getPuppyId();
  if (!ids) return { error: "Not authenticated" };

  const { data: updated, error } = await supabase
    .from("vaccinations")
    .update({
      vaccine_name: data.vaccine_name,
      date_given: data.date_given,
      next_due_date: data.next_due_date ?? null,
      vet_clinic: data.vet_clinic ?? null,
      batch_number: data.batch_number ?? null,
      notes: data.notes ?? null,
    })
    .eq("id", data.vaccination_id)
    .eq("puppy_id", ids.puppyId)
    .select("id");

  if (error) return { error: error.message };
  if (!updated || updated.length === 0) return { error: "Record not found or access denied" };
  revalidatePath("/vaccinations");
  return { success: true };
}

export async function updateAiVetVisit(data: {
  vet_visit_id: string;
  date: string;
  reason: string;
  vet_clinic?: string;
  outcome?: string;
  cost?: number;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const ids = await getPuppyId();
  if (!ids) return { error: "Not authenticated" };

  const { data: updated, error } = await supabase
    .from("vet_visits")
    .update({
      date: data.date,
      reason: data.reason,
      vet_clinic: data.vet_clinic ?? null,
      outcome: data.outcome ?? null,
      cost: data.cost ?? null,
      notes: data.notes ?? null,
    })
    .eq("id", data.vet_visit_id)
    .eq("puppy_id", ids.puppyId)
    .select("id");

  if (error) return { error: error.message };
  if (!updated || updated.length === 0) return { error: "Record not found or access denied" };
  revalidatePath("/vet-visits");
  return { success: true };
}

export async function updateAiWeightEntry(data: {
  weight_entry_id: string;
  date: string;
  weight_kg: number;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const ids = await getPuppyId();
  if (!ids) return { error: "Not authenticated" };

  const { data: updated, error } = await supabase
    .from("weight_entries")
    .update({
      date: data.date,
      weight_kg: data.weight_kg,
      notes: data.notes ?? null,
    })
    .eq("id", data.weight_entry_id)
    .eq("puppy_id", ids.puppyId)
    .select("id");

  if (error) return { error: error.message };
  if (!updated || updated.length === 0) return { error: "Record not found or access denied" };
  revalidatePath("/weight");
  return { success: true };
}

export async function updateAiMedication(data: {
  medication_id: string;
  name: string;
  start_date: string;
  medication_type?: "deworming" | "flea_tick" | "antibiotic" | "other";
  dosage?: string;
  frequency?: string;
  end_date?: string;
  prescribed_by?: string;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const ids = await getPuppyId();
  if (!ids) return { error: "Not authenticated" };

  const { data: updated, error } = await supabase
    .from("medications")
    .update({
      name: data.name,
      start_date: data.start_date,
      medication_type: data.medication_type ?? null,
      dosage: data.dosage ?? null,
      frequency: data.frequency ?? null,
      end_date: data.end_date ?? null,
      prescribed_by: data.prescribed_by ?? null,
      notes: data.notes ?? null,
    })
    .eq("id", data.medication_id)
    .eq("puppy_id", ids.puppyId)
    .select("id");

  if (error) return { error: error.message };
  if (!updated || updated.length === 0) return { error: "Record not found or access denied" };
  revalidatePath("/medications");
  return { success: true };
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/ai-records.ts
git commit -m "feat: add update server actions for AI vet edit records"
```

---

### Task 2: Add update tools and update system prompt in `app/api/chat/route.ts`

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Update the system prompt**

Find this line in the system prompt string (around line 144):
```
- If the user asks to edit an existing record, explain that editing via chat is not yet supported and suggest using the app directly.
```

Replace it with:
```
- When the user asks to edit or update an existing record, use the appropriate updateVaccination, updateVetVisit, updateWeightEntry, or updateMedication tool, providing the full updated record including all current field values plus the requested change. Call the tool immediately — do not confirm in text first.
```

- [ ] **Step 2: Add the four update tools**

Inside the `tools:` object in `streamText`, after the closing of `addMedication` and before the closing `}` of `tools:`, add the four update tools. Each uses the same `tool<INPUT, OUTPUT>()` pattern with `inputSchema: jsonSchema<T>()` and `execute: async (input) => input`.

```typescript
      updateVaccination: tool<
        {
          vaccination_id: string;
          vaccine_name: string;
          date_given: string;
          next_due_date?: string;
          vet_clinic?: string;
          batch_number?: string;
          notes?: string;
        },
        {
          vaccination_id: string;
          vaccine_name: string;
          date_given: string;
          next_due_date?: string;
          vet_clinic?: string;
          batch_number?: string;
          notes?: string;
        }
      >({
        description:
          "Propose updating an existing vaccination record. Use when the user asks to edit or change a vaccination.",
        inputSchema: jsonSchema<{
          vaccination_id: string;
          vaccine_name: string;
          date_given: string;
          next_due_date?: string;
          vet_clinic?: string;
          batch_number?: string;
          notes?: string;
        }>({
          type: "object",
          properties: {
            vaccination_id: { type: "string", description: "ID of the vaccination to update (from the record list)" },
            vaccine_name: { type: "string", description: "Name of the vaccine" },
            date_given: { type: "string", description: "Date given in YYYY-MM-DD format" },
            next_due_date: { type: "string", description: "Next due date in YYYY-MM-DD format" },
            vet_clinic: { type: "string", description: "Name of the vet clinic" },
            batch_number: { type: "string", description: "Batch or lot number" },
            notes: { type: "string", description: "Any additional notes" },
          },
          required: ["vaccination_id", "vaccine_name", "date_given"],
        }),
        execute: async (input) => input,
      }),
      updateVetVisit: tool<
        {
          vet_visit_id: string;
          date: string;
          reason: string;
          vet_clinic?: string;
          outcome?: string;
          cost?: number;
          notes?: string;
        },
        {
          vet_visit_id: string;
          date: string;
          reason: string;
          vet_clinic?: string;
          outcome?: string;
          cost?: number;
          notes?: string;
        }
      >({
        description:
          "Propose updating an existing vet visit record. Use when the user asks to edit or change a vet visit.",
        inputSchema: jsonSchema<{
          vet_visit_id: string;
          date: string;
          reason: string;
          vet_clinic?: string;
          outcome?: string;
          cost?: number;
          notes?: string;
        }>({
          type: "object",
          properties: {
            vet_visit_id: { type: "string", description: "ID of the vet visit to update (from the record list)" },
            date: { type: "string", description: "Date of visit in YYYY-MM-DD format" },
            reason: { type: "string", description: "Reason for the visit" },
            vet_clinic: { type: "string", description: "Name of the vet clinic" },
            outcome: { type: "string", description: "Outcome or diagnosis" },
            cost: { type: "number", description: "Cost of the visit" },
            notes: { type: "string", description: "Any additional notes" },
          },
          required: ["vet_visit_id", "date", "reason"],
        }),
        execute: async (input) => input,
      }),
      updateWeightEntry: tool<
        {
          weight_entry_id: string;
          date: string;
          weight_kg: number;
          notes?: string;
        },
        {
          weight_entry_id: string;
          date: string;
          weight_kg: number;
          notes?: string;
        }
      >({
        description:
          "Propose updating an existing weight entry. Use when the user asks to edit or change a weight measurement.",
        inputSchema: jsonSchema<{
          weight_entry_id: string;
          date: string;
          weight_kg: number;
          notes?: string;
        }>({
          type: "object",
          properties: {
            weight_entry_id: { type: "string", description: "ID of the weight entry to update (from the record list)" },
            date: { type: "string", description: "Date of measurement in YYYY-MM-DD format" },
            weight_kg: { type: "number", description: "Weight in kilograms" },
            notes: { type: "string", description: "Any additional notes" },
          },
          required: ["weight_entry_id", "date", "weight_kg"],
        }),
        execute: async (input) => input,
      }),
      updateMedication: tool<
        {
          medication_id: string;
          name: string;
          start_date: string;
          medication_type?: "deworming" | "flea_tick" | "antibiotic" | "other";
          dosage?: string;
          frequency?: string;
          end_date?: string;
          prescribed_by?: string;
          notes?: string;
        },
        {
          medication_id: string;
          name: string;
          start_date: string;
          medication_type?: "deworming" | "flea_tick" | "antibiotic" | "other";
          dosage?: string;
          frequency?: string;
          end_date?: string;
          prescribed_by?: string;
          notes?: string;
        }
      >({
        description:
          "Propose updating an existing medication record. Use when the user asks to edit or change a medication.",
        inputSchema: jsonSchema<{
          medication_id: string;
          name: string;
          start_date: string;
          medication_type?: "deworming" | "flea_tick" | "antibiotic" | "other";
          dosage?: string;
          frequency?: string;
          end_date?: string;
          prescribed_by?: string;
          notes?: string;
        }>({
          type: "object",
          properties: {
            medication_id: { type: "string", description: "ID of the medication to update (from the record list)" },
            name: { type: "string", description: "Name of the medication" },
            start_date: { type: "string", description: "Start date in YYYY-MM-DD format" },
            medication_type: {
              type: "string",
              enum: ["deworming", "flea_tick", "antibiotic", "other"],
              description: "Type of medication",
            },
            dosage: { type: "string", description: "Dosage information" },
            frequency: { type: "string", description: "How often to give the medication" },
            end_date: { type: "string", description: "End date in YYYY-MM-DD format if applicable" },
            prescribed_by: { type: "string", description: "Name of the prescribing vet" },
            notes: { type: "string", description: "Any additional notes" },
          },
          required: ["medication_id", "name", "start_date"],
        }),
        execute: async (input) => input,
      }),
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add update tools to AI vet chat route"
```

---

### Task 3: Update ConfirmationCard to handle update tools

**Files:**
- Modify: `app/ai-vet/ConfirmationCard.tsx`

- [ ] **Step 1: Add update imports**

At the top of the file, the current import from `@/lib/actions/ai-records` is:
```typescript
import {
  saveAiVaccination,
  saveAiVetVisit,
  saveAiWeightEntry,
  saveAiMedication,
} from "@/lib/actions/ai-records";
```

Replace it with:
```typescript
import {
  saveAiVaccination,
  saveAiVetVisit,
  saveAiWeightEntry,
  saveAiMedication,
  updateAiVaccination,
  updateAiVetVisit,
  updateAiWeightEntry,
  updateAiMedication,
} from "@/lib/actions/ai-records";
```

- [ ] **Step 2: Add `ID_FIELDS` constant and update `TOOL_META`**

After the existing `DATE_FIELDS` constant (line 41–47), add:
```typescript
const ID_FIELDS = new Set([
  "vaccination_id",
  "vet_visit_id",
  "weight_entry_id",
  "medication_id",
]);
```

Replace the current `TOOL_META` constant (lines 49–54) with:
```typescript
const TOOL_META: Record<string, { title: string; href: string }> = {
  addVaccination:    { title: "Add Vaccination",    href: "/vaccinations" },
  addVetVisit:       { title: "Add Vet Visit",       href: "/vet-visits" },
  addWeightEntry:    { title: "Add Weight Entry",    href: "/weight" },
  addMedication:     { title: "Add Medication",      href: "/medications" },
  updateVaccination: { title: "Update Vaccination",  href: "/vaccinations" },
  updateVetVisit:    { title: "Update Vet Visit",    href: "/vet-visits" },
  updateWeightEntry: { title: "Update Weight Entry", href: "/weight" },
  updateMedication:  { title: "Update Medication",   href: "/medications" },
};
```

- [ ] **Step 3: Update `displayFields` to exclude ID fields**

Find the current `displayFields` line:
```typescript
  const displayFields = Object.entries(args).filter(
    ([, v]) => v !== undefined && v !== null
  );
```

Replace it with:
```typescript
  const displayFields = Object.entries(args).filter(
    ([key, v]) => v !== undefined && v !== null && !ID_FIELDS.has(key)
  );
```

- [ ] **Step 4: Add update branches to `handleConfirm`**

The current `handleConfirm` ends with:
```typescript
      } else {
        result = await saveAiMedication(
          args as Parameters<typeof saveAiMedication>[0]
        );
      }
```

Replace that final `else` branch with:
```typescript
      } else if (toolName === "addMedication") {
        result = await saveAiMedication(
          args as Parameters<typeof saveAiMedication>[0]
        );
      } else if (toolName === "updateVaccination") {
        result = await updateAiVaccination(
          args as Parameters<typeof updateAiVaccination>[0]
        );
      } else if (toolName === "updateVetVisit") {
        result = await updateAiVetVisit(
          args as Parameters<typeof updateAiVetVisit>[0]
        );
      } else if (toolName === "updateWeightEntry") {
        result = await updateAiWeightEntry(
          args as Parameters<typeof updateAiWeightEntry>[0]
        );
      } else {
        result = await updateAiMedication(
          args as Parameters<typeof updateAiMedication>[0]
        );
      }
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit and push**

```bash
git add app/ai-vet/ConfirmationCard.tsx
git commit -m "feat: add update tool support to ConfirmationCard"
git push
```

---

### Task 4: Verify on Vercel

After `git push`, Vercel deploys automatically. Open the deployed app and verify:

- [ ] Ask "Update Dobby's rabies vaccination next due date to next year" — AI should call `updateVaccination` with the correct `vaccination_id` from context; a confirmation card should appear showing all fields except the ID
- [ ] Click **Confirm & Save** — card shows "Saved!" with "View records" link
- [ ] Navigate to `/vaccinations` — updated next due date is reflected
- [ ] Ask "Change my last weight entry to 29 kg" — AI identifies the most recent entry by ID and proposes the update
- [ ] Ask to edit a record with a fabricated ID — action returns an error, card shows the error message
- [ ] Verify add flows still work — existing addVaccination, addVetVisit, addWeightEntry, addMedication tools unaffected
