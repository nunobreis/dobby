'use client';
import { useTranslations } from 'next-intl';
import { Hospital, Syringe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import BackButton from '@/components/BackButton';
import PushPermissionPrompt from '@/components/PushPermissionPrompt';
import { markAllRead } from '@/lib/actions/notifications';
import type { Notification } from '@/lib/types';

interface Props {
  notifications: Notification[];
}

export default function NotificationsClient({ notifications }: Props) {
  const t = useTranslations('notifications');
  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-10">
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-[24px] font-bold text-text-primary">{t('title')}</h1>
        </div>
        {unread.length > 0 && (
          <form action={markAllRead}>
            <button type="submit" className="text-[13px] text-accent font-semibold">
              {t('markAllRead')}
            </button>
          </form>
        )}
      </div>

      <div className="px-5">
        <PushPermissionPrompt />

        {notifications.length === 0 && (
          <p className="text-text-secondary text-[14px] text-center py-16">{t('empty')}</p>
        )}

        {unread.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wide mb-2">
              {t('unread')}
            </p>
            <div className="flex flex-col gap-2">
              {unread.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          </div>
        )}

        {read.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wide mb-2">
              {t('earlier')}
            </p>
            <div className="flex flex-col gap-2 opacity-55">
              {read.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({ notification: n }: { notification: Notification }) {
  const t = useTranslations('notifications');
  const title = getTitle(n.type, n.event_date, t);
  const Icon = n.type === 'vet_visit' ? Hospital : Syringe;
  const iconBg = n.type === 'vet_visit' ? 'bg-lavender' : 'bg-pink-100';

  return (
    <div className="bg-white rounded-card p-4 flex gap-3 items-start">
      <div
        className={`w-9 h-9 rounded-[10px] ${iconBg} flex items-center justify-center flex-shrink-0`}
      >
        <Icon size={16} className="text-accent" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold text-text-primary leading-tight">{title}</p>
          {!n.read && (
            <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />
          )}
        </div>
        <p className="text-[11px] text-text-secondary mt-0.5">{n.body}</p>
        <p className="text-[10px] text-text-secondary mt-1">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function getTitle(
  type: 'vet_visit' | 'vaccination',
  eventDate: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: Record<string, any>) => string
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const event = new Date(eventDate + 'T00:00:00');
  const diffDays = Math.round((event.getTime() - today.getTime()) / 86_400_000);

  if (type === 'vet_visit') {
    return diffDays <= 1 ? t('vetVisitTomorrow') : t('vetVisitInDays', { days: diffDays });
  }
  return diffDays <= 1 ? t('vaccinationTomorrow') : t('vaccinationInDays', { days: diffDays });
}
