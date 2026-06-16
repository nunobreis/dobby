import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, UtensilsCrossed } from "lucide-react";
import BackButton from "@/components/BackButton";
import EmptyState from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import { formatDate } from "@/lib/utils";

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

  const { data: entries } = await supabase
    .from("food_entries")
    .select("*")
    .eq("puppy_id", membership.puppy_id)
    .order("start_date", { ascending: false });

  const current = (entries ?? []).find((e) => !e.end_date) ?? null;
  const history = (entries ?? []).filter((e) => !!e.end_date);

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-[28px] font-bold text-text-primary">Food & Diet</h1>
        </div>
        <Link href="/food/new">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </div>
        </Link>
      </div>

      <div className="px-5 flex flex-col gap-5">
        {!current && history.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No food logged yet"
            message="Track what Dobby's eating to keep their diet consistent."
            ctaLabel="Add food"
            ctaHref="/food/new"
          />
        ) : (
          <>
            {current && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  CURRENT FOOD
                </span>
                <div className="bg-white rounded-card p-4 flex flex-col gap-2 border-l-4 border-accent">
                  <span className="text-[18px] font-bold text-text-primary">{current.brand}</span>
                  <span className="text-[14px] text-text-secondary">{current.product_name}</span>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {current.food_type && (
                      <Chip label={current.food_type} />
                    )}
                    {current.daily_amount_g && (
                      <Chip label={`${current.daily_amount_g}g / day`} />
                    )}
                    {current.meals_per_day && (
                      <Chip label={`${current.meals_per_day} meal${current.meals_per_day > 1 ? "s" : ""} / day`} />
                    )}
                  </div>
                  <span className="text-[12px] text-text-secondary mt-1">
                    Since {formatDate(current.start_date)}
                  </span>
                  {current.notes && (
                    <span className="text-[13px] text-text-secondary italic">{current.notes}</span>
                  )}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1">
                  HISTORY
                </span>
                {history.map((e) => (
                  <div key={e.id} className="bg-white rounded-card p-4 flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[15px] font-bold text-text-primary">{e.brand}</span>
                      <span className="text-[12px] text-text-secondary shrink-0">
                        {formatDate(e.start_date)} – {e.end_date ? formatDate(e.end_date) : ""}
                      </span>
                    </div>
                    <span className="text-[13px] text-text-secondary">{e.product_name}</span>
                    {e.daily_amount_g && (
                      <span className="text-[13px] text-text-secondary">{e.daily_amount_g}g / day</span>
                    )}
                  </div>
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

function Chip({ label }: { label: string }) {
  return (
    <span className="bg-lavender text-text-primary text-[12px] font-medium px-3 py-1 rounded-badge capitalize">
      {label}
    </span>
  );
}
