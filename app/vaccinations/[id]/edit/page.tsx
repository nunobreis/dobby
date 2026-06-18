import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditVaccinationClient from "./EditVaccinationClient";

export default async function EditVaccinationPage({
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

  const { data: vaccination } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("id", params.id)
    .eq("puppy_id", membership.puppy_id)
    .maybeSingle();

  if (!vaccination) notFound();

  return <EditVaccinationClient vaccination={vaccination} />;
}
