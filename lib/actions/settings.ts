"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type Locale = "en" | "pt";

export async function setLanguage(locale: Locale) {
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { language: locale } });
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  revalidatePath("/", "layout");
}
