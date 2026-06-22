"use server";

import { createClient } from "@/lib/supabase/server";

export async function markOnboardingSeen() {
  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { onboarding_seen: true } });
}
