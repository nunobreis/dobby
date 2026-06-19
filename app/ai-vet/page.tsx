import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AiVetClient from "./AiVetClient";

export default async function AiVetPage() {
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
    .select("name")
    .eq("id", membership.puppy_id)
    .single();

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";

  return (
    <AiVetClient
      puppyName={puppy?.name ?? "Dobby"}
      displayName={displayName}
    />
  );
}
