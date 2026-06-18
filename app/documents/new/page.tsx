"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DocumentUpload from "@/components/DocumentUpload";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function NewDocumentPage() {
  const t = useTranslations("documents");
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
      setError(t("errorRequired"));
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

      toast.success(t("toastSuccess"));
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
        <button onClick={() => router.back()} className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
          <ChevronLeft size={26} className="text-text-primary" />
        </button>
        <h1 className="text-[28px] font-bold text-text-primary">{t("addTitle")}</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label={t("fieldFile")}>
          <DocumentUpload onChange={setFile} />
        </Field>

        <Field label={t("fieldTitle")}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("placeholderTitle")}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldCategory")}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40 appearance-none"
          >
            <option value="">{t("categorySelect")}</option>
            <option value="insurance">{t("categoryInsurance")}</option>
            <option value="certificates">{t("categoryCertificates")}</option>
            <option value="vet_records">{t("categoryVetRecords")}</option>
            <option value="other">{t("categoryOther")}</option>
          </select>
        </Field>

        <Field label={t("fieldDate")}>
          <input
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldNotes")}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("placeholderNotes")}
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
          {t("saveButton")}
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
