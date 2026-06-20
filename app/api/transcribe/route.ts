import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.formData();
  const audio = data.get("audio") as Blob | null;
  if (!audio) return NextResponse.json({ error: "No audio" }, { status: 400 });

  const form = new FormData();
  form.append("file", audio, "recording.webm");
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) return NextResponse.json({ error: "Transcription failed" }, { status: 500 });

  const { text } = (await res.json()) as { text: string };
  return NextResponse.json({ transcript: text });
}
