"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { VetVisit } from "@/lib/types";

export default function EditVetVisitClient({ visit }: { visit: VetVisit }) {
  const t = useTranslations("vetVisits");
  const router = useRouter();
  const supabase = createClient();

  const [date, setDate] = useState(visit.date);
  const [reason, setReason] = useState(visit.reason);
  const [vetClinic, setVetClinic] = useState(visit.vet_clinic ?? "");
  const [outcome, setOutcome] = useState(visit.outcome ?? "");
  const [cost, setCost] = useState(visit.cost != null ? String(visit.cost) : "");
  const [nextAppointmentDate, setNextAppointmentDate] = useState(visit.next_appointment_date ?? "");
  const [nextAppointmentReason, setNextAppointmentReason] = useState(visit.next_appointment_reason ?? "");
  const [notes, setNotes] = useState(visit.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !reason) {
      setError(t("errorRequired"));
      return;
    }
    if (nextAppointmentDate && nextAppointmentDate <= date) {
      setError(t("errorNextDate"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("vet_visits")
        .update({
          date,
          reason,
          vet_clinic: vetClinic || null,
          outcome: outcome || null,
          cost: cost ? parseFloat(cost) : null,
          next_appointment_date: nextAppointmentDate || null,
          next_appointment_reason: nextAppointmentReason || null,
          notes: notes || null,
        })
        .eq("id", visit.id);

      if (error) throw error;
      toast.success(t("toastUpdated"));
      router.push("/vet-visits");
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
        .from("vet_visits")
        .delete()
        .eq("id", visit.id);

      if (error) throw error;
      toast.success(t("toastDeleted"));
      router.push("/vet-visits");
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
        <Field label={t("fieldDate")}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <Field label={t("fieldReason")}>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("placeholderReason")}
            required
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
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

        <Field label={t("fieldOutcome")}>
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder={t("placeholderOutcome")}
            rows={2}
            className="bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40 resize-none"
          />
        </Field>

        <Field label={t("fieldCost")}>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder={t("placeholderCost")}
            step="0.01"
            min="0"
            className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
          />
        </Field>

        <div className="bg-white rounded-card p-4 flex flex-col gap-4">
          <span className="text-[13px] font-semibold text-text-primary">{t("nextAppointment")}</span>
          <Field label={t("fieldNextDate")}>
            <input
              type="date"
              value={nextAppointmentDate}
              onChange={(e) => setNextAppointmentDate(e.target.value)}
              className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary outline-none focus:ring-2 focus:ring-accent/40"
            />
          </Field>
          <Field label={t("fieldNextReason")}>
            <input
              type="text"
              value={nextAppointmentReason}
              onChange={(e) => setNextAppointmentReason(e.target.value)}
              placeholder={t("placeholderNextReason")}
              className="h-[52px] bg-[#EBEBEB] rounded-input px-4 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
            />
          </Field>
        </div>

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
