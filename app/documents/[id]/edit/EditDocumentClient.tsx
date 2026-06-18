"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { Document } from "@/lib/types";

export default function EditDocumentClient({
  document,
  signedUrl,
}: {
  document: Document;
  signedUrl: string | null;
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(document.title);
  const [category, setCategory] = useState<"insurance" | "certificates" | "vet_records" | "other" | "">(
    document.category ?? ""
  );
  const [documentDate, setDocumentDate] = useState(document.document_date ?? "");
  const [notes, setNotes] = useState(document.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title) {
      setError(t("errorRequired"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("documents")
        .update({
          title,
          category: category || null,
          document_date: documentDate || null,
          notes: notes || null,
        })
        .eq("id", document.id);

      if (error) throw error;
      toast.success(t("toastUpdated"));
      router.push("/documents");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await supabase.storage.from("dobby-documents").remove([document.file_path]);

      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", document.id);

      if (error) throw error;
      toast.success(t("toastDeleted"));
      router.push("/documents");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-5 py-8 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.back()} className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
          <ChevronLeft size={26} className="text-text-primary" />
        </button>
        <h1 className="text-[28px] font-bold text-text-primary">{t("editTitle")}</h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <Field label={t("currentFile")}>
          <div className="h-[52px] bg-[#EBEBEB] rounded-input px-4 flex items-center justify-between gap-2">
            <span className="text-[15px] text-text-primary truncate">{document.file_name}</span>
            {signedUrl && (
              <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <ExternalLink size={16} className="text-accent" />
              </a>
            )}
          </div>
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
            onChange={(e) => setCategory(e.target.value as typeof category)}
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
          disabled={saving}
          className="h-[56px] bg-accent text-white rounded-pill text-base font-semibold disabled:opacity-60 transition-opacity mt-2"
        >
          {saving ? t("saving") : t("saveChangesButton")}
        </button>
      </form>

      <div className="mt-8">
        {confirmDelete ? (
          <div className="bg-white rounded-card p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[16px] font-bold text-text-primary">{t("deleteConfirmTitle")}</span>
              <span className="text-[13px] text-text-secondary">{t("deleteConfirmMessage")}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-[50px] bg-[#EBEBEB] text-text-primary rounded-pill text-[15px] font-semibold"
              >
                {t("cancelButton")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-[50px] bg-[#9B1C1C] text-white rounded-pill text-[15px] font-semibold disabled:opacity-60"
              >
                {deleting ? "…" : t("deleteButton")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 h-[50px] text-[#9B1C1C] text-[15px] font-semibold"
          >
            <Trash2 size={16} />
            {t("deleteButton")}
          </button>
        )}
      </div>
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
