'use client';

import { useEffect, useState } from 'react';
import { CalendarPlus, Loader2, Trash2, UserRound, X } from 'lucide-react';
import { api, type MeetingRequest } from '@/lib/api';
import type { TeamMember } from '@/lib/types';

interface SlotInput {
  date: string;
  time: string;
}

function emptySlot(): SlotInput {
  return { date: '', time: '' };
}

export function CounterProposeDialog({
  request,
  onClose,
}: {
  request: MeetingRequest;
  onClose: (changed: boolean) => void;
}) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [ownerUserId, setOwnerUserId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [slots, setSlots] = useState<SlotInput[]>([emptySlot()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .team()
      .then((t) => setTeam(t))
      .catch(() => setTeam([]));
  }, []);

  function setSlot(i: number, patch: Partial<SlotInput>) {
    setSlots((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSlot() {
    setSlots((arr) => (arr.length >= 10 ? arr : [...arr, emptySlot()]));
  }
  function removeSlot(i: number) {
    setSlots((arr) => (arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i)));
  }

  async function submit() {
    setErr(null);
    const picked = team.find((t) => t.id === ownerUserId);
    const acceptedByName =
      picked?.name?.trim() || picked?.email || customName.trim();
    if (!acceptedByName) {
      setErr('Pick a team member or enter a name — needed for the meeting task.');
      return;
    }
    const cleaned = slots
      .map((s) => ({ date: s.date.trim(), time: s.time.trim() }))
      .filter((s) => s.date && s.time);
    if (cleaned.length === 0) {
      setErr('Add at least one date + time.');
      return;
    }
    setBusy(true);
    try {
      await api.counterProposeBooking(request.id, {
        slots: cleaned,
        acceptedByName,
        note: note.trim() || undefined,
      });
      onClose(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not propose slots');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl surface-strong p-6 rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Choose other times</h3>
            <p className="text-sm text-ink-300 mt-1">
              Offer {request.clientName} alternative slots — they&apos;ll pick one by email.
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

        <div className="grid gap-2 mb-4">
          {slots.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.025] px-3 py-2"
            >
              <input
                type="date"
                value={s.date}
                onChange={(e) => setSlot(i, { date: e.target.value })}
                className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white"
              />
              <input
                type="time"
                value={s.time}
                onChange={(e) => setSlot(i, { time: e.target.value })}
                className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-white"
              />
              <button
                type="button"
                onClick={() => removeSlot(i)}
                disabled={slots.length === 1}
                className="ml-auto rounded-md p-1.5 text-ink-300 hover:text-red-300 disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addSlot}
          disabled={slots.length >= 10}
          className="inline-flex items-center gap-1.5 text-xs text-ink-200 hover:text-white disabled:opacity-50"
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Add another time
        </button>

        <div className="mt-5">
          <label className="block text-xs uppercase tracking-wider text-ink-400 mb-1.5">
            Owner — runs this meeting if the client picks one
          </label>
          <div className="grid grid-cols-2 gap-1.5">
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
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                    active
                      ? 'border-white/40 bg-white/10 text-white'
                      : 'border-white/10 bg-white/[0.025] text-ink-200 hover:bg-white/5'
                  }`}
                >
                  <UserRound className="h-3.5 w-3.5" />
                  {m.name || m.email}
                </button>
              );
            })}
          </div>
          <input
            value={customName}
            onChange={(e) => {
              setCustomName(e.target.value);
              setOwnerUserId('');
            }}
            placeholder="Or someone else (name)"
            className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-ink-500 focus:outline-none focus:border-white/30"
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs uppercase tracking-wider text-ink-400 mb-1.5">
            Note to the client (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-ink-500 focus:outline-none focus:border-white/30"
            placeholder="Any context to include in the email"
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
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ink-200 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Send proposed times
          </button>
        </div>
      </div>
    </div>
  );
}
