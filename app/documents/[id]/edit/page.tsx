import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditDocumentClient from "./EditDocumentClient";

export default async function EditDocumentPage({
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

  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .eq("puppy_id", membership.puppy_id)
    .maybeSingle();

  if (!document) notFound();

  const { data: signedUrlData } = await supabase.storage
    .from("dobby-documents")
    .createSignedUrl(document.file_path, 3600);

  return (
    <EditDocumentClient
      document={document}
      signedUrl={signedUrlData?.signedUrl ?? null}
    />
  );
}
