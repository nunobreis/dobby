import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pill } from "lucide-react";
import BackButton from "@/components/BackButton";
import EmptyState from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import { formatDate } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  deworming: "Deworming",
  flea_tick: "Flea & Tick",
  antibiotic: "Antibiotic",
  other: "Other",
};

export default async function MedicationsPage() {
  const supabase = await createClient();

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

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-[28px] font-bold text-text-primary">Medications</h1>
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
            title="No medications yet"
            message="Track dewormings, flea treatments, and any prescribed medications."
            ctaLabel="Add medication"
            ctaHref="/medications/new"
          />
        ) : (
          <>
            {active.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  ACTIVE
                </span>
                {active.map((m) => (
                  <MedicationCard key={m.id} medication={m} />
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  PAST
                </span>
                {past.map((m) => (
                  <MedicationCard key={m.id} medication={m} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function MedicationCard({
  medication,
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
}) {
  return (
    <div className="bg-white rounded-card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[16px] font-bold text-text-primary">{medication.name}</span>
        {medication.medication_type && (
          <span className="bg-lavender text-text-primary text-[12px] font-medium px-3 py-1 rounded-badge shrink-0">
            {TYPE_LABELS[medication.medication_type] ?? medication.medication_type}
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
        {medication.end_date ? ` – ${formatDate(medication.end_date)}` : " · ongoing"}
      </span>
      {medication.prescribed_by && (
        <span className="text-[12px] text-text-secondary">
          Prescribed by {medication.prescribed_by}
        </span>
      )}
      {medication.notes && (
        <span className="text-[13px] text-text-secondary italic">{medication.notes}</span>
      )}
    </div>
  );
}
