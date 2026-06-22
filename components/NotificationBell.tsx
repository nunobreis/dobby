import { Bell } from 'lucide-react';
import Link from 'next/link';

interface Props {
  unreadCount: number;
}

export default function NotificationBell({ unreadCount }: Props) {
  return (
    <Link href="/notifications">
      <div className="relative w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shadow-sm">
        <Bell size={16} className="text-text-primary" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-accent rounded-full border-[1.5px] border-background" />
        )}
      </div>
    </Link>
  );
}
