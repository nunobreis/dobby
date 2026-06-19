# AI Vet — Edit Existing Records via Chat

**Date:** 2026-06-19
**Status:** Approved

## Context

The AI Vet chat can now add new health records (vaccinations, vet visits, weight entries, medications) and is aware of Dobby's full record history. Record IDs are already embedded in the system prompt as `[id:abc123]`, giving the AI everything it needs to target specific records for updates.

This spec adds the ability to edit existing records through chat. The AI reads the current values from context, proposes the full updated record, and the user confirms via the existing in-chat confirmation card before any write occurs.

Editing was explicitly deferred from the previous phase; this is the follow-up spec.

---

## Architecture

### What changes

**`app/api/chat/route.ts`**
- Remove the system prompt instruction: "If the user asks to edit an existing record, explain that editing via chat is not yet supported and suggest using the app directly."
- Add instruction: "When the user asks to edit or update an existing record, use the appropriate `update*` tool, providing the full updated record including all current field values and the changes requested."
- Add 4 new tools: `updateVaccination`, `updateVetVisit`, `updateWeightEntry`, `updateMedication`

**`lib/actions/ai-records.ts`**
- Add 4 new server actions: `updateAiVaccination`, `updateAiVetVisit`, `updateAiWeightEntry`, `updateAiMedication`

**`app/ai-vet/ConfirmationCard.tsx`**
- Add 4 entries to `TOOL_META` for the update tools
- Add an `ID_FIELDS` set to exclude record ID fields from the displayed field rows
- Add 4 new branches in `handleConfirm` to route to the update actions

---

## Tool Definitions

All update tools use `tool()` + `inputSchema: jsonSchema<T>()` from `ai` (same pattern as existing add tools). `execute: async (input) => input` — client handles confirmation and saving.

```typescript
updateVaccination: {
  description: "Propose updating an existing vaccination record. Use when the user asks to edit or change a vaccination.",
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
      vaccine_name: { type: "string" },
      date_given: { type: "string", description: "YYYY-MM-DD" },
      next_due_date: { type: "string", description: "YYYY-MM-DD" },
      vet_clinic: { type: "string" },
      batch_number: { type: "string" },
      notes: { type: "string" },
    },
    required: ["vaccination_id", "vaccine_name", "date_given"],
  }),
  execute: async (input) => input,
}

updateVetVisit: {
  required: ["vet_visit_id", "date", "reason"]
  optional: vet_clinic, outcome, cost, notes
}

updateWeightEntry: {
  required: ["weight_entry_id", "date", "weight_kg"]
  optional: notes
}

updateMedication: {
  required: ["medication_id", "name", "start_date"]
  optional: medication_type (enum), dosage, frequency, end_date, prescribed_by, notes
}
```

---

## Server Actions

Pattern for each update action (shown for vaccination; others follow identically):

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
    .eq("puppy_id", ids.puppyId) // ownership check — prevents cross-puppy writes
    .select("id");

  if (error) return { error: error.message };
  if (!updated || updated.length === 0) return { error: "Record not found or access denied" };
  revalidatePath("/vaccinations");
  return { success: true };
}
```

The `.eq("puppy_id", ids.puppyId)` ownership check is the security boundary. If the ID doesn't belong to this user's puppy, no rows are updated and the action returns `{ success: true }` silently (no data leaked, no error exposed to the AI).

---

## ConfirmationCard Changes

### TOOL_META additions
```typescript
updateVaccination: { title: "Update Vaccination", href: "/vaccinations" },
updateVetVisit:    { title: "Update Vet Visit",   href: "/vet-visits" },
updateWeightEntry: { title: "Update Weight Entry", href: "/weight" },
updateMedication:  { title: "Update Medication",  href: "/medications" },
```

### ID_FIELDS exclusion
Add a constant to hide internal ID fields from the displayed field rows:
```typescript
const ID_FIELDS = new Set([
  "vaccination_id",
  "vet_visit_id",
  "weight_entry_id",
  "medication_id",
]);
```

Update `displayFields` filter:
```typescript
const displayFields = Object.entries(args).filter(
  ([key, v]) => v !== undefined && v !== null && !ID_FIELDS.has(key)
);
```

### handleConfirm routing additions
```typescript
} else if (toolName === "updateVaccination") {
  result = await updateAiVaccination(args as Parameters<typeof updateAiVaccination>[0]);
} else if (toolName === "updateVetVisit") {
  result = await updateAiVetVisit(args as Parameters<typeof updateAiVetVisit>[0]);
} else if (toolName === "updateWeightEntry") {
  result = await updateAiWeightEntry(args as Parameters<typeof updateAiWeightEntry>[0]);
} else if (toolName === "updateMedication") {
  result = await updateAiMedication(args as Parameters<typeof updateAiMedication>[0]);
}
```

---

## Files Modified

| File | Change |
|---|---|
| `app/api/chat/route.ts` | Add 4 update tools; update system prompt |
| `lib/actions/ai-records.ts` | Add 4 update server actions |
| `app/ai-vet/ConfirmationCard.tsx` | Add update TOOL_META, ID_FIELDS exclusion, handleConfirm routing |

---

## Verification

1. Ask "Update Dobby's rabies vaccination next due date to next year" — AI should call `updateVaccination` with the correct `vaccination_id` from context and a confirmation card should appear showing all fields
2. Click **Confirm & Save** — vaccination record updated, card shows "Saved!"
3. Navigate to `/vaccinations` — updated next due date is reflected
4. Ask "Change my last weight entry to 29 kg" — AI identifies the most recent entry by ID and proposes the update
5. Ask to edit a record with a fabricated/wrong ID — action returns `{ error: "Record not found or access denied" }`, card shows the error message
6. Verify add flows still work — existing `addVaccination` etc. tools are unchanged
