import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VetClient from "./VetClient";

export default async function VetPage() {
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

  return <VetClient puppy={puppy} />;
}
