"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAccountProfile(displayName: string, phone: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName, phone },
  });
  if (error) throw error;
  revalidatePath("/account");
  revalidatePath("/", "layout");
}

export async function updateAvatarUrl(avatarUrl: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });
  if (error) throw error;
  revalidatePath("/account");
  revalidatePath("/", "layout");
}

export async function changePassword(newPassword: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
