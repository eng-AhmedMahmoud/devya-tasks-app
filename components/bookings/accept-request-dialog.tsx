'use client';

import { useEffect, useState } from 'react';
import { Loader2, UserRound, X } from 'lucide-react';
import { api, type MeetingRequest } from '@/lib/api';
import type { TeamMember } from '@/lib/types';

export function AcceptRequestDialog({
  request,
  onClose,
}: {
  request: MeetingRequest;
  onClose: (changed: boolean) => void;
}) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [ownerUserId, setOwnerUserId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .team()
      .then((t) => setTeam(t))
      .catch(() => setTeam([]));
  }, []);

  async function submit() {
    setErr(null);
    const picked = team.find((t) => t.id === ownerUserId);
    const acceptedByName =
      picked?.name?.trim() || picked?.email || customName.trim();
    if (!acceptedByName) {
      setErr('Pick a team member or enter a name.');
      return;
    }
    setBusy(true);
    try {
      await api.acceptBooking(request.id, {
        acceptedByName,
        ownerUserId: picked?.id,
      });
      onClose(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not accept');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg surface-strong p-6 rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Accept meeting request</h3>
            <p className="text-sm text-ink-300 mt-1">
              {request.clientName} · {formatWhen(request.scheduledAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="rounded-md p-1.5 text-ink-300 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block text-xs uppercase tracking-wider text-ink-400 mb-2">
          Owner — who runs this meeting?
        </label>
        <div className="grid gap-1.5 max-h-56 overflow-y-auto pr-1">
          {team.map((m) => {
            const active = ownerUserId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setOwnerUserId(m.id);
                  setCustomName('');
                }}
                className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm ${
                  active
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 bg-white/[0.025] text-ink-200 hover:bg-white/5'
                }`}
              >
                <UserRound className="h-4 w-4" />
                <div className="min-w-0">
                  <div>{m.name || m.email}</div>
                  {m.name && (
                    <div className="text-[11px] text-ink-400">{m.email}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          <label className="block text-xs uppercase tracking-wider text-ink-400 mb-1.5">
            Or someone else
          </label>
          <input
            value={customName}
            onChange={(e) => {
              setCustomName(e.target.value);
              setOwnerUserId('');
            }}
            placeholder="Name"
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-ink-500 focus:outline-none focus:border-white/30"
          />
        </div>

        {err && (
          <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="rounded-md border border-white/10 px-3 py-2 text-sm text-ink-200 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-500/30 border border-emerald-400/40 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/40 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm meeting
          </button>
        </div>
      </div>
    </div>
  );
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
