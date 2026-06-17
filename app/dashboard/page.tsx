import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Syringe, Stethoscope, Scale, UtensilsCrossed, PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import VaccinationBadge from "@/components/VaccinationBadge";
import { formatDate, calculateAge, formatWeight, getVaccinationStatus } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import MilestoneCards from "./MilestoneCards";

export default async function DashboardPage() {
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

  const puppyId = membership.puppy_id;
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: puppy },
    { data: vaccinations },
    { data: vetVisits },
    { data: weightEntries },
    { data: foodEntries },
    { data: milestones },
  ] = await Promise.all([
    supabase.from("puppies").select("*").eq("id", puppyId).single(),
    supabase.from("vaccinations").select("*").eq("puppy_id", puppyId).order("next_due_date", { ascending: true }),
    supabase.from("vet_visits").select("*").eq("puppy_id", puppyId).or(`next_appointment_date.gte.${today},date.gte.${today}`).order("date", { ascending: true }).limit(5),
    supabase.from("weight_entries").select("*").eq("puppy_id", puppyId).order("date", { ascending: false }).limit(2),
    supabase.from("food_entries").select("*").eq("puppy_id", puppyId).is("end_date", null).order("start_date", { ascending: false }).limit(1),
    supabase.from("milestones").select("*").eq("puppy_id", puppyId).order("date", { ascending: false }).limit(6),
  ]);

  const t = await getTranslations("dashboard");

  const allVaccinations = vaccinations ?? [];
  const hasVaccinations = allVaccinations.length > 0;

  // Hero card: soonest-due vaccination for badge/alert
  const nextVaccination = allVaccinations
    .filter((v) => v.next_due_date)
    .sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!))[0] ?? null;
  const vaccinationStatus = nextVaccination ? getVaccinationStatus(nextVaccination.next_due_date) : null;
  const hasAlert = vaccinationStatus === "overdue" || vaccinationStatus === "due_soon";

  // Stat card: soonest upcoming date (future next_due_date → future date_given → overdue → most recent)
  const statVaccination = (() => {
    const futureNext = allVaccinations
      .filter((v) => v.next_due_date && v.next_due_date >= today)
      .sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!))[0];
    if (futureNext) return futureNext;
    const futureGiven = allVaccinations
      .filter((v) => v.date_given >= today)
      .sort((a, b) => a.date_given.localeCompare(b.date_given))[0];
    if (futureGiven) return futureGiven;
    if (nextVaccination) return nextVaccination;
    return allVaccinations.sort((a, b) => b.date_given.localeCompare(a.date_given))[0] ?? null;
  })();

  const nextVetVisit = (() => {
    const visits = vetVisits ?? [];
    const byAppt = visits
      .filter((v) => v.next_appointment_date && v.next_appointment_date >= today)
      .sort((a, b) => a.next_appointment_date!.localeCompare(b.next_appointment_date!))[0];
    if (byAppt) return byAppt;
    return visits
      .filter((v) => v.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  })();
  const latestWeight = weightEntries?.[0] ?? null;
  const previousWeight = weightEntries?.[1] ?? null;
  const weightChangePct = latestWeight && previousWeight
    ? ((latestWeight.weight_kg - previousWeight.weight_kg) / previousWeight.weight_kg) * 100
    : null;
  const currentFood = foodEntries?.[0] ?? null;

  const greeting = (user.user_metadata?.display_name as string | undefined) ?? user.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      {/* Top bar */}
      <div className="px-5 pt-10 pb-5 lg:pb-2 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-text-secondary">{t("greeting", { name: greeting })}</span>
          <span className="text-[24px] font-bold text-text-primary">
            {puppy?.name ?? "Dobby"} 🐾
          </span>
        </div>
        <Link href="/profile">
          <div className="w-[50px] h-[50px] rounded-full bg-lavender overflow-hidden flex items-center justify-center">
            {puppy?.photo_url ? (
              <img src={puppy.photo_url} alt={puppy.name} className="w-full h-full object-cover" />
            ) : (
              <PawPrint size={20} className="text-accent opacity-70" />
            )}
          </div>
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {/* Hero card */}
        <div className="bg-white rounded-card p-5 flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2.5 py-0.5 rounded-badge text-[11px] font-semibold bg-lavender text-[#5B21B6]">
              {puppy?.breed ?? "Golden Retriever"}
            </span>
            {puppy?.date_of_birth && (
              <span className="px-2.5 py-0.5 rounded-badge text-[11px] font-semibold bg-soft-yellow text-[#78350F]">
                {calculateAge(puppy.date_of_birth)}
              </span>
            )}
            {puppy?.sex && (
              <span className="px-2.5 py-0.5 rounded-badge text-[11px] font-semibold bg-sky-blue text-[#1e40af]">
                {puppy.sex.charAt(0).toUpperCase() + puppy.sex.slice(1)}
              </span>
            )}
            {puppy?.colour && (
              <span className="px-2.5 py-0.5 rounded-badge text-[11px] font-semibold bg-sage-green text-[#166534]">
                {puppy.colour}
              </span>
            )}
          </div>
          {nextVaccination && hasAlert ? (
            <>
              <span className="text-[16px] font-bold text-text-primary">
                {vaccinationStatus === "overdue"
                  ? t("vaccinationOverdue", { vaccine: nextVaccination.vaccine_name })
                  : t("vaccinationDueSoon", { vaccine: nextVaccination.vaccine_name })}
              </span>
              <VaccinationBadge nextDueDate={nextVaccination.next_due_date} />
            </>
          ) : nextVaccination ? (
            <>
              <span className="text-[16px] font-bold text-text-primary">
                {t("allUpToDate")}
              </span>
              <VaccinationBadge nextDueDate={nextVaccination.next_due_date} />
            </>
          ) : hasVaccinations ? (
            <span className="text-[16px] font-bold text-text-primary">
              {t("vaccinationsRecorded")}
            </span>
          ) : (
            <span className="text-[14px] text-text-secondary">{t("noVaccinations")}</span>
          )}
        </div>

        {/* Stat grid */}
        <div className="flex flex-col gap-3">
          {/* Row 1 */}
          <div className="flex gap-3">
            {/* Next vaccine */}
            <div className="flex-1 bg-white rounded-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider">{t("nextVaccine")}</span>
                <Link href="/vaccinations" className="p-2 -mr-2">
                  <ArrowUpRight size={16} className="text-text-secondary" />
                </Link>
              </div>
              {statVaccination ? (
                <>
                  <span className="text-[15px] font-bold text-text-primary leading-tight">
                    {statVaccination.vaccine_name}
                  </span>
                  <span className="text-[13px] text-text-secondary">
                    {statVaccination.next_due_date
                      ? formatDate(statVaccination.next_due_date)
                      : formatDate(statVaccination.date_given)}
                  </span>
                  {statVaccination.next_due_date && (
                    <VaccinationBadge nextDueDate={statVaccination.next_due_date} />
                  )}
                </>
              ) : (
                <span className="text-[13px] text-text-secondary">{t("noneRecorded")}</span>
              )}
            </div>

            {/* Next vet */}
            <div className="flex-1 bg-white rounded-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider">{t("nextVetVisit")}</span>
                <Link href="/vet-visits" className="p-2 -mr-2">
                  <ArrowUpRight size={16} className="text-text-secondary" />
                </Link>
              </div>
              {nextVetVisit ? (
                <>
                  <span className="text-[18px] font-bold text-text-primary">
                    {formatDate(nextVetVisit.next_appointment_date ?? nextVetVisit.date)}
                  </span>
                  <span className="text-[13px] text-text-secondary">
                    {nextVetVisit.next_appointment_reason ?? nextVetVisit.reason}
                  </span>
                </>
              ) : (
                <span className="text-[13px] text-text-secondary">{t("noneScheduled")}</span>
              )}
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex gap-3">
            {/* Weight */}
            <div className="flex-1 bg-white rounded-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider">{t("weightLabel")}</span>
                <Link href="/weight" className="p-2 -mr-2">
                  <ArrowUpRight size={16} className="text-text-secondary" />
                </Link>
              </div>
              {latestWeight ? (
                <>
                  <span className="text-[28px] font-bold text-text-primary leading-none">
                    {formatWeight(latestWeight.weight_kg)}
                  </span>
                  <span className="text-[13px] text-text-secondary">
                    {formatDate(latestWeight.date)}
                  </span>
                  {weightChangePct !== null && (
                    <span className={`text-[12px] font-medium ${weightChangePct >= 0 ? "text-[#166534]" : "text-[#9B1C1C]"}`}>
                      {weightChangePct >= 0 ? "↑" : "↓"} {Math.abs(weightChangePct).toFixed(1)}% {t("weightSinceLast")}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[13px] text-text-secondary">{t("notLoggedYet")}</span>
              )}
            </div>

            {/* Food */}
            <div className="flex-1 bg-white rounded-card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider">{t("foodLabel")}</span>
                <Link href="/food" className="p-2 -mr-2">
                  <ArrowUpRight size={16} className="text-text-secondary" />
                </Link>
              </div>
              {currentFood ? (
                <>
                  <span className="text-[15px] font-bold text-text-primary leading-tight">
                    {currentFood.brand}
                  </span>
                  <span className="text-[13px] text-text-secondary">
                    {currentFood.daily_amount_g ? t("perDay", { amount: currentFood.daily_amount_g }) : currentFood.product_name}
                  </span>
                </>
              ) : (
                <span className="text-[13px] text-text-secondary">{t("notSetYet")}</span>
              )}
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[18px] font-bold text-text-primary">{t("recentMilestones")}</span>
            <Link href="/milestones" className="text-[13px] text-text-secondary">{t("seeAll")}</Link>
          </div>
          {milestones && milestones.length > 0 ? (
            <MilestoneCards milestones={milestones} />
          ) : (
            <div className="bg-white rounded-card p-5 flex flex-col items-center gap-2">
              <PawPrint size={28} className="text-accent opacity-40" />
              <span className="text-[13px] text-text-secondary text-center">
                {t("noMilestonesYet", { name: puppy?.name ?? "Dobby" })}
              </span>
              <Link
                href="/milestones/new"
                className="text-[13px] font-semibold text-accent"
              >
                {t("addMilestone")}
              </Link>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
