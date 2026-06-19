"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { House, Syringe, Scale, MessageCircle, Ellipsis } from "lucide-react";

const morePaths = ["/more", "/food", "/medications", "/milestones", "/documents", "/profile", "/settings", "/account", "/vet-visits", "/ai-vet"];

export default function SidebarNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const tabs = [
    { href: "/dashboard",    icon: House,       label: t("home") },
    { href: "/vaccinations", icon: Syringe,     label: t("vaccinations") },
    { href: "/weight",       icon: Scale,       label: t("weight") },
    { href: "/ai-vet",       icon: MessageCircle, label: t("aiVet") },
    { href: "/more",         icon: Ellipsis,    label: t("more") },
  ];

  return (
    <nav className="flex flex-col gap-1 px-3 pt-4">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active =
          href === "/more"
            ? morePaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
            : pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
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
