"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { House, Syringe, Scale, MessageCircle, Ellipsis } from "lucide-react";

const morePaths = ["/more", "/food", "/medications", "/milestones", "/documents", "/profile", "/settings", "/account", "/vet-visits"];

const excludedPaths = ["/login", "/profile/setup"];

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  if (excludedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  const tabs = [
    { href: "/dashboard",    icon: House,        label: t("home") },
    { href: "/vaccinations", icon: Syringe,      label: t("vaccinations") },
    { href: "/weight",       icon: Scale,        label: t("weight") },
    { href: "/ai-vet",       icon: MessageCircle, label: t("aiVet") },
    { href: "/more",         icon: Ellipsis,     label: t("more") },
  ];

  return (
    <div className="lg:hidden fixed bottom-6 left-4 right-4 z-50">
      <nav className="bg-white/70 backdrop-blur-xl rounded-pill h-14 flex items-center justify-between px-3 border border-white/60">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/more"
              ? morePaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
              : pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex items-center justify-center rounded-[20px] p-[11px_14px] transition-colors ${
                active ? "bg-accent" : "bg-transparent"
              }`}
            >
              <Icon
                size={22}
                className={active ? "text-background" : "text-[#9E9E9E]"}
                strokeWidth={1.75}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
