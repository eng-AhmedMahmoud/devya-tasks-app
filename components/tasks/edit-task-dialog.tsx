'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Task, TeamMember } from '@/lib/types';

interface EditTaskDialogProps {
  task: Task | null;
  team: TeamMember[];
  onClose: () => void;
  onSaved: () => void;
}

const SOMEONE_ELSE = '__other__';

export function EditTaskDialog({ task, team, onClose, onSaved }: EditTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerChoice, setOwnerChoice] = useState<string>('');
  const [customOwner, setCustomOwner] = useState('');
  const [important, setImportant] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('17:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    if (task.ownerUserId) setOwnerChoice(task.ownerUserId);
    else if (task.ownerName) setOwnerChoice(SOMEONE_ELSE);
    else setOwnerChoice(team[0]?.id ?? SOMEONE_ELSE);
    setCustomOwner(task.ownerName ?? '');
    setImportant(task.important);
    const dl = new Date(task.deadlineAt);
    setDeadlineDate(dl.toISOString().slice(0, 10));
    setDeadlineTime(dl.toISOString().slice(11, 16));
    setError(null);
  }, [task, team]);

  const needTime = useMemo(() => {
    if (!deadlineDate) return false;
    const dl = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`);
    const diff = dl.getTime() - Date.now();
    return diff <= 2 * 24 * 60 * 60 * 1000;
  }, [deadlineDate, deadlineTime]);

  if (!task) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!deadlineDate) {
      setError('Deadline is required');
      return;
    }
    const deadlineHasTime = needTime;
    const deadlineAt = deadlineHasTime
      ? new Date(`${deadlineDate}T${deadlineTime}:00`).toISOString()
      : new Date(`${deadlineDate}T23:59:00`).toISOString();

    let ownerUserId: string | null = null;
    let ownerName: string | null = null;
    if (ownerChoice === SOMEONE_ELSE) {
      ownerName = customOwner.trim() || null;
      if (!ownerName) {
        setError('Type a name for "Someone else"');
        return;
      }
    } else if (ownerChoice) {
      ownerUserId = ownerChoice;
    } else {
      setError('Pick an owner');
      return;
    }

    setBusy(true);
    try {
      await api.updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        ownerUserId,
        ownerName,
        important,
        deadlineAt,
        deadlineHasTime,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-ink-900/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <form
        onSubmit={submit}
        className="relative w-full max-w-2xl max-h-full overflow-y-auto rounded-xl border border-white/10 bg-ink-800 shadow-2xl"
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
            <h2 className="text-lg font-semibold text-white">Edit task</h2>
            <p className="text-sm text-ink-400">Change task fields. Changes are saved and timestamped in the audit timeline.</p>
          </div>

          <Field label="Title">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[15px] text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
              maxLength={200}
            />
          </Field>

          <Field label="Description" optional>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus min-h-[64px]"
              maxLength={4000}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Important?">
              <div className="flex gap-2">
                {[
                  { v: true, l: 'Yes' },
                  { v: false, l: 'No' },
                ].map((opt) => (
                  <button
                    key={String(opt.v)}
                    type="button"
                    onClick={() => setImportant(opt.v)}
                    className={
                      'flex-1 rounded-md border px-3 py-2 text-sm ' +
                      (important === opt.v
                        ? 'border-white/30 bg-white/[0.06] text-white'
                        : 'border-white/10 bg-white/[0.02] text-ink-300 hover:bg-white/[0.04]')
                    }
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Falls upon">
              <select
                value={ownerChoice}
                onChange={(e) => setOwnerChoice(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
              >
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.email}
                  </option>
                ))}
                <option value={SOMEONE_ELSE}>Someone else…</option>
              </select>
              {ownerChoice === SOMEONE_ELSE && (
                <input
                  value={customOwner}
                  onChange={(e) => setCustomOwner(e.target.value)}
                  className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
                  placeholder="Type a name"
                  maxLength={120}
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Deadline date">
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
              />
            </Field>
            {needTime ? (
              <Field label="Deadline time (within 2 days)">
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
                />
              </Field>
            ) : (
              <div className="text-xs text-ink-400 self-end pb-2">
                Date-only deadline (more than 2 days away).
              </div>
            )}
          </div>

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
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-1.5 text-sm font-medium text-ink-900 hover:bg-ink-200 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-300 mb-1.5">
        {label} {optional && <span className="text-ink-500">(optional)</span>}
      </span>
      {children}
    </label>
  );
}
