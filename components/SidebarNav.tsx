"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  House, Syringe, Scale, UtensilsCrossed, Pill, Trophy,
  FileText, PawPrint, Stethoscope, CalendarDays, MessageCircle, Settings,
} from "lucide-react";

export default function SidebarNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const tabs = [
    { href: "/dashboard",    icon: House,           label: t("home") },
    { href: "/vaccinations", icon: Syringe,         label: t("vaccinations") },
    { href: "/weight",       icon: Scale,           label: t("weight") },
    { href: "/food",         icon: UtensilsCrossed, label: t("food") },
    { href: "/medications",  icon: Pill,            label: t("medications") },
    { href: "/milestones",   icon: Trophy,          label: t("milestones") },
    { href: "/documents",    icon: FileText,        label: t("documents") },
    { href: "/profile",      icon: PawPrint,        label: t("profile") },
    { href: "/vet",          icon: Stethoscope,     label: t("vet") },
    { href: "/vet-visits",   icon: CalendarDays,    label: t("vetVisits") },
    { href: "/ai-vet",       icon: MessageCircle,   label: t("aiVet") },
    { href: "/settings",     icon: Settings,        label: t("settings") },
  ];

  return (
    <nav className="flex flex-col gap-1 px-3 pt-4">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active =
          pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 h-11 px-4 rounded-[10px] transition-colors ${
              active ? "bg-[#F0EBFF]" : "hover:bg-[#F5F5F5]"
            }`}
          >
            <Icon size={18} className={active ? "text-accent" : "text-text-secondary"} strokeWidth={1.75} />
            <span className={`text-[13px] font-${active ? "600" : "normal"} ${active ? "text-accent" : "text-text-secondary"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
