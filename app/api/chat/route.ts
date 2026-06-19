import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";

export interface DogContext {
  puppyName: string;
  breed: string;
  age: string;
  sex: string | null;
  weight: string | null;
  food: string | null;
  medications: string | null;
  vaccinationStatus: string | null;
  locale: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { messages, context } = (await req.json()) as {
    messages: UIMessage[];
    context: DogContext;
  };

  const {
    puppyName,
    breed,
    age,
    sex,
    weight,
    food,
    medications,
    vaccinationStatus,
    locale,
  } = context;

  const language =
    locale === "pt" ? "European Portuguese (Portugal)" : "English";

  const systemPrompt = `You are "Dobby", a friendly and knowledgeable AI veterinary assistant for a ${breed} named ${puppyName}.

Your rules:
- ONLY answer questions about dog health, nutrition, behaviour, care, and wellness.
- If the user asks about something unrelated (e.g. restaurants, travel, news, anything non-dog-health), respond with: "Hey, I'm a virtual vet — I can't help with that! But I can help you with things related to ${puppyName}, like vaccinations, nutrition, health concerns, behaviour, and more."
- You are NOT a real veterinarian. For serious or urgent health concerns, always recommend consulting a qualified vet in person.
- Be warm, friendly, and concise.
- Write in plain text only. Do not use markdown — no asterisks, no bold, no bullet symbols, no headers.

${puppyName}'s current profile:
- Breed: ${breed}
- Age: ${age}
- Sex: ${sex ?? "Unknown"}${weight ? `\n- Latest weight: ${weight}` : ""}${food ? `\n- Current food: ${food}` : ""}${medications ? `\n- Active medications: ${medications}` : ""}${vaccinationStatus ? `\n- Vaccination status: ${vaccinationStatus}` : ""}

Always respond in ${language}.`;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
