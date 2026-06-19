import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAge, formatWeight, getVaccinationStatus } from "@/lib/utils";
import AiVetClient from "./AiVetClient";
import type { DogContext } from "@/app/api/chat/route";

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

  const puppyId = membership.puppy_id;

  const [
    { data: puppy },
    { data: weightEntries },
    { data: foodEntries },
    { data: medications },
    { data: vaccinations },
  ] = await Promise.all([
    supabase
      .from("puppies")
      .select("name, breed, date_of_birth, sex")
      .eq("id", puppyId)
      .single(),
    supabase
      .from("weight_entries")
      .select("weight_kg, date")
      .eq("puppy_id", puppyId)
      .order("date", { ascending: false })
      .limit(1),
    supabase
      .from("food_entries")
      .select("brand, product_name, daily_amount_g")
      .eq("puppy_id", puppyId)
      .is("end_date", null)
      .order("start_date", { ascending: false })
      .limit(1),
    supabase
      .from("medications")
      .select("name")
      .eq("puppy_id", puppyId)
      .is("end_date", null)
      .limit(3),
    supabase
      .from("vaccinations")
      .select("next_due_date")
      .eq("puppy_id", puppyId),
  ]);

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";
  const locale =
    (user.user_metadata?.language as string | undefined) ?? "en";

  const puppyName = puppy?.name ?? "Dobby";
  const breed = puppy?.breed ?? "Golden Retriever";
  const age = puppy?.date_of_birth ? calculateAge(puppy.date_of_birth) : null;
  const sex = puppy?.sex ?? null;

  const latestWeight =
    weightEntries && weightEntries.length > 0
      ? formatWeight(weightEntries[0].weight_kg)
      : null;

  const currentFood =
    foodEntries && foodEntries.length > 0
      ? `${foodEntries[0].brand} ${foodEntries[0].product_name}${foodEntries[0].daily_amount_g ? `, ${foodEntries[0].daily_amount_g}g/day` : ""}`
      : null;

  const activeMeds =
    medications && medications.length > 0
      ? medications.map((m) => m.name).join(", ")
      : null;

  let vaccinationStatus: string | null = null;
  if (vaccinations && vaccinations.length > 0) {
    const statuses = vaccinations.map((v) =>
      getVaccinationStatus(v.next_due_date)
    );
    if (statuses.includes("overdue")) vaccinationStatus = "overdue";
    else if (statuses.includes("due_soon")) vaccinationStatus = "due soon";
    else vaccinationStatus = "up to date";
  }

  const context: DogContext = {
    puppyName,
    breed,
    age: age ?? "unknown",
    sex,
    weight: latestWeight,
    food: currentFood,
    medications: activeMeds,
    vaccinationStatus,
    locale,
  };

  return <AiVetClient context={context} displayName={displayName} />;
}
