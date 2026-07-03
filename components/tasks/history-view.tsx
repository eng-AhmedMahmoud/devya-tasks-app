'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckSquare, ChevronLeft, ChevronRight, Loader2, Square } from 'lucide-react';
import { api } from '@/lib/api';
import { addDaysToKey, formatDay, todayKey } from '@/lib/dates';
import type { HistoryDay, Task, TeamMember, UserRole } from '@/lib/types';
import { useDialog } from '@/components/ui/dialog-provider';
import { BulkToolbar, BULK_DELETE_ACTION } from '@/components/ui/bulk-toolbar';
import type { BulkResult } from '@/components/ui/bulk-toolbar';
import { cn } from '@/lib/utils';
import { TaskDetailDrawer } from './task-detail-drawer';
import { CompleteDialog } from './complete-dialog';
import { DelayDialog } from './delay-dialog';
import { EditTaskDialog } from './edit-task-dialog';
import { useT } from '@/lib/i18n/client';

interface HistoryViewProps {
  role: UserRole;
}

export function HistoryView({ role }: HistoryViewProps) {
  const dialog = useDialog();
  const tr = useT();
  const [day, setDay] = useState(todayKey());
  const [data, setData] = useState<HistoryDay | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Task | null>(null);
  const [delaying, setDelaying] = useState<Task | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  // ── Batch mode ────────────────────────────────────────────────────────────
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const lastClickedId = useRef<string | null>(null);

  const exitBatchMode = useCallback(() => {
    setBatchMode(false);
    setSelectedIds(new Set());
    setBulkResult(null);
    lastClickedId.current = null;
  }, []);

  // Escape exits batch mode
  useEffect(() => {
    if (!batchMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitBatchMode();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [batchMode, exitBatchMode]);
  // ─────────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.historyForDay(day);
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('matrix.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [day, tr]);

  useEffect(() => {
    void load();
    exitBatchMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    api.team().then(setTeam).catch(() => setTeam([]));
  }, []);

  const handleDelete = useCallback(
    async (task: Task) => {
      const ok = await dialog.confirm({
        title: tr('detail.deleteTitle'),
        message: tr('detail.deleteMessage', { title: task.title }),
        confirmLabel: tr('common.delete'),
        tone: 'danger',
      });
      if (!ok) return;
      try {
        await api.deleteTask(task.id);
        setOpenTaskId(null);
        await load();
      } catch (err) {
        await dialog.notify({
          title: tr('detail.deleteFailed'),
          message: err instanceof Error ? err.message : tr('common.unknownError'),
          tone: 'danger',
        });
      }
    },
    [dialog, load, tr],
  );

  // Flat ordered list of all task ids for shift+click range
  const allTaskIds = data
    ? [...data.created, ...data.movedIn, ...data.movedOut].map((t) => t.id)
    : [];

  // ── Batch toggle with shift+click range ──────────────────────────────────
  const handleToggleSelect = useCallback(
    (taskId: string, shiftKey: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastClickedId.current) {
          const anchorIdx = allTaskIds.indexOf(lastClickedId.current);
          const targetIdx = allTaskIds.indexOf(taskId);
          if (anchorIdx !== -1 && targetIdx !== -1) {
            const [from, to] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
            const shouldSelect = !prev.has(taskId);
            for (let i = from; i <= to; i++) {
              if (shouldSelect) next.add(allTaskIds[i]);
              else next.delete(allTaskIds[i]);
            }
          }
        } else {
          if (next.has(taskId)) next.delete(taskId);
          else next.add(taskId);
        }
        lastClickedId.current = taskId;
        return next;
      });
    },
    [allTaskIds],
  );

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = allTaskIds.every((id) => prev.has(id));
      if (allSelected) return new Set<string>();
      return new Set(allTaskIds);
    });
  }, [allTaskIds]);

  // ── Bulk action ──────────────────────────────────────────────────────────
  const handleBulkAction = useCallback(
    async (actionId: string) => {
      if (actionId !== 'delete') return;
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      const ok = await dialog.confirm({
        title:
          ids.length === 1
            ? tr('bulk.confirmTitleOne', { count: ids.length })
            : tr('bulk.confirmTitle', { count: ids.length }),
        message: tr('bulk.confirmMessage'),
        confirmLabel: tr('common.delete'),
        tone: 'danger',
      });
      if (!ok) return;

      setBulkRunning(true);
      try {
        const result = await api.bulkTasks(ids, 'delete');
        setBulkResult(result);
        setSelectedIds(new Set());
        lastClickedId.current = null;
        await load();
      } catch (err) {
        await dialog.notify({
          title: tr('bulk.failed'),
          message: err instanceof Error ? err.message : tr('common.unknownError'),
          tone: 'danger',
        });
      } finally {
        setBulkRunning(false);
      }
    },
    [selectedIds, dialog, load, tr],
  );
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">{tr('history.title')}</h1>
          <p className="text-sm text-ink-400 mt-1">{tr('history.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => {
                if (batchMode) exitBatchMode();
                else setBatchMode(true);
              }}
              className={
                batchMode
                  ? 'inline-flex items-center gap-1.5 rounded-md border border-blue-500/50 bg-blue-500/10 px-3 py-2 text-sm text-blue-300'
                  : 'inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-ink-200 hover:bg-white/[0.05]'
              }
            >
              {batchMode ? (
                <><CheckSquare className="h-4 w-4" /> {tr('matrix.batchOn')}</>
              ) : (
                <><Square className="h-4 w-4" /> {tr('matrix.batch')}</>
              )}
            </button>
          )}
          <button
            onClick={() => setDay((d) => addDaysToKey(d, -1))}
            className="rounded-md border border-white/10 bg-white/[0.02] p-2 text-ink-200 hover:bg-white/[0.05]"
            aria-label={tr('history.prevDay')}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            max={todayKey()}
            className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-ink-100"
          />
          <button
            onClick={() => setDay((d) => addDaysToKey(d, 1))}
            disabled={day >= todayKey()}
            className="rounded-md border border-white/10 bg-white/[0.02] p-2 text-ink-200 hover:bg-white/[0.05] disabled:opacity-40"
            aria-label={tr('history.nextDay')}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="surface p-4 mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-400">{tr('history.viewing')}</div>
        <div className="text-lg font-semibold text-white">{formatDay(`${day}T12:00:00Z`)}</div>
      </div>

      {loading && (
        <div className="text-sm text-ink-400 inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> {tr('common.loading')}
        </div>
      )}
      {error && <div className="text-sm text-rose-300">{error}</div>}
      {data && (
        <div className="space-y-6">
          <Section
            title={tr('history.sections.createdTitle')}
            subtitle={tr('history.sections.createdSubtitle')}
            tasks={data.created}
            onOpen={(task) => setOpenTaskId(task.id)}
            batchMode={batchMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
          <Section
            title={tr('history.sections.movedInTitle')}
            subtitle={tr('history.sections.movedInSubtitle')}
            tasks={data.movedIn}
            onOpen={(task) => setOpenTaskId(task.id)}
            batchMode={batchMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
          <Section
            title={tr('history.sections.movedOutTitle')}
            subtitle={tr('history.sections.movedOutSubtitle')}
            tasks={data.movedOut}
            onOpen={(task) => setOpenTaskId(task.id)}
            batchMode={batchMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </div>
      )}

      {/* Batch toolbar */}
      {batchMode && (
        <BulkToolbar
          visibleCount={allTaskIds.length}
          selectedIds={selectedIds}
          allVisibleIds={allTaskIds}
          onToggleAll={handleToggleAll}
          onClear={() => setSelectedIds(new Set())}
          onAction={handleBulkAction}
          actions={[BULK_DELETE_ACTION]}
          running={bulkRunning}
          result={bulkResult}
          onDismissResult={() => setBulkResult(null)}
        />
      )}

      <TaskDetailDrawer
        taskId={openTaskId}
        role={role}
        onClose={() => setOpenTaskId(null)}
        onMarkDone={(t) => setCompleting(t)}
        onDelay={(t) => setDelaying(t)}
        onDelete={handleDelete}
        onEdit={role === 'SUPER_ADMIN' ? (t) => setEditing(t) : undefined}
        refreshSignal={refreshSignal}
      />
      <CompleteDialog
        task={completing}
        onClose={() => setCompleting(null)}
        onCompleted={async () => {
          setCompleting(null);
          setRefreshSignal((n) => n + 1);
          await load();
        }}
      />
      <DelayDialog
        task={delaying}
        onClose={() => setDelaying(null)}
        onDelayed={async () => {
          setDelaying(null);
          setRefreshSignal((n) => n + 1);
          await load();
        }}
      />
      <EditTaskDialog
        task={editing}
        team={team}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          setRefreshSignal((n) => n + 1);
          await load();
        }}
      />
    </>
  );
}

