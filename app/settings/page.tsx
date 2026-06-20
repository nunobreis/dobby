import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import BackButton from "@/components/BackButton";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = await getTranslations("settings");

  return (
    <div className="min-h-screen bg-background px-5 py-8 pb-32 lg:pb-10">
      <BackButton className="lg:hidden mb-2" />
      <h1 className="text-[28px] font-bold text-text-primary mb-8">{t("title")}</h1>
      <SettingsClient currentLocale={locale as "en" | "pt"} />
    </div>
  );
}
