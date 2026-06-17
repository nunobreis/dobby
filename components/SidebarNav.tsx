"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Syringe, Scale, Stethoscope, Ellipsis } from "lucide-react";

const tabs = [
  { href: "/dashboard",    icon: House,       label: "Home" },
  { href: "/vaccinations", icon: Syringe,     label: "Vaccinations" },
  { href: "/weight",       icon: Scale,       label: "Weight" },
  { href: "/vet-visits",   icon: Stethoscope, label: "Vet" },
  { href: "/more",         icon: Ellipsis,    label: "More" },
];

const morePaths = ["/more", "/food", "/medications", "/milestones", "/documents", "/profile"];

export default function SidebarNav() {
  const pathname = usePathname();

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
