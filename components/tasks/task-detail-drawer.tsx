'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, FileText, Loader2, Pencil, RotateCw, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { appConfig } from '@/lib/config';
import { formatDateTime, formatDeadline } from '@/lib/dates';
import type { Task, UserRole } from '@/lib/types';
import { AuditTimeline } from './audit-timeline';
import { useT } from '@/lib/i18n/client';

function resolveProofUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${appConfig.apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

interface TaskDetailDrawerProps {
  taskId: string | null;
  role: UserRole;
  onClose: () => void;
  onMarkDone: (task: Task) => void;
  onDelay: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEdit?: (task: Task) => void;
  refreshSignal: number;
}

export function TaskDetailDrawer({
  taskId,
  role,
  onClose,
  onMarkDone,
  onDelay,
  onDelete,
  onEdit,
  refreshSignal,
}: TaskDetailDrawerProps) {
  const t = useT();
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
      .catch((err) => setError(err instanceof Error ? err.message : t('matrix.failedToLoad')))
      .finally(() => setLoading(false));
  }, [taskId, refreshSignal, t]);

  if (!taskId) return null;

  return (
    <div className="fixed inset-0 z-[70] flex">
      <div className="absolute inset-0 bg-ink-900/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="relative ml-auto h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-ink-850 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-ink-850/95 backdrop-blur px-6 py-4">
          <div className="text-sm uppercase tracking-wider text-ink-400">{t('detail.eyebrow')}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-400 hover:bg-white/[0.06] hover:text-white"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {loading && <div className="text-sm text-ink-400 inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}</div>}
          {error && <div className="text-sm text-rose-300">{error}</div>}
          {task && (
            <>
              <header>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {task.urgent && <span className="chip chip-urgent">{t('task.urgent')}</span>}
                  {task.important && <span className="chip chip-important">{t('task.important')}</span>}
                  {task.overdue && <span className="chip chip-overdue">{t('task.overdue')}</span>}
                  {task.status === 'DELAYED' && <span className="chip chip-delayed">{t('task.delayed')}</span>}
                  {task.status === 'DONE' && <span className="chip chip-done">{t('task.done')}</span>}
                  {task.type === 'MEETING' && <span className="chip">{t('task.meeting')}</span>}
                </div>
                <h1 className="text-xl font-semibold text-white">{task.title}</h1>
                {task.description && <p className="mt-2 text-sm text-ink-300 whitespace-pre-wrap">{task.description}</p>}
              </header>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Cell label={t('detail.owner')} value={task.ownerUser?.name ?? task.ownerName ?? t('common.unassigned')} />
                <Cell label={t('detail.status')} value={task.status} />
                <Cell label={t('detail.deadline')} value={formatDeadline(task.deadlineAt, task.deadlineHasTime)} />
                <Cell label={t('detail.created')} value={formatDateTime(task.createdAt)} />
                <Cell label={t('detail.quality')} value={task.quality} />
                {task.completedAt && <Cell label={t('detail.completed')} value={formatDateTime(task.completedAt)} />}
              </dl>

              {(task.completionFileUrl || task.completionLinkUrl || task.completionImageUrl) && (
                <section>
                  <h3 className="text-sm font-semibold text-white mb-2">{t('detail.completionProof')}</h3>
                  {task.completionFileType === 'image' && task.completionFileUrl ? (
                    <img
                      src={resolveProofUrl(task.completionFileUrl)}
                      alt="completion proof"
                      className="rounded-md border border-white/10 max-h-72 object-contain"
                    />
                  ) : task.completionImageUrl ? (
                    <img
                      src={resolveProofUrl(task.completionImageUrl)}
                      alt="completion proof"
                      className="rounded-md border border-white/10 max-h-72 object-contain"
                    />
                  ) : task.completionFileUrl ? (
                    <a
                      href={resolveProofUrl(task.completionFileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-ink-200 hover:bg-white/[0.05]"
                    >
                      <FileText className="h-4 w-4" />
                      {t('detail.openFile', { type: task.completionFileType ?? 'file' })}
                      <ExternalLink className="h-3 w-3 text-ink-400" />
                    </a>
                  ) : null}
                  {task.completionLinkUrl && (
                    <a
                      href={task.completionLinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-ink-200 hover:bg-white/[0.05]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {task.completionLinkUrl}
                    </a>
                  )}
                  {task.completionNote && (
                    <p className="mt-2 text-sm text-ink-300 whitespace-pre-wrap">{task.completionNote}</p>
                  )}
                </section>
              )}

              {task.delays.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-white mb-2">{t('detail.delayHistory')}</h3>
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
                  <div className="text-xs uppercase tracking-wider text-ink-400 mb-1">{t('detail.linkedBooking')}</div>
                  <div className="text-white">{task.booking.clientName} · {task.booking.calendarType}</div>
                  <div className="text-ink-400">{formatDateTime(task.booking.scheduledAt)} · {task.booking.durationMinutes}min</div>
                  {appConfig.adminUrl && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={`${appConfig.adminUrl}/bookings/${task.booking.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-ink-200 hover:bg-white/[0.05]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t('detail.openInBooking')}
                      </a>
                      <a
                        href={`${appConfig.adminUrl}/bookings`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-ink-200 hover:bg-white/[0.05]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t('detail.seeAllMeetings')}
                      </a>
                    </div>
                  )}
                </section>
              )}

              <section>
                <h3 className="text-sm font-semibold text-white mb-2">{t('detail.auditTimeline')}</h3>
                <AuditTimeline events={task.events ?? []} />
              </section>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                {role === 'SUPER_ADMIN' && onEdit && task.status !== 'DONE' && (
                  <button
                    onClick={() => onEdit(task)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-ink-200 hover:bg-white/[0.05]"
                  >
                    <Pencil className="h-3.5 w-3.5" /> {t('detail.actionEdit')}
                  </button>
                )}
                {task.status !== 'DONE' && (
                  <>
                    <button
                      onClick={() => onDelay(task)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-ink-200 hover:bg-white/[0.05]"
                    >
                      <RotateCw className="h-3.5 w-3.5" /> {t('detail.actionDelay')}
                    </button>
                    <button
                      onClick={() => onMarkDone(task)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-emerald-400"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('detail.actionMarkDone')}
                    </button>
                  </>
                )}
                {role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => onDelete(task)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t('detail.actionDelete')}
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
