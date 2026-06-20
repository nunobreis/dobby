import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import EmptyState from "@/components/EmptyState";
import { getTranslations } from "next-intl/server";
import MilestoneTimeline from "./MilestoneTimeline";

export default async function MilestonesPage() {
  const supabase = await createClient();
  const t = await getTranslations("milestones");

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

  const { data: puppy } = await supabase
    .from("puppies")
    .select("name")
    .eq("id", membership.puppy_id)
    .single();

  const puppyName = puppy?.name ?? "";

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("puppy_id", membership.puppy_id)
    .order("date", { ascending: false });

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center justify-between mb-1 lg:hidden">
          <BackButton />
          <Link href="/milestones/new">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-bold text-text-primary">{t("title")}</h1>
          <Link href="/milestones/new" className="hidden lg:flex">
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
          </Link>
        </div>
      </div>

      <div className="px-5 max-w-xl lg:max-w-2xl lg:mx-auto">
        {milestones && milestones.length > 0 ? (
          <MilestoneTimeline milestones={milestones} />
        ) : (
          <EmptyState
            icon={Trophy}
            title={t("emptyTitle")}
            message={t("emptyMessage", { name: puppyName })}
            ctaLabel={t("emptyCta")}
            ctaHref="/milestones/new"
          />
        )}
      </div>

    </div>
  );
}
