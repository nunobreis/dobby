'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const bytes: number[] = [];
  for (let i = 0; i < rawData.length; i++) {
    bytes.push(rawData.charCodeAt(i));
  }
  return new Uint8Array(bytes);
}

export default function PushPermissionPrompt() {
  const t = useTranslations('notifications');
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  if (permission === null || permission === 'granted' || dismissed) return null;

  const handleEnable = async () => {
    setStatus('loading');
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      setPermission(result);
      setStatus('idle');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const key = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as BufferSource,
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
    } catch {
      // Push subscription failed — in-app fallback still works
    }
    setStatus('done');
    setDismissed(true);
  };

  return (
    <div className="bg-white rounded-card p-4 flex items-start gap-3 mb-4">
      <div className="w-9 h-9 rounded-[10px] bg-lavender flex items-center justify-center flex-shrink-0">
        <Bell size={16} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-primary">{t('enablePush')}</p>
        <p className="text-[11px] text-text-secondary mt-0.5">{t('enablePushDesc')}</p>
        {permission === 'denied' ? (
          <p className="text-[11px] text-text-secondary mt-2">{t('pushBlocked')}</p>
        ) : (
          <button
            onClick={handleEnable}
            disabled={status === 'loading'}
            className="mt-2 px-3 py-1 bg-accent text-white text-[11px] font-semibold rounded-badge disabled:opacity-50"
          >
            {status === 'loading' ? '…' : t('enablePush')}
          </button>
        )}
      </div>
      <button onClick={() => setDismissed(true)} className="flex-shrink-0">
        <X size={14} className="text-text-secondary" />
      </button>
    </div>
  );
}
