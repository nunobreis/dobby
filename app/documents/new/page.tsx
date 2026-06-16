"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import DocumentUpload from "@/components/DocumentUpload";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function NewDocumentPage() {
  const today = new Date().toISOString().split("T")[0];
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documentDate, setDocumentDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !file) {
      setError("Title and file are required.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: membership } = await supabase
        .from("puppy_members")
        .select("puppy_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) throw new Error("No puppy found");

      const docId = crypto.randomUUID();
      const ext = file.name.split(".").pop();
      const filePath = `${membership.puppy_id}/${docId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("dobby-documents")
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documents").insert({
        puppy_id: membership.puppy_id,
        title,
        category: category || null,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        document_date: documentDate || null,
        notes: notes || null,
        uploaded_by: user.id,
      });

      if (insertError) throw insertError;

      router.push("/documents");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/documents">
          <ChevronLeft size={26} className="text-text-primary" />
        </Link>
        <h1 className="text-[28px] font-bold text-text-primary">Add Document</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="FILE">
          <DocumentUpload onChange={setFile} />
        </Field>

        <Field label="TITLE">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pet Insurance Policy"
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label="CATEGORY">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40 appearance-none"
          >
            <option value="">Select…</option>
            <option value="insurance">Insurance</option>
            <option value="certificates">Certificates</option>
            <option value="vet_records">Vet Records</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="DATE (optional)">
          <input
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label="NOTES (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes…"
            rows={3}
            className="bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 resize-none"
          />
        </Field>

        {error && (
          <p className="text-sm text-[#9B1C1C] bg-blush-pink rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-[56px] bg-accent text-white rounded-pill text-base font-semibold disabled:opacity-60 transition-opacity mt-2"
        >
          Save document
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold text-text-secondary tracking-wider">{label}</span>
      {children}
    </div>
  );
}
