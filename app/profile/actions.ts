"use server";

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function invitePartner(email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("puppy_members")
    .select("puppy_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) throw new Error("No puppy found");

  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const headersList = await headers();
  const host = headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const callbackUrl = `${proto}://${host}/auth/callback`;

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { puppy_id: membership.puppy_id },
    redirectTo: callbackUrl,
  });

  if (error) {
    console.error("invitePartner error", { name: error.name, message: error.message, status: (error as { status?: number }).status });
    throw error;
  }
}
