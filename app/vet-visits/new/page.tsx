"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function NewVetVisitPage() {
  const t = useTranslations("vetVisits");
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [vetClinic, setVetClinic] = useState("");
  const [reason, setReason] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextAppointmentDate, setNextAppointmentDate] = useState("");
  const [nextAppointmentReason, setNextAppointmentReason] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
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

      const parsedCost = cost ? parseFloat(cost) : null;

      const { error: insertError } = await supabase.from("vet_visits").insert({
        puppy_id: membership.puppy_id,
        date,
        vet_clinic: vetClinic || null,
        reason,
        outcome: outcome || null,
        next_appointment_date: nextAppointmentDate || null,
        next_appointment_reason: nextAppointmentReason || null,
        cost: parsedCost,
        notes: notes || null,
        created_by: user.id,
      });

      if (insertError) throw insertError;

      toast.success(t("toastSuccess"));
      router.push("/vet-visits");
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
          disabled={loading}
          className="h-[56px] bg-accent text-white rounded-pill text-base font-semibold disabled:opacity-60 transition-opacity mt-2"
        >
          {loading ? t("saving") : t("saveButton")}
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
