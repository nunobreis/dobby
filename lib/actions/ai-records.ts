// lib/actions/ai-records.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { success: true } | { error: string };

async function getPuppyId(): Promise<{ puppyId: string; userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("puppy_members")
    .select("puppy_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  return { puppyId: membership.puppy_id, userId: user.id };
}

export async function saveAiVaccination(data: {
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

  const { error } = await supabase.from("vaccinations").insert({
    puppy_id: ids.puppyId,
    vaccine_name: data.vaccine_name,
    date_given: data.date_given,
    next_due_date: data.next_due_date ?? null,
    vet_clinic: data.vet_clinic ?? null,
    batch_number: data.batch_number ?? null,
    notes: data.notes ?? null,
    created_by: ids.userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/vaccinations");
  return { success: true };
}

export async function saveAiVetVisit(data: {
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

  const { error } = await supabase.from("vet_visits").insert({
    puppy_id: ids.puppyId,
    date: data.date,
    reason: data.reason,
    vet_clinic: data.vet_clinic ?? null,
    outcome: data.outcome ?? null,
    cost: data.cost ?? null,
    notes: data.notes ?? null,
    created_by: ids.userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/vet-visits");
  return { success: true };
}

export async function saveAiWeightEntry(data: {
  date: string;
  weight_kg: number;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const ids = await getPuppyId();
  if (!ids) return { error: "Not authenticated" };

  const { error } = await supabase.from("weight_entries").insert({
    puppy_id: ids.puppyId,
    date: data.date,
    weight_kg: data.weight_kg,
    notes: data.notes ?? null,
    created_by: ids.userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/weight");
  return { success: true };
}

export async function saveAiMedication(data: {
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

  const { error } = await supabase.from("medications").insert({
    puppy_id: ids.puppyId,
    name: data.name,
    start_date: data.start_date,
    medication_type: data.medication_type ?? null,
    dosage: data.dosage ?? null,
    frequency: data.frequency ?? null,
    end_date: data.end_date ?? null,
    prescribed_by: data.prescribed_by ?? null,
    notes: data.notes ?? null,
    created_by: ids.userId,
  });
  if (error) return { error: error.message };

  revalidatePath("/medications");
  return { success: true };
}

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
