"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Syringe, Scale, Stethoscope, Ellipsis } from "lucide-react";

const tabs = [
  { href: "/dashboard",    icon: House,        label: "Home" },
  { href: "/vaccinations", icon: Syringe,      label: "Vaccines" },
  { href: "/weight",       icon: Scale,        label: "Weight" },
  { href: "/vet-visits",   icon: Stethoscope,  label: "Vet" },
  { href: "/profile",      icon: Ellipsis,     label: "More" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50">
      <nav className="bg-white/70 backdrop-blur-xl rounded-pill h-14 flex items-center justify-between px-3 border border-white/60">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex items-center justify-center rounded-[20px] p-[8px_14px] transition-colors ${
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
