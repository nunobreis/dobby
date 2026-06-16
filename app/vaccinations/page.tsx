import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Syringe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import VaccinationBadge from "@/components/VaccinationBadge";
import { formatDate } from "@/lib/utils";

export default async function VaccinationsPage() {
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

  const { data: vaccinations } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("puppy_id", membership.puppy_id)
    .order("date_given", { ascending: false });

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-text-primary">Vaccinations</h1>
        <Link href="/vaccinations/new">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </div>
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-3">
        {vaccinations && vaccinations.length > 0 ? (
          vaccinations.map((v) => (
            <div key={v.id} className="bg-white rounded-card p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[16px] font-bold text-text-primary">{v.vaccine_name}</span>
                <VaccinationBadge nextDueDate={v.next_due_date} />
              </div>
              <span className="text-[13px] text-text-secondary">
                Given: {formatDate(v.date_given)}
              </span>
              {v.next_due_date && (
                <span className="text-[13px] text-text-secondary">
                  Next due: {formatDate(v.next_due_date)}
                </span>
              )}
              {v.vet_clinic && (
                <span className="text-[13px] text-text-secondary">{v.vet_clinic}</span>
              )}
              {v.batch_number && (
                <span className="text-[12px] text-text-secondary">Batch: {v.batch_number}</span>
              )}
              {v.notes && (
                <span className="text-[13px] text-text-secondary italic">{v.notes}</span>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-card p-8 flex flex-col items-center gap-3">
            <Syringe size={32} className="text-accent opacity-40" />
            <span className="text-[15px] font-semibold text-text-primary">No vaccinations yet</span>
            <span className="text-[13px] text-text-secondary text-center">
              Add Dobby&apos;s first vaccination record to start tracking.
            </span>
            <Link href="/vaccinations/new" className="text-[13px] font-semibold text-accent">
              Add vaccination
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
