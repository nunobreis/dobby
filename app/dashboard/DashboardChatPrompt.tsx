"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";

export default function DashboardChatPrompt() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    const text = value.trim();
    if (!text) return;
    router.push(`/ai-vet?q=${encodeURIComponent(text)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white rounded-card p-4 flex flex-col gap-3">
      <p className="text-[15px] font-semibold text-text-primary">{t("chatPromptTitle")}</p>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chatPromptPlaceholder")}
          className="flex-1 bg-[#EBEBEB] rounded-input px-4 py-3 text-[15px] text-text-primary placeholder:text-[#AEAEAE] outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          aria-label={t("chatPromptButton")}
          className="w-11 h-11 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
        >
          <Send size={18} className="text-white" />
        </button>
      </div>
    </div>
  );
}
