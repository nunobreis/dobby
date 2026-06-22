import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const in1day = new Date(today);
  in1day.setUTCDate(in1day.getUTCDate() + 1);
  const in3days = new Date(today);
  in3days.setUTCDate(in3days.getUTCDate() + 3);

  const in1dayStr = in1day.toISOString().split('T')[0];
  const in3daysStr = in3days.toISOString().split('T')[0];

  // Fetch all puppy members
  const { data: members } = await supabase
    .from('puppy_members')
    .select('puppy_id, user_id');

  if (!members?.length) return NextResponse.json({ sent: 0, skipped: 0 });

  const puppyMembers: Record<string, string[]> = {};
  for (const m of members) {
    if (!puppyMembers[m.puppy_id]) puppyMembers[m.puppy_id] = [];
    puppyMembers[m.puppy_id].push(m.user_id);
  }
  const puppyIds = Object.keys(puppyMembers);
  const allUserIds = Array.from(new Set(members.map((m) => m.user_id)));

  // Fetch upcoming records
  const [{ data: vetVisits }, { data: vaccinations }, { data: pushSubs }] = await Promise.all([
    supabase
      .from('vet_visits')
      .select('id, puppy_id, next_appointment_date, vet_clinic, reason')
      .in('puppy_id', puppyIds)
      .in('next_appointment_date', [in1dayStr, in3daysStr]),
    supabase
      .from('vaccinations')
      .select('id, puppy_id, next_due_date, vaccine_name')
      .in('puppy_id', puppyIds)
      .in('next_due_date', [in1dayStr, in3daysStr]),
    supabase
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', allUserIds),
  ]);

  // Fetch user language preferences
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userLanguages: Record<string, string> = {};
  for (const u of users ?? []) {
    userLanguages[u.id] = (u.user_metadata?.language as string) ?? 'en';
  }

  const subsByUser: Record<string, Array<{ endpoint: string; p256dh: string; auth: string }>> = {};
  for (const s of pushSubs ?? []) {
    if (!subsByUser[s.user_id]) subsByUser[s.user_id] = [];
    subsByUser[s.user_id].push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
  }

  let sent = 0;
  let skipped = 0;

  const processRecord = async (
    type: 'vet_visit' | 'vaccination',
    record: { id: string; puppy_id: string; event_date: string; body: string },
    userIds: string[]
  ) => {
    const daysBefore = record.event_date === in1dayStr ? 1 : 3;
    for (const userId of userIds) {
      const lang = userLanguages[userId] ?? 'en';
      const { data: inserted, error } = await supabase
        .from('notifications')
        .insert({
          puppy_id: record.puppy_id,
          user_id: userId,
          type,
          body: record.body,
          reference_id: record.id,
          event_date: record.event_date,
          days_before: daysBefore,
          read: false,
          push_sent: false,
        })
        .select('id')
        .single();

      if (error || !inserted) { skipped++; continue; }

      const subs = subsByUser[userId] ?? [];
      const pushTitle =
        type === 'vet_visit'
          ? daysBefore === 1
            ? lang === 'pt' ? 'Consulta veterinária amanhã' : 'Vet visit tomorrow'
            : lang === 'pt' ? `Consulta veterinária em ${daysBefore} dias` : `Vet visit in ${daysBefore} days`
          : daysBefore === 1
          ? lang === 'pt' ? 'Vacinação amanhã' : 'Vaccination due tomorrow'
          : lang === 'pt' ? `Vacinação em ${daysBefore} dias` : `Vaccination due in ${daysBefore} days`;

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: pushTitle, body: record.body, url: '/notifications' })
          );
          await supabase.from('notifications').update({ push_sent: true }).eq('id', inserted.id);
        } catch {
          // Subscription may be expired; silently skip
        }
      }
      sent++;
    }
  };

  for (const v of vetVisits ?? []) {
    if (!v.next_appointment_date) continue;
    const body = [v.vet_clinic, v.reason].filter(Boolean).join(' · ');
    await processRecord('vet_visit', { id: v.id, puppy_id: v.puppy_id, event_date: v.next_appointment_date, body }, puppyMembers[v.puppy_id] ?? []);
  }

  for (const v of vaccinations ?? []) {
    if (!v.next_due_date) continue;
    await processRecord('vaccination', { id: v.id, puppy_id: v.puppy_id, event_date: v.next_due_date, body: v.vaccine_name }, puppyMembers[v.puppy_id] ?? []);
  }

  return NextResponse.json({ sent, skipped });
}
