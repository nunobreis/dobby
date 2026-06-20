"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { Medication } from "@/lib/types";

export default function EditMedicationClient({
  medication,
}: {
  medication: Medication;
}) {
  const t = useTranslations("medications");
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(medication.name);
  const [medicationType, setMedicationType] = useState(medication.medication_type ?? "");
  const [dosage, setDosage] = useState(medication.dosage ?? "");
  const [frequency, setFrequency] = useState(medication.frequency ?? "");
  const [startDate, setStartDate] = useState(medication.start_date);
  const [endDate, setEndDate] = useState(medication.end_date ?? "");
  const [prescribedBy, setPrescribedBy] = useState(medication.prescribed_by ?? "");
  const [notes, setNotes] = useState(medication.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !startDate) {
      setError(t("errorRequired"));
      return;
    }
    if (endDate && endDate < startDate) {
      setError(t("errorEndDate"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("medications")
        .update({
          name,
          medication_type: medicationType || null,
          dosage: dosage || null,
          frequency: frequency || null,
          start_date: startDate,
          end_date: endDate || null,
          prescribed_by: prescribedBy || null,
          notes: notes || null,
        })
        .eq("id", medication.id);

      if (error) throw error;
      toast.success(t("toastUpdated"));
      router.push("/medications");
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
        .from("medications")
        .delete()
        .eq("id", medication.id);

      if (error) throw error;
      toast.success(t("toastDeleted"));
      router.push("/medications");
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
        <Field label={t("fieldName")}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("placeholderName")}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldType")}>
          <select
            value={medicationType}
            onChange={(e) => setMedicationType(e.target.value)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40 appearance-none"
          >
            <option value="">{t("typeSelect")}</option>
            <option value="deworming">{t("typeDeworming")}</option>
            <option value="flea_tick">{t("typeFleaTick")}</option>
            <option value="antibiotic">{t("typeAntibiotic")}</option>
            <option value="other">{t("typeOther")}</option>
          </select>
        </Field>

        <Field label={t("fieldDosage")}>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder={t("placeholderDosage")}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldFrequency")}>
          <input
            type="text"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder={t("placeholderFrequency")}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldStartDate")}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldEndDate")}>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldPrescribedBy")}>
          <input
            type="text"
            value={prescribedBy}
            onChange={(e) => setPrescribedBy(e.target.value)}
            placeholder={t("placeholderPrescribedBy")}
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