function Section({
  title,
  subtitle,
  tasks,
  onOpen,
  batchMode,
  selectedIds,
  onToggleSelect,
}: {
  title: string;
  subtitle: string;
  tasks: Task[];
  onOpen: (t: Task) => void;
  batchMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
}) {
  const tr = useT();
  return (
    <section>
      <header className="mb-2">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-xs text-ink-400">{subtitle}</p>
      </header>
      {tasks.length === 0 ? (
        <div className="surface px-4 py-4 text-sm text-ink-500">{tr('history.emptyGroup')}</div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const isSelected = selectedIds?.has(task.id) ?? false;
            return (
              <li key={task.id}>
                <button
                  onClick={(e) => {
                    if (batchMode && onToggleSelect) {
                      onToggleSelect(task.id, e.shiftKey);
                    } else {
                      onOpen(task);
                    }
                  }}
                  className={cn(
                    'surface w-full text-left px-4 py-3 flex flex-wrap items-center gap-2 hover:border-white/15',
                    batchMode && isSelected && 'border-blue-500/60 bg-blue-500/[0.06]',
                  )}
                >
                  {batchMode && (
                    <span
                      className="shrink-0 rounded border border-white/20 h-4 w-4 flex items-center justify-center"
                      style={isSelected ? { background: '#3B82F6', borderColor: '#3B82F6' } : {}}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 10 8" fill="none" className="h-2.5 w-2.5">
                          <path
                            d="M1 4l2.5 2.5L9 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">{task.title}</div>
                    <div className="text-xs text-ink-400 mt-0.5">
                      {tr('history.meta', {
                        owner: task.ownerUser?.name ?? task.ownerName ?? '—',
                        status: task.status,
                        quality: task.quality,
                      })}
                    </div>
                  </div>
                  {task.delays.length > 0 && (
                    <span className="chip chip-delayed">
                      {task.delays.length === 1
                        ? tr('history.delayOne', { count: task.delays.length })
                        : tr('history.delaysN', { count: task.delays.length })}
                    </span>
                  )}
                  {task.status === 'DONE' && <span className="chip chip-done">{tr('task.done')}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
