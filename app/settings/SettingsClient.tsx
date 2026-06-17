"use client";

import { useTranslations } from "next-intl";
import { setLanguage, type Locale } from "@/lib/actions/settings";
import { useTransition } from "react";

const LANGUAGES: {
  locale: Locale;
  flag: string;
  nativeName: string;
}[] = [
  { locale: "en", flag: "🇬🇧", nativeName: "English" },
  { locale: "pt", flag: "🇵🇹", nativeName: "Português (Portugal)" },
];

export default function SettingsClient({
  currentLocale,
}: {
  currentLocale: Locale;
}) {
  const t = useTranslations("settings");
  const [isPending, startTransition] = useTransition();

  function handleSelect(locale: Locale) {
    if (locale === currentLocale) return;
    startTransition(async () => {
      await setLanguage(locale);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold text-text-secondary tracking-wider">
          {t("languageLabel")}
        </span>
        <div className="bg-white rounded-card overflow-hidden">
          {LANGUAGES.map(({ locale, flag, nativeName }, i) => {
            const selected = locale === currentLocale;
            return (
              <button
                key={locale}
                onClick={() => handleSelect(locale)}
                disabled={isPending}
                className={`w-full flex items-center justify-between px-4 py-4 transition-colors active:bg-[#F5F5F5] disabled:opacity-60 ${
                  i < LANGUAGES.length - 1 ? "border-b border-[#F0F0F0]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[22px]">{flag}</span>
                  <span className="text-[15px] font-semibold text-text-primary">
                    {nativeName}
                  </span>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected ? "border-accent bg-accent" : "border-[#D0D0D0]"
                  }`}
                >
                  {selected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <span className="text-[12px] text-text-secondary px-1">
          {t("autoSave")}
        </span>
      </div>
    </div>
  );
}
