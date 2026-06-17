import { redirect } from "next/navigation";
import Link from "next/link";
import { UtensilsCrossed, Pill, Trophy, FileText, PawPrint, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";

const sections = [
  {
    href: "/food",
    icon: UtensilsCrossed,
    label: "Food & Diet",
    description: "Current food and feeding history",
  },
  {
    href: "/medications",
    icon: Pill,
    label: "Medications",
    description: "Dewormings, flea treatment and more",
  },
  {
    href: "/milestones",
    icon: Trophy,
    label: "Milestones",
    description: "First walks, tricks and memories",
  },
  {
    href: "/documents",
    icon: FileText,
    label: "Documents",
    description: "Insurance, certificates and vet records",
  },
  {
    href: "/profile",
    icon: PawPrint,
    label: "Profile",
    description: "Dobby's details and household members",
  },
];

export default async function MorePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4">
        <h1 className="text-[28px] font-bold text-text-primary">More</h1>
      </div>

      <div className="px-5 flex flex-col gap-3">
        <div className="bg-white rounded-card overflow-hidden">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <div
                  className={`flex items-center gap-4 px-4 py-4 active:bg-[#F5F5F5] transition-colors ${
                    i < sections.length - 1 ? "border-b border-[#F0F0F0]" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-[12px] bg-lavender flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-accent" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[15px] font-semibold text-text-primary">{section.label}</span>
                    <span className="text-[12px] text-text-secondary">{section.description}</span>
                  </div>
                  <ChevronRight size={16} className="text-[#AEAEAE] shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
