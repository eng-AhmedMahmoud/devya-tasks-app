'use client';

import { formatDateTime } from '@/lib/dates';
import type { TaskEvent } from '@/lib/types';
import { useT } from '@/lib/i18n/client';

const EVENT_COLOR: Record<string, string> = {
  CREATED: '#A3A3A3',
  UPDATED: '#A3A3A3',
  ASSIGNED: '#3B82F6',
  IMPORTANCE_CHANGED: '#F59E0B',
  STATUS_CHANGED: '#3B82F6',
  DELAYED: '#60A5FA',
  AUTO_DELAYED: '#F59E0B',
  COMPLETED: '#10B981',
  QUALITY_RATED: '#10B981',
  BOOKING_LINKED: '#A78BFA',
  DELETED: '#EF4444',
};

export function AuditTimeline({ events }: { events: TaskEvent[] }) {
  const t = useT();
  if (!events.length) {
    return <div className="text-sm text-ink-400">{t('audit.empty')}</div>;
  }
  return (
    <ol className="space-y-3">
      {events.map((ev) => (
        <li key={ev.id} className="flex gap-3">
          <span
            className="mt-1 h-2 w-2 rounded-full shrink-0"
            style={{ background: EVENT_COLOR[ev.type] ?? '#A3A3A3' }}
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-medium text-white">{t(`audit.events.${ev.type}`) === `audit.events.${ev.type}` ? ev.type : t(`audit.events.${ev.type}`)}</span>
              <span className="text-[11px] text-ink-500">{formatDateTime(ev.createdAt)}</span>
              {ev.actor?.name && (
                <span className="text-[11px] text-ink-400">{t('common.byUser', { name: ev.actor.name })}</span>
              )}
              {!ev.actor && <span className="text-[11px] text-ink-500">{t('common.bySystem')}</span>}
            </div>
            {ev.payload != null && (
              <pre className="mt-1 text-[11px] text-ink-400 whitespace-pre-wrap break-words font-mono">
                {formatPayload(ev.payload)}
              </pre>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatPayload(p: unknown): string {
  try {
    return JSON.stringify(p, null, 2);
  } catch {
    return String(p);
  }
}
