"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} className={`min-w-[44px] min-h-[44px] flex items-center justify-start ${className}`}>
      <ChevronLeft size={26} className="text-text-primary" />
    </button>
  );
}
