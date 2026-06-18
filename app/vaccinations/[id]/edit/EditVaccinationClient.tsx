"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { Vaccination } from "@/lib/types";

export default function EditVaccinationClient({
  vaccination,
}: {
  vaccination: Vaccination;
}) {
  const t = useTranslations("vaccinations");
  const router = useRouter();
  const supabase = createClient();

  const [vaccineName, setVaccineName] = useState(vaccination.vaccine_name);
  const [dateGiven, setDateGiven] = useState(vaccination.date_given);
  const [nextDueDate, setNextDueDate] = useState(vaccination.next_due_date ?? "");
  const [batchNumber, setBatchNumber] = useState(vaccination.batch_number ?? "");
  const [vetClinic, setVetClinic] = useState(vaccination.vet_clinic ?? "");
  const [notes, setNotes] = useState(vaccination.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!vaccineName || !dateGiven) {
      setError(t("errorRequired"));
      return;
    }
    if (nextDueDate && nextDueDate <= dateGiven) {
      setError(t("errorNextDueDate"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("vaccinations")
        .update({
          vaccine_name: vaccineName,
          date_given: dateGiven,
          next_due_date: nextDueDate || null,
          batch_number: batchNumber || null,
          vet_clinic: vetClinic || null,
          notes: notes || null,
        })
        .eq("id", vaccination.id);

      if (error) throw error;
      toast.success(t("toastUpdated"));
      router.push("/vaccinations");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("vaccinations")
        .delete()
        .eq("id", vaccination.id);

      if (error) throw error;
      toast.success(t("toastDeleted"));
      router.push("/vaccinations");
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
        <Link href="/vaccinations">
          <ChevronLeft size={26} className="text-text-primary" />
        </Link>
        <h1 className="text-[28px] font-bold text-text-primary">{t("editTitle")}</h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">
        <Field label={t("fieldVaccineName")}>
          <input
            type="text"
            value={vaccineName}
            onChange={(e) => setVaccineName(e.target.value)}
            placeholder={t("placeholderVaccineName")}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldDateGiven")}>
          <input
            type="date"
            value={dateGiven}
            onChange={(e) => setDateGiven(e.target.value)}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldNextDueDate")}>
          <input
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldVetClinic")}>
          <input
            type="text"
            value={vetClinic}
            onChange={(e) => setVetClinic(e.target.value)}
            placeholder={t("placeholderVetClinic")}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldBatchNumber")}>
          <input
            type="text"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder={t("placeholderBatchNumber")}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
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

      {/* Delete section */}
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
