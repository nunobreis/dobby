import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Stethoscope, Calendar, MapPin, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import EmptyState from "@/components/EmptyState";
import { formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function VetVisitsPage() {
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

  const [{ data: visits }, { data: puppy }] = await Promise.all([
    supabase
      .from("vet_visits")
      .select("*")
      .eq("puppy_id", membership.puppy_id)
      .order("date", { ascending: false }),
    supabase
      .from("puppies")
      .select("name")
      .eq("id", membership.puppy_id)
      .single(),
  ]);

  const t = await getTranslations("vetVisits");
  const puppyName = puppy?.name ?? "Dobby";

  const upcoming = (visits ?? []).filter((v) => v.date >= today).reverse();
  const past = (visits ?? []).filter((v) => v.date < today);

  function getNextLabel(visit: {
    next_appointment_date: string | null;
    next_appointment_reason: string | null;
  }): string {
    if (!visit.next_appointment_date) return "";
    const date = formatDate(visit.next_appointment_date);
    if (visit.next_appointment_reason) {
      return t("nextDateWithReason", { date, reason: visit.next_appointment_reason });
    }
    return t("nextDate", { date });
  }

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center justify-between mb-1 lg:hidden">
          <BackButton />
          <Link href="/vet-visits/new">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-text-primary">{t("title")}</h1>
          <Link href="/vet-visits/new" className="hidden lg:flex">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
          </Link>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {upcoming.length === 0 && past.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title={t("emptyTitle")}
            message={t("emptyMessage", { name: puppyName })}
            ctaLabel={t("emptyCta")}
            ctaHref="/vet-visits/new"
          />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  {t("upcoming")}
                </span>
                {upcoming.map((v) => (
                  <Link key={v.id} href={`/vet-visits/${v.id}/edit`}>
                    <VisitCard visit={v} upcoming nextLabel={getNextLabel(v)} />
                  </Link>
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  {t("past")}
                </span>
                {past.map((v) => (
                  <Link key={v.id} href={`/vet-visits/${v.id}/edit`}>
                    <VisitCard visit={v} nextLabel={getNextLabel(v)} />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

function VisitCard({
  visit,
  upcoming = false,
  nextLabel,
}: {
  visit: {
    id: string;
    date: string;
    vet_clinic: string | null;
    reason: string;
    outcome: string | null;
    next_appointment_date: string | null;
    next_appointment_reason: string | null;
    cost: number | null;
    notes: string | null;
  };
  upcoming?: boolean;
  nextLabel: string;
}) {
  return (
    <div
      className={`bg-white rounded-card p-4 flex flex-col gap-3 ${
        upcoming ? "border-l-4 border-accent" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[16px] font-bold text-text-primary">{visit.reason}</span>
        <ChevronRight size={16} className="text-[#AEAEAE] shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-badge text-[11px] font-semibold bg-soft-yellow text-[#78350F]">
          <Calendar size={10} />
          {formatDate(visit.date)}
        </span>
        {visit.vet_clinic && (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-badge text-[11px] font-semibold bg-lavender text-[#5B21B6]">
            <MapPin size={10} />
            {visit.vet_clinic}
          </span>
        )}
        {visit.cost != null && (
          <span className="px-2.5 py-0.5 rounded-badge text-[11px] font-semibold bg-sage-green text-[#166534]">
            €{visit.cost.toFixed(2)}
          </span>
        )}
      </div>
      {visit.outcome && (
        <span className="text-[13px] text-text-secondary">{visit.outcome}</span>
      )}
      {visit.next_appointment_date && nextLabel && (
        <div className="pt-2 border-t border-[#F0F0F0]">
          <span className="text-[12px] font-semibold text-accent">
            {nextLabel}
          </span>
        </div>
      )}
      {visit.notes && (
        <span className="text-[13px] text-text-secondary italic">{visit.notes}</span>
      )}
    </div>
  );
}
