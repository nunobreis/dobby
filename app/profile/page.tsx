import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("user_id, joined_at")
    .eq("puppy_id", membership.puppy_id);

  return <ProfileClient puppy={puppy} members={members ?? []} currentUserId={user.id} />;
}
