import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("puppy_members")
    .select("puppy_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/profile/setup");

  const { data: puppy } = await supabase
    .from("puppies")
    .select("*")
    .eq("id", membership.puppy_id)
    .single();

  const { data: members } = await supabase
    .from("puppy_members")
    .select("user_id, member_name, joined_at")
    .eq("puppy_id", membership.puppy_id);

  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const enrichedMembers = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: { user: authUser } } = await admin.auth.admin.getUserById(m.user_id);
      return { ...m, email: authUser?.email ?? "" };
    })
  );

  return (
    <ProfileClient
      puppy={puppy}
      members={enrichedMembers}
      currentUserId={user.id}
    />
  );
}
