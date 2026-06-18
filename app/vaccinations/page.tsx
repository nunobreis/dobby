import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Syringe, Calendar, MapPin, Hash, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VaccinationBadge from "@/components/VaccinationBadge";
import EmptyState from "@/components/EmptyState";
import { formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

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

  const [{ data: vaccinations }, { data: puppy }] = await Promise.all([
    supabase
      .from("vaccinations")
      .select("*")
      .eq("puppy_id", membership.puppy_id)
      .order("date_given", { ascending: false }),
    supabase
      .from("puppies")
      .select("name")
      .eq("id", membership.puppy_id)
      .single(),
  ]);

  const t = await getTranslations("vaccinations");
  const puppyName = puppy?.name ?? "Dobby";

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-text-primary">{t("title")}</h1>
        <Link href="/vaccinations/new">
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </div>
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-3">
        {vaccinations && vaccinations.length > 0 ? (
          vaccinations.map((v) => (
            <Link key={v.id} href={`/vaccinations/${v.id}/edit`}>
            <div className="bg-white rounded-card p-4 flex flex-col gap-3 active:bg-[#F5F5F5] transition-colors">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[16px] font-bold text-text-primary">{v.vaccine_name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <VaccinationBadge nextDueDate={v.next_due_date} />
                  <ChevronRight size={16} className="text-[#AEAEAE]" />
                </div>
              </div>
              {v.next_due_date && (
                <span className="text-[13px] text-text-secondary">
                  {t("nextDue", { date: formatDate(v.next_due_date) })}
                </span>
              )}
              <div className="flex flex-wrap gap-1.5">
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-badge text-[11px] font-semibold bg-soft-yellow text-[#78350F]">
                  <Calendar size={10} />
                  {t("given", { date: formatDate(v.date_given) })}
                </span>
                {v.vet_clinic && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-badge text-[11px] font-semibold bg-lavender text-[#5B21B6]">
                    <MapPin size={10} />
                    {v.vet_clinic}
                  </span>
                )}
                {v.batch_number && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-badge text-[11px] font-semibold bg-sky-blue text-[#1e40af]">
                    <Hash size={10} />
                    {v.batch_number}
                  </span>
                )}
              </div>
              {v.notes && (
                <span className="text-[13px] text-text-secondary italic">{v.notes}</span>
              )}
            </div>
            </Link>
          ))
        ) : (
          <EmptyState
            icon={Syringe}
            title={t("emptyTitle")}
            message={t("emptyMessage", { name: puppyName })}
            ctaLabel={t("emptyCta")}
            ctaHref="/vaccinations/new"
          />
        )}
      </div>

    </div>
  );
}
