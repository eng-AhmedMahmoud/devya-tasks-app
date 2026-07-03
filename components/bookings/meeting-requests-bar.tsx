'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Mail, Send, Copy, Loader2 } from 'lucide-react';
import { api, type MeetingRequest } from '@/lib/api';
import { useDialog } from '@/components/ui/dialog-provider';
import { appConfig } from '@/lib/config';
import { AcceptRequestDialog } from './accept-request-dialog';
import { CounterProposeDialog } from './counter-propose-dialog';

export function MeetingRequestsBar() {
  const dialog = useDialog();
  const [items, setItems] = useState<MeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<MeetingRequest | null>(null);
  const [counterTarget, setCounterTarget] = useState<MeetingRequest | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { items } = await api.listMeetingRequests();
      setItems(items);
    } catch {
      // soft fail — bar collapses
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live updates via SSE (spec ground rule: must stay in sync in real time).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const base = appConfig.apiUrl;
    if (!base) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${base}/api/bookings/stream`, {
        withCredentials: true,
      });
    } catch {
      return;
    }
    const handler = () => void refresh();
    es.addEventListener('booking-change', handler);
    es.onerror = () => {
      // browsers auto-retry; we still poll as backup below
    };
    const poll = window.setInterval(() => void refresh(), 30_000);
    return () => {
      es?.removeEventListener('booking-change', handler);
      es?.close();
      window.clearInterval(poll);
    };
  }, [refresh]);

  const visible = useMemo(
    () => items.filter((b) => b.status === 'PENDING' || b.status === 'COUNTER_PROPOSED'),
    [items],
  );

  if (loading) return null;
  if (visible.length === 0) return null;

  async function decline(req: MeetingRequest) {
    const ok = await dialog.confirm({
      title: 'Decline this meeting request?',
      message: `${req.clientName} (${req.clientEmail ?? 'no email'}) — ${formatWhen(req.scheduledAt)}.`,
      confirmLabel: 'Decline',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(req.id);
    try {
      await api.declineBooking(req.id);
      await refresh();
    } catch (e) {
      void dialog.notify({
        title: 'Heads up',
        message: e instanceof Error ? e.message : 'Could not decline',
        tone: 'warn',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container mx-auto px-4 pt-4 pb-6 sm:pb-8">
      <div className="surface-strong border border-amber-400/15 bg-amber-500/[0.04] rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="h-4 w-4 text-amber-300" />
          <h2 className="text-sm font-semibold text-white tracking-tight">
            Meeting requests
          </h2>
          <span className="rounded-full bg-amber-500/15 text-amber-200 px-2 py-0.5 text-[11px] font-medium">
            {visible.length}
          </span>
        </div>

        <ul className="grid gap-2">
          {visible.map((req) => (
            <li
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.025] px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="text-sm text-white truncate">
                  <strong>{req.clientName}</strong>
                  {req.clientEmail && (
                    <span className="text-ink-400"> ({req.clientEmail})</span>
                  )}
                </div>
                <div className="text-xs text-ink-300 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    needs a meeting on{' '}
                    <span className="text-white">{formatWhen(req.scheduledAt)}</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      color: req.calendarColor,
                      background: `${req.calendarColor}1A`,
                      border: `1px solid ${req.calendarColor}33`,
                    }}
                  >
                    {req.calendarLabel}
                  </span>
                  {req.status === 'COUNTER_PROPOSED' && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-200">
                      <Send className="h-3 w-3" />
                      Waiting on client to pick
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {req.status === 'COUNTER_PROPOSED' && req.clientPickUrl && (
                  <CopyLink url={req.clientPickUrl} />
                )}
                <button
                  type="button"
                  onClick={() => setAcceptTarget(req)}
                  disabled={busyId === req.id}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => setCounterTarget(req)}
                  disabled={busyId === req.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-ink-100 hover:bg-white/[0.08] disabled:opacity-50"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Choose other times
                </button>
                <button
                  type="button"
                  onClick={() => decline(req)}
                  disabled={busyId === req.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-ink-300 hover:text-red-300 hover:border-red-400/40 disabled:opacity-50"
                >
                  {busyId === req.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {acceptTarget && (
        <AcceptRequestDialog
          request={acceptTarget}
          onClose={(changed) => {
            setAcceptTarget(null);
            if (changed) void refresh();
          }}
        />
      )}
      {counterTarget && (
        <CounterProposeDialog
          request={counterTarget}
          onClose={(changed) => {
            setCounterTarget(null);
            if (changed) void refresh();
          }}
        />
      )}
    </div>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* noop */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1.5 text-[11px] text-ink-300 hover:text-white"
      title={url}
    >
      <Copy className="h-3 w-3" />
      {copied ? 'Copied' : 'Copy pick link'}
    </button>
  );
}

function formatWhen(iso: string): string {
  const dt = new Date(iso);
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dt);
}
