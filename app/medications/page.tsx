import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pill } from "lucide-react";
import BackButton from "@/components/BackButton";
import EmptyState from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function MedicationsPage() {
  const supabase = await createClient();
  const t = await getTranslations("medications");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("puppy_members")
    .select("puppy_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/profile/setup");

  const today = new Date().toISOString().split("T")[0];

  const { data: medications } = await supabase
    .from("medications")
    .select("*")
    .eq("puppy_id", membership.puppy_id)
    .order("start_date", { ascending: false });

  const active = (medications ?? []).filter(
    (m) => !m.end_date || m.end_date >= today
  );
  const past = (medications ?? []).filter(
    (m) => m.end_date && m.end_date < today
  );

  const typeLabel = (type: string): string => {
    const map: Record<string, string> = {
      deworming: t("typeDeworming"),
      flea_tick: t("typeFleaTick"),
      antibiotic: t("typeAntibiotic"),
      other: t("typeOther"),
    };
    return map[type] ?? type;
  };

  const ongoingLabel = t("ongoing");
  const prescribedByLabel = (name: string) => t("prescribedBy", { name });

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-[28px] font-bold text-text-primary">{t("title")}</h1>
        </div>
        <Link href="/medications/new">
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </div>
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {active.length === 0 && past.length === 0 ? (
          <EmptyState
            icon={Pill}
            title={t("emptyTitle")}
            message={t("emptyMessage")}
            ctaLabel={t("emptyCta")}
            ctaHref="/medications/new"
          />
        ) : (
          <>
            {active.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  {t("active")}
                </span>
                {active.map((m) => (
                  <MedicationCard
                    key={m.id}
                    medication={m}
                    typeLabel={typeLabel}
                    ongoingLabel={ongoingLabel}
                    prescribedByLabel={prescribedByLabel}
                  />
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  {t("past")}
                </span>
                {past.map((m) => (
                  <MedicationCard
                    key={m.id}
                    medication={m}
                    typeLabel={typeLabel}
                    ongoingLabel={ongoingLabel}
                    prescribedByLabel={prescribedByLabel}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

function MedicationCard({
  medication,
  typeLabel,
  ongoingLabel,
  prescribedByLabel,
}: {
  medication: {
    id: string;
    name: string;
    medication_type: string | null;
    dosage: string | null;
    frequency: string | null;
    start_date: string;
    end_date: string | null;
    prescribed_by: string | null;
    notes: string | null;
  };
  typeLabel: (type: string) => string;
  ongoingLabel: string;
  prescribedByLabel: (name: string) => string;
}) {
  return (
    <div className="bg-white rounded-card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[16px] font-bold text-text-primary">{medication.name}</span>
        {medication.medication_type && (
          <span className="bg-lavender text-text-primary text-[12px] font-medium px-3 py-1 rounded-badge shrink-0">
            {typeLabel(medication.medication_type)}
          </span>
        )}
      </div>
      {medication.dosage && (
        <span className="text-[13px] text-text-secondary">{medication.dosage}</span>
      )}
      {medication.frequency && (
        <span className="text-[13px] text-text-secondary">{medication.frequency}</span>
      )}
      <span className="text-[13px] text-text-secondary">
        {formatDate(medication.start_date)}
        {medication.end_date ? ` – ${formatDate(medication.end_date)}` : ` · ${ongoingLabel}`}
      </span>
      {medication.prescribed_by && (
        <span className="text-[12px] text-text-secondary">
          {prescribedByLabel(medication.prescribed_by)}
        </span>
      )}
      {medication.notes && (
        <span className="text-[13px] text-text-secondary italic">{medication.notes}</span>
      )}
    </div>
  );
}
