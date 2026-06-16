import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import { formatDate } from "@/lib/utils";

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

  const { data: visits } = await supabase
    .from("vet_visits")
    .select("*")
    .eq("puppy_id", membership.puppy_id)
    .order("date", { ascending: false });

  const upcoming = (visits ?? []).filter((v) => v.date >= today).reverse();
  const past = (visits ?? []).filter((v) => v.date < today);

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-text-primary">Vet Visits</h1>
        <Link href="/vet-visits/new">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </div>
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {upcoming.length === 0 && past.length === 0 ? (
          <div className="bg-white rounded-card p-8 flex flex-col items-center gap-3">
            <Stethoscope size={32} className="text-accent opacity-40" />
            <span className="text-[15px] font-semibold text-text-primary">No vet visits yet</span>
            <span className="text-[13px] text-text-secondary text-center">
              Log Dobby&apos;s visits and upcoming appointments here.
            </span>
            <Link href="/vet-visits/new" className="text-[13px] font-semibold text-accent">
              Add visit
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  UPCOMING
                </span>
                {upcoming.map((v) => (
                  <VisitCard key={v.id} visit={v} upcoming />
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  PAST VISITS
                </span>
                {past.map((v) => (
                  <VisitCard key={v.id} visit={v} />
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

function VisitCard({
  visit,
  upcoming = false,
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
}) {
  return (
    <div
      className={`bg-white rounded-card p-4 flex flex-col gap-2 ${
        upcoming ? "border-l-4 border-accent" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[16px] font-bold text-text-primary">{visit.reason}</span>
        <span className="text-[13px] text-text-secondary shrink-0">{formatDate(visit.date)}</span>
      </div>
      {visit.vet_clinic && (
        <span className="text-[13px] text-text-secondary">{visit.vet_clinic}</span>
      )}
      {visit.outcome && (
        <span className="text-[13px] text-text-secondary">{visit.outcome}</span>
      )}
      {visit.cost != null && (
        <span className="text-[13px] text-text-secondary">€{visit.cost.toFixed(2)}</span>
      )}
      {visit.next_appointment_date && (
        <div className="mt-1 pt-2 border-t border-[#F0F0F0]">
          <span className="text-[12px] font-semibold text-accent">
            Next: {formatDate(visit.next_appointment_date)}
            {visit.next_appointment_reason ? ` · ${visit.next_appointment_reason}` : ""}
          </span>
        </div>
      )}
      {visit.notes && (
        <span className="text-[13px] text-text-secondary italic">{visit.notes}</span>
      )}
    </div>
  );
}
