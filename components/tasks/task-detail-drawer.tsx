'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RotateCw, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime, formatDeadline } from '@/lib/dates';
import type { Task, UserRole } from '@/lib/types';
import { AuditTimeline } from './audit-timeline';

interface TaskDetailDrawerProps {
  taskId: string | null;
  role: UserRole;
  onClose: () => void;
  onMarkDone: (task: Task) => void;
  onDelay: (task: Task) => void;
  onDelete: (task: Task) => void;
  refreshSignal: number;
}

export function TaskDetailDrawer({
  taskId,
  role,
  onClose,
  onMarkDone,
  onDelay,
  onDelete,
  refreshSignal,
}: TaskDetailDrawerProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .getTask(taskId)
      .then(setTask)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [taskId, refreshSignal]);

  if (!taskId) return null;

  return (
    <div className="fixed inset-0 z-[70] flex">
      <div className="absolute inset-0 bg-ink-900/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="relative ml-auto h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-ink-850 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-ink-850/95 backdrop-blur px-6 py-4">
          <div className="text-sm uppercase tracking-wider text-ink-400">Task detail</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-400 hover:bg-white/[0.06] hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {loading && <div className="text-sm text-ink-400 inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
          {error && <div className="text-sm text-rose-300">{error}</div>}
          {task && (
            <>
              <header>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {task.urgent && <span className="chip chip-urgent">Urgent</span>}
                  {task.important && <span className="chip chip-important">Important</span>}
                  {task.overdue && <span className="chip chip-overdue">Overdue</span>}
                  {task.status === 'DELAYED' && <span className="chip chip-delayed">Delayed</span>}
                  {task.status === 'DONE' && <span className="chip chip-done">Done</span>}
                  {task.type === 'MEETING' && <span className="chip">Meeting</span>}
                </div>
                <h1 className="text-xl font-semibold text-white">{task.title}</h1>
                {task.description && <p className="mt-2 text-sm text-ink-300 whitespace-pre-wrap">{task.description}</p>}
              </header>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Cell label="Owner" value={task.ownerUser?.name ?? task.ownerName ?? 'Unassigned'} />
                <Cell label="Status" value={task.status} />
                <Cell label="Deadline" value={formatDeadline(task.deadlineAt, task.deadlineHasTime)} />
                <Cell label="Created" value={formatDateTime(task.createdAt)} />
                <Cell label="Quality" value={task.quality} />
                {task.completedAt && <Cell label="Completed" value={formatDateTime(task.completedAt)} />}
              </dl>

              {task.completionImageUrl && (
                <section>
                  <h3 className="text-sm font-semibold text-white mb-2">Completion proof</h3>
                  <img
                    src={task.completionImageUrl}
                    alt="completion proof"
                    className="rounded-md border border-white/10 max-h-72 object-contain"
                  />
                  {task.completionNote && (
                    <p className="mt-2 text-sm text-ink-300 whitespace-pre-wrap">{task.completionNote}</p>
                  )}
                </section>
              )}

              {task.delays.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-white mb-2">Delay history</h3>
                  <ul className="space-y-1 text-sm text-ink-300">
                    {task.delays.map((d) => (
                      <li key={d.id} className="flex items-center gap-2">
                        <RotateCw className="h-3 w-3 text-blue-300" />
                        {d.fromDay} → {d.toDay} · {d.reason} · {formatDateTime(d.delayedAt)}
                        {d.note && <span className="text-ink-500">— {d.note}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {task.booking && (
                <section className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
                  <div className="text-xs uppercase tracking-wider text-ink-400 mb-1">Linked booking</div>
                  <div className="text-white">{task.booking.clientName} · {task.booking.calendarType}</div>
                  <div className="text-ink-400">{formatDateTime(task.booking.scheduledAt)} · {task.booking.durationMinutes}min</div>
                </section>
              )}

              <section>
                <h3 className="text-sm font-semibold text-white mb-2">Audit timeline</h3>
                <AuditTimeline events={task.events ?? []} />
              </section>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                {task.status !== 'DONE' && (
                  <>
                    <button
                      onClick={() => onDelay(task)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-ink-200 hover:bg-white/[0.05]"
                    >
                      <RotateCw className="h-3.5 w-3.5" /> Delay
                    </button>
                    <button
                      onClick={() => onMarkDone(task)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-emerald-400"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark done
                    </button>
                  </>
                )}
                {role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => onDelete(task)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="text-sm text-white mt-0.5">{value}</div>
    </div>
  );
}
