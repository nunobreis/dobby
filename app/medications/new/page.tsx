"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function NewMedicationPage() {
  const t = useTranslations("medications");
  const today = new Date().toISOString().split("T")[0];
  const [name, setName] = useState("");
  const [medicationType, setMedicationType] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [prescribedBy, setPrescribedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
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

      const { error: insertError } = await supabase.from("medications").insert({
        puppy_id: membership.puppy_id,
        name,
        medication_type: medicationType || null,
        dosage: dosage || null,
        frequency: frequency || null,
        start_date: startDate,
        end_date: endDate || null,
        prescribed_by: prescribedBy || null,
        notes: notes || null,
        created_by: user.id,
      });

      if (insertError) throw insertError;

      toast.success(t("toastSuccess"));
      router.push("/medications");
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
