import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, UtensilsCrossed, ChevronRight } from "lucide-react";
import BackButton from "@/components/BackButton";
import EmptyState from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export default async function FoodPage() {
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

  const [{ data: entries }, { data: puppy }] = await Promise.all([
    supabase
      .from("food_entries")
      .select("*")
      .eq("puppy_id", membership.puppy_id)
      .order("start_date", { ascending: false }),
    supabase
      .from("puppies")
      .select("name")
      .eq("id", membership.puppy_id)
      .single(),
  ]);

  const t = await getTranslations("food");
  const puppyName = puppy?.name ?? "Dobby";

  const current = (entries ?? []).find((e) => !e.end_date) ?? null;
  const history = (entries ?? []).filter((e) => !!e.end_date);

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center justify-between mb-1 lg:hidden">
          <BackButton />
          <Link href="/food/new">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-text-primary">{t("title")}</h1>
          <Link href="/food/new" className="hidden lg:flex">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
          </Link>
        </div>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {!current && history.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title={t("emptyTitle")}
            message={t("emptyMessage", { name: puppyName })}
            ctaLabel={t("emptyCta")}
            ctaHref="/food/new"
          />
        ) : (
          <>
            {current && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  {t("current")}
                </span>
                <Link href={`/food/${current.id}/edit`}>
                <div className="bg-white rounded-card p-4 flex flex-col gap-2 border-l-4 border-accent active:bg-[#F5F5F5] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[18px] font-bold text-text-primary">{current.brand}</span>
                    <ChevronRight size={16} className="text-[#AEAEAE] shrink-0 mt-1" />
                  </div>
                  <span className="text-[14px] text-text-secondary">{current.product_name}</span>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {current.food_type && (
                      <Chip label={current.food_type} />
                    )}
                    {current.daily_amount_g && (
                      <Chip label={t("perDay", { amount: current.daily_amount_g })} />
                    )}
                    {current.meals_per_day && (
                      <Chip label={current.meals_per_day > 1
                        ? t("mealsPerDayPlural", { count: current.meals_per_day })
                        : t("mealsPerDay", { count: current.meals_per_day })} />
                    )}
                  </div>
                  <span className="text-[12px] text-text-secondary mt-1">
                    {t("since", { date: formatDate(current.start_date) })}
                  </span>
                  {current.notes && (
                    <span className="text-[13px] text-text-secondary italic">{current.notes}</span>
                  )}
                </div>
                </Link>
              </div>
            )}

            {history.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  {t("history")}
                </span>
                {history.map((e) => (
                  <Link key={e.id} href={`/food/${e.id}/edit`}>
                  <div className="bg-white rounded-card p-4 flex flex-col gap-1 active:bg-[#F5F5F5] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-bold text-text-primary">{e.brand}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12px] text-text-secondary">
                          {formatDate(e.start_date)} – {e.end_date ? formatDate(e.end_date) : ""}
                        </span>
                        <ChevronRight size={16} className="text-[#AEAEAE]" />
                      </div>
                    </div>
                    <span className="text-[13px] text-text-secondary">{e.product_name}</span>
                    {e.daily_amount_g && (
                      <span className="text-[13px] text-text-secondary">{t("perDay", { amount: e.daily_amount_g })}</span>
                    )}
                  </div>
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

function Chip({ label }: { label: string }) {
  return (
    <span className="bg-lavender text-text-primary text-[12px] font-medium px-3 py-1 rounded-badge capitalize">
      {label}
    </span>
  );
}
