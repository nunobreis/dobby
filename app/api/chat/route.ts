import { streamText, convertToModelMessages, tool, jsonSchema } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { calculateAge, formatWeight } from "@/lib/utils";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { messages } = (await req.json()) as { messages: UIMessage[] };

  const { data: membership } = await supabase
    .from("puppy_members")
    .select("puppy_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return new Response("No puppy found", { status: 404 });

  const puppyId = membership.puppy_id;
  const locale =
    (user.user_metadata?.language as string | undefined) ?? "en";
  const language =
    locale === "pt" ? "European Portuguese (Portugal)" : "English";

  const [
    { data: puppy },
    { data: vaccinations },
    { data: vetVisits },
    { data: weightEntries },
    { data: medications },
    { data: foodEntries },
  ] = await Promise.all([
    supabase
      .from("puppies")
      .select("name, breed, date_of_birth, sex")
      .eq("id", puppyId)
      .single(),
    supabase
      .from("vaccinations")
      .select("id, vaccine_name, date_given, next_due_date, vet_clinic")
      .eq("puppy_id", puppyId)
      .order("date_given", { ascending: false }),
    supabase
      .from("vet_visits")
      .select("id, date, reason, outcome, vet_clinic")
      .eq("puppy_id", puppyId)
      .order("date", { ascending: false }),
    supabase
      .from("weight_entries")
      .select("date, weight_kg")
      .eq("puppy_id", puppyId)
      .order("date", { ascending: false })
      .limit(20),
    supabase
      .from("medications")
      .select("id, name, medication_type, dosage, frequency, start_date, end_date")
      .eq("puppy_id", puppyId)
      .order("start_date", { ascending: false }),
    supabase
      .from("food_entries")
      .select("brand, product_name, daily_amount_g, meals_per_day")
      .eq("puppy_id", puppyId)
      .is("end_date", null)
      .order("start_date", { ascending: false })
      .limit(1),
  ]);

  const puppyName = puppy?.name ?? "Dobby";
  const breed = puppy?.breed ?? "Unknown";
  const age = puppy?.date_of_birth ? calculateAge(puppy.date_of_birth) : "unknown";
  const sex = puppy?.sex ?? "Unknown";

  const vaccinationList =
    vaccinations && vaccinations.length > 0
      ? vaccinations
          .map(
            (v) =>
              `- [id:${v.id}] ${v.vaccine_name}: given ${v.date_given}` +
              (v.next_due_date ? `, next due ${v.next_due_date}` : ", no next due date") +
              (v.vet_clinic ? `, at ${v.vet_clinic}` : "")
          )
          .join("\n")
      : "No vaccinations recorded.";

  const vetVisitList =
    vetVisits && vetVisits.length > 0
      ? vetVisits
          .map(
            (v) =>
              `- [id:${v.id}] ${v.date}: ${v.reason}` +
              (v.vet_clinic ? ` at ${v.vet_clinic}` : "") +
              (v.outcome ? ` — ${v.outcome}` : "")
          )
          .join("\n")
      : "No vet visits recorded.";

  const weightList =
    weightEntries && weightEntries.length > 0
      ? weightEntries
          .map((w) => `- ${w.date}: ${formatWeight(w.weight_kg)}`)
          .join("\n")
      : "No weight entries recorded.";

  const today = new Date().toISOString().split("T")[0];
  const activeMeds =
    medications?.filter((m) => !m.end_date || m.end_date >= today) ?? [];
  const medList =
    activeMeds.length > 0
      ? activeMeds
          .map(
            (m) =>
              `- [id:${m.id}] ${m.name}` +
              (m.medication_type ? ` (${m.medication_type})` : "") +
              (m.dosage ? `: ${m.dosage}` : "") +
              (m.frequency ? `, ${m.frequency}` : "") +
              (m.start_date ? `, since ${m.start_date}` : "")
          )
          .join("\n")
      : "No active medications.";

  const food =
    foodEntries && foodEntries.length > 0
      ? `${foodEntries[0].brand} ${foodEntries[0].product_name}` +
        (foodEntries[0].daily_amount_g
          ? `, ${foodEntries[0].daily_amount_g}g/day`
          : "") +
        (foodEntries[0].meals_per_day
          ? `, ${foodEntries[0].meals_per_day} meals/day`
          : "")
      : "Not recorded.";

  const systemPrompt = `You are "Dobby", a friendly and knowledgeable AI veterinary assistant for a ${breed} named ${puppyName}.

Your rules:
- ONLY answer questions about dog health, nutrition, behaviour, care, and wellness.
- If the user asks about something unrelated (e.g. restaurants, travel, news), respond with: "Hey, I'm a virtual vet — I can't help with that! But I can help you with things related to ${puppyName}, like vaccinations, nutrition, health concerns, behaviour, and more."
- You are NOT a real veterinarian. For serious or urgent health concerns, always recommend consulting a qualified vet in person.
- Be warm, friendly, and concise.
- When the user asks to add a vaccination, vet visit, weight entry, or medication: call the appropriate tool immediately — do not confirm in text first.
- If the user asks to edit an existing record, explain that editing via chat is not yet supported and suggest using the app directly.

${puppyName}'s profile:
- Breed: ${breed}
- Age: ${age}
- Sex: ${sex}
- Current food: ${food}

Vaccination records (${vaccinations?.length ?? 0} total):
${vaccinationList}

Vet visits (${vetVisits?.length ?? 0} total):
${vetVisitList}

Weight history (last ${weightEntries?.length ?? 0} entries):
${weightList}

Active medications:
${medList}

Always respond in ${language}.`;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: systemPrompt,
    messages: modelMessages,
    maxSteps: 2,
    tools: {
      addVaccination: tool({
        description:
          "Propose adding a vaccination record when the user wants to log one.",
        parameters: jsonSchema<{
          vaccine_name: string;
          date_given: string;
          next_due_date?: string;
          vet_clinic?: string;
          batch_number?: string;
          notes?: string;
        }>({
          type: "object",
          properties: {
            vaccine_name: { type: "string", description: "Name of the vaccine" },
            date_given: {
              type: "string",
              description: "Date given in YYYY-MM-DD format",
            },
            next_due_date: {
              type: "string",
              description: "Next due date in YYYY-MM-DD format",
            },
            vet_clinic: { type: "string", description: "Name of the vet clinic" },
            batch_number: { type: "string", description: "Batch or lot number" },
            notes: { type: "string", description: "Any additional notes" },
          },
          required: ["vaccine_name", "date_given"],
        }),
        execute: async (args) => args,
      }),
      addVetVisit: tool({
        description:
          "Propose adding a vet visit record when the user wants to log one.",
        parameters: jsonSchema<{
          date: string;
          reason: string;
          vet_clinic?: string;
          outcome?: string;
          cost?: number;
          notes?: string;
        }>({
          type: "object",
          properties: {
            date: { type: "string", description: "Date of visit in YYYY-MM-DD format" },
            reason: { type: "string", description: "Reason for the visit" },
            vet_clinic: { type: "string", description: "Name of the vet clinic" },
            outcome: { type: "string", description: "Outcome or diagnosis" },
            cost: { type: "number", description: "Cost of the visit" },
            notes: { type: "string", description: "Any additional notes" },
          },
          required: ["date", "reason"],
        }),
        execute: async (args) => args,
      }),
      addWeightEntry: tool({
        description:
          "Propose adding a weight entry when the user wants to log a weight measurement.",
        parameters: jsonSchema<{
          date: string;
          weight_kg: number;
          notes?: string;
        }>({
          type: "object",
          properties: {
            date: {
              type: "string",
              description: "Date of measurement in YYYY-MM-DD format",
            },
            weight_kg: { type: "number", description: "Weight in kilograms" },
            notes: { type: "string", description: "Any additional notes" },
          },
          required: ["date", "weight_kg"],
        }),
        execute: async (args) => args,
      }),
      addMedication: tool({
        description:
          "Propose adding a medication record when the user wants to log one.",
        parameters: jsonSchema<{
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
            name: { type: "string", description: "Name of the medication" },
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format",
            },
            medication_type: {
              type: "string",
              enum: ["deworming", "flea_tick", "antibiotic", "other"],
              description: "Type of medication",
            },
            dosage: { type: "string", description: "Dosage information" },
            frequency: {
              type: "string",
              description: "How often to give the medication",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format if applicable",
            },
            prescribed_by: {
              type: "string",
              description: "Name of the prescribing vet",
            },
            notes: { type: "string", description: "Any additional notes" },
          },
          required: ["name", "start_date"],
        }),
        execute: async (args) => args,
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
