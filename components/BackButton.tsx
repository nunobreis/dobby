"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();
  return (
    <button onClick={() => router.back()}>
      <ChevronLeft size={26} className="text-text-primary" />
    </button>
  );
}
