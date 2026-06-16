import { PawPrint } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function EmptyState({ icon: Icon = PawPrint, title, message, ctaLabel, ctaHref }: Props) {
  return (
    <div className="bg-white rounded-card p-8 flex flex-col items-center gap-3">
      <Icon size={32} className="text-accent opacity-40" />
      <span className="text-[15px] font-semibold text-text-primary">{title}</span>
      <span className="text-[13px] text-text-secondary text-center">{message}</span>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="text-[13px] font-semibold text-accent">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
