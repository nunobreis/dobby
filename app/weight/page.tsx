import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import WeightChart from "@/components/WeightChart";
import EmptyState from "@/components/EmptyState";
import { formatDate, formatWeight } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function WeightPage() {
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

  const [{ data: entriesAsc }, { data: puppy }] = await Promise.all([
    supabase
      .from("weight_entries")
      .select("*")
      .eq("puppy_id", membership.puppy_id)
      .order("date", { ascending: true }),
    supabase
      .from("puppies")
      .select("name")
      .eq("id", membership.puppy_id)
      .single(),
  ]);

  const t = await getTranslations("weight");
  const puppyName = puppy?.name ?? "Dobby";

  const entriesDesc = [...(entriesAsc ?? [])].reverse();

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-text-primary">{t("title")}</h1>
        <Link href="/weight/new">
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </div>
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {entriesAsc && entriesAsc.length >= 2 && (
          <div className="bg-white rounded-card p-4">
            <span className="text-[11px] font-bold text-text-secondary tracking-wider">{t("growthChart")}</span>
            <div className="mt-3">
              <WeightChart entries={entriesAsc} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {entriesDesc.length > 0 ? (
            entriesDesc.map((e) => (
              <div
                key={e.id}
                className="bg-white rounded-card p-4 flex items-center justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[22px] font-bold text-text-primary leading-none">
                    {formatWeight(e.weight_kg)}
                  </span>
                  <span className="text-[13px] text-text-secondary mt-1">
                    {formatDate(e.date)}
                  </span>
                  {e.notes && (
                    <span className="text-[13px] text-text-secondary italic">{e.notes}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              icon={Scale}
              title={t("emptyTitle")}
              message={t("emptyMessage", { name: puppyName })}
              ctaLabel={t("emptyCta")}
              ctaHref="/weight/new"
            />
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
