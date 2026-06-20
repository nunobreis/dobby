import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditWeightClient from "./EditWeightClient";

export default async function EditWeightPage({
  params,
}: {
  params: { id: string };
}) {
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

  const { data: weightEntry } = await supabase
    .from("weight_entries")
    .select("*")
    .eq("id", params.id)
    .eq("puppy_id", membership.puppy_id)
    .maybeSingle();

  if (!weightEntry) notFound();

  return <EditWeightClient weightEntry={weightEntry} />;
}
