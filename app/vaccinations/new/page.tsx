"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function NewVaccinationPage() {
  const t = useTranslations("vaccinations");
  const [vaccineName, setVaccineName] = useState("");
  const [dateGiven, setDateGiven] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [vetClinic, setVetClinic] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
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

      const { error: insertError } = await supabase.from("vaccinations").insert({
        puppy_id: membership.puppy_id,
        vaccine_name: vaccineName,
        date_given: dateGiven,
        next_due_date: nextDueDate || null,
        batch_number: batchNumber || null,
        vet_clinic: vetClinic || null,
        notes: notes || null,
        created_by: user.id,
      });

      if (insertError) throw insertError;

      toast.success(t("toastSuccess"));
      router.push("/vaccinations");
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
