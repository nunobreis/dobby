import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Trophy, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import { formatDate } from "@/lib/utils";

export default async function MilestonesPage() {
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

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("puppy_id", membership.puppy_id)
    .order("date", { ascending: false });

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/more">
            <ChevronLeft size={26} className="text-text-primary" />
          </Link>
          <h1 className="text-[28px] font-bold text-text-primary">Milestones</h1>
        </div>
        <Link href="/milestones/new">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <Plus size={20} className="text-white" />
          </div>
        </Link>
      </div>

      <div className="px-5">
        {milestones && milestones.length > 0 ? (
          <div className="relative">
            <div className="absolute left-[7px] top-3 bottom-3 w-[2px] bg-[#E0E0E0]" />
            <div className="flex flex-col gap-5">
              {milestones.map((m) => (
                <div key={m.id} className="flex gap-4 items-start">
                  <div className="w-4 h-4 rounded-full bg-accent shrink-0 mt-1.5 z-10" />
                  <div className="flex-1 bg-white rounded-card p-4 flex flex-col gap-2">
                    <span className="text-[12px] text-text-secondary">{formatDate(m.date)}</span>
                    <span className="text-[15px] font-bold text-text-primary">{m.title}</span>
                    {m.photo_url && (
                      <img
                        src={m.photo_url}
                        alt={m.title}
                        className="w-full rounded-[12px] object-cover max-h-56"
                      />
                    )}
                    {m.notes && (
                      <span className="text-[13px] text-text-secondary">{m.notes}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-card p-8 flex flex-col items-center gap-3">
            <Trophy size={32} className="text-accent opacity-40" />
            <span className="text-[15px] font-semibold text-text-primary">No milestones yet</span>
            <span className="text-[13px] text-text-secondary text-center">
              Record Dobby&apos;s firsts and special moments.
            </span>
            <Link href="/milestones/new" className="text-[13px] font-semibold text-accent">
              Add milestone
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
