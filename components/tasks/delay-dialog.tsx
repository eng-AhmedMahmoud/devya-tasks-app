'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { addDaysToKey, todayKey } from '@/lib/dates';
import type { Task } from '@/lib/types';

interface DelayDialogProps {
  task: Task | null;
  onClose: () => void;
  onDelayed: () => void;
}

export function DelayDialog({ task, onClose, onDelayed }: DelayDialogProps) {
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setDate(addDaysToKey(todayKey(), 1));
    setNote('');
    setError(null);
  }, [task]);

  if (!task) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    if (!date) return;
    setBusy(true);
    setError(null);
    try {
      await api.delayTask(task.id, { toDay: date, note: note.trim() || undefined });
      onDelayed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delay');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink-900/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-xl border border-white/10 bg-ink-800 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1.5 text-ink-400 hover:bg-white/[0.06] hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Delay task</h2>
            <p className="text-sm text-ink-400 mt-1">
              Pick a new day for <span className="text-white">"{task.title}"</span>.
            </p>
          </div>
          <label className="block">
            <span className="block text-xs font-medium text-ink-300 mb-1.5">Move to day</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={addDaysToKey(todayKey(), 1)}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-300 mb-1.5">
              Note <span className="text-ink-500">(optional)</span>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={400}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus min-h-[64px]"
              placeholder="Why is it delayed?"
            />
          </label>
          {error && (
            <div className="text-sm text-rose-300 rounded-md border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-ink-200 hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Delay
          </button>
        </div>
      </form>
    </div>
  );
}
