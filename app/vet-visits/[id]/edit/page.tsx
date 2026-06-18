import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditVetVisitClient from "./EditVetVisitClient";

export default async function EditVetVisitPage({
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

  const { data: visit } = await supabase
    .from("vet_visits")
    .select("*")
    .eq("id", params.id)
    .eq("puppy_id", membership.puppy_id)
    .maybeSingle();

  if (!visit) notFound();

  return <EditVetVisitClient visit={visit} />;
}
