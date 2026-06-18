import { redirect } from "next/navigation";
import Link from "next/link";
import {
  UtensilsCrossed,
  Pill,
  Trophy,
  FileText,
  PawPrint,
  ChevronRight,
  Settings,
  Stethoscope,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function MorePage() {
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

  const { data: puppy } = await supabase
    .from("puppies")
    .select("name")
    .eq("id", membership.puppy_id)
    .single();

  const t = await getTranslations("more");
  const puppyName = puppy?.name ?? "Dobby";

  const emailPrefix = user.email?.split("@")[0] ?? "User";
  const displayName = (user.user_metadata?.display_name as string | undefined) ?? emailPrefix;
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;
  const initial = displayName[0].toUpperCase();

  const sections = [
    {
      href: "/food",
      icon: UtensilsCrossed,
      label: t("foodLabel"),
      description: t("foodDescription"),
    },
    {
      href: "/medications",
      icon: Pill,
      label: t("medicationsLabel"),
      description: t("medicationsDescription"),
    },
    {
      href: "/milestones",
      icon: Trophy,
      label: t("milestonesLabel"),
      description: t("milestonesDescription"),
    },
    {
      href: "/documents",
      icon: FileText,
      label: t("documentsLabel"),
      description: t("documentsDescription"),
    },
    {
      href: "/profile",
      icon: PawPrint,
      label: t("profileLabel"),
      description: t("profileDescription", { name: puppyName }),
    },
    {
      href: "/vet",
      icon: Stethoscope,
      label: t("vetLabel"),
      description: t("vetDescription"),
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4">
        <h1 className="text-[28px] font-bold text-text-primary">{t("title")}</h1>
      </div>

      <div className="px-5 flex flex-col gap-3">
        {/* User account card */}
        <div className="bg-white rounded-card overflow-hidden">
          <Link href="/account">
            <div className="flex items-center gap-4 px-4 py-4 active:bg-[#F5F5F5] transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#F2C4CE] flex items-center justify-center shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[16px] font-bold text-white">{initial}</span>
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[15px] font-semibold text-text-primary">{displayName}</span>
                <span className="text-[12px] text-text-secondary truncate">{user.email}</span>
              </div>
              <ChevronRight size={16} className="text-[#AEAEAE] shrink-0" />
            </div>
          </Link>
        </div>

        {/* Pet sections */}
        <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1 mt-2">
          {puppyName.toUpperCase()}
        </span>
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
                    <span className="text-[15px] font-semibold text-text-primary">
                      {section.label}
                    </span>
                    <span className="text-[12px] text-text-secondary">
                      {section.description}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-[#AEAEAE] shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* App section */}
        <span className="text-[11px] font-bold text-text-secondary tracking-wider px-1 mt-2">
          {t("sectionApp").toUpperCase()}
        </span>
        <div className="bg-white rounded-card overflow-hidden">
          <Link href="/settings">
            <div className="flex items-center gap-4 px-4 py-4 active:bg-[#F5F5F5] transition-colors">
              <div className="w-10 h-10 rounded-[12px] bg-accent flex items-center justify-center shrink-0">
                <Settings size={18} className="text-white" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[15px] font-semibold text-text-primary">
                  {t("settingsLabel")}
                </span>
                <span className="text-[12px] text-text-secondary">
                  {t("settingsDescription")}
                </span>
              </div>
              <ChevronRight size={16} className="text-[#AEAEAE] shrink-0" />
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}
