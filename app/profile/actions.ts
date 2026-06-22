"use server";

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import * as webpush from "web-push";

export async function invitePartner(email: string, partnerName: string) {
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
    data: { puppy_id: membership.puppy_id, invited_as: partnerName || undefined },
    redirectTo: callbackUrl,
  });

  if (error) {
    console.error("invitePartner error", { name: error.name, message: error.message, status: (error as { status?: number }).status });
    throw error;
  }
}

export async function notifyPartnerJoined(puppyId: string) {
  const supabase = await createClient();
  const {
    data: { user: partner },
  } = await supabase.auth.getUser();

  if (!partner) return;

  const { data: members } = await supabase
    .from("puppy_members")
    .select("user_id, member_name")
    .eq("puppy_id", puppyId);

  if (!members || members.length < 2) return;

  const ownerMember = members.find((m) => m.user_id !== partner.id);
  if (!ownerMember) return;

  const ownerId = ownerMember.user_id;

  const { data: puppy } = await supabase
    .from("puppies")
    .select("name")
    .eq("id", puppyId)
    .single();

  const partnerMember = members.find((m) => m.user_id === partner.id);
  const partnerDisplayName = partnerMember?.member_name ?? partner.email ?? "A family member";
  const puppyName = puppy?.name ?? "your dog";

  const admin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existing } = await admin
    .from("notifications")
    .select("id")
    .eq("type", "partner_joined")
    .eq("reference_id", partner.id)
    .eq("user_id", ownerId)
    .maybeSingle();

  if (existing) return;

  const { data: { user: owner } } = await admin.auth.admin.getUserById(ownerId);
  const lang = (owner?.user_metadata?.language as string) ?? "en";

  const body =
    lang === "pt"
      ? `${partnerDisplayName} está agora a cuidar de ${puppyName} contigo`
      : `${partnerDisplayName} is now co-caring for ${puppyName} with you`;

  const today = new Date().toISOString().split("T")[0];

  const { data: inserted } = await admin
    .from("notifications")
    .insert({
      puppy_id: puppyId,
      user_id: ownerId,
      type: "partner_joined",
      body,
      reference_id: partner.id,
      event_date: today,
      days_before: null,
      read: false,
      push_sent: false,
    })
    .select("id")
    .single();

  if (!inserted) return;

  const { data: pushSubs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", ownerId);

  if (!pushSubs?.length) return;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const pushTitle = lang === "pt" ? "Membro da família entrou!" : "Family member joined!";

  for (const sub of pushSubs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: pushTitle, body, url: "/notifications" })
      );
      await admin.from("notifications").update({ push_sent: true }).eq("id", inserted.id);
    } catch {
      // Subscription may be expired; silently skip
    }
  }
}
