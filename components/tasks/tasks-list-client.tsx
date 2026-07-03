'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckSquare, Square } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDeadline, formatDay } from '@/lib/dates';
import { useDialog } from '@/components/ui/dialog-provider';
import { BulkToolbar, BULK_DELETE_ACTION } from '@/components/ui/bulk-toolbar';
import type { BulkResult } from '@/components/ui/bulk-toolbar';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, UserRole } from '@/lib/types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  DELAYED: 'Delayed',
};

interface TasksListClientProps {
  tasks: Task[];
  total: number;
  page: number;
  pageCount: number;
  role: UserRole;
  status?: TaskStatus;
}

export function TasksListClient({
  tasks,
  total,
  page,
  pageCount,
  role,
  status,
}: TasksListClientProps) {
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (p > 1) params.set('page', String(p));
    const s = params.toString();
    return s ? `/tasks?${s}` : '/tasks';
  };

  const dialog = useDialog();
  const router = useRouter();
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // ── Batch mode ────────────────────────────────────────────────────────────
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const lastClickedIdx = useRef<number>(-1);

  const exitBatchMode = useCallback(() => {
    setBatchMode(false);
    setSelectedIds(new Set());
    setBulkResult(null);
    lastClickedIdx.current = -1;
  }, []);

  const allVisibleIds = tasks.map((t) => t.id);

  const handleToggleSelect = useCallback(
    (idx: number, taskId: string, shiftKey: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastClickedIdx.current !== -1) {
          const [from, to] =
            lastClickedIdx.current < idx
              ? [lastClickedIdx.current, idx]
              : [idx, lastClickedIdx.current];
          const shouldSelect = !prev.has(taskId);
          for (let i = from; i <= to; i++) {
            if (shouldSelect) next.add(allVisibleIds[i]);
            else next.delete(allVisibleIds[i]);
          }
        } else {
          if (next.has(taskId)) next.delete(taskId);
          else next.add(taskId);
        }
        lastClickedIdx.current = idx;
        return next;
      });
    },
    [allVisibleIds],
  );

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = allVisibleIds.every((id) => prev.has(id));
      if (allSelected) return new Set<string>();
      return new Set(allVisibleIds);
    });
  }, [allVisibleIds]);

  const handleBulkAction = useCallback(
    async (actionId: string) => {
      if (actionId !== 'delete') return;
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      const ok = await dialog.confirm({
        title: `Permanently delete ${ids.length} task${ids.length === 1 ? '' : 's'}?`,
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        tone: 'danger',
      });
      if (!ok) return;

      setBulkRunning(true);
      try {
        const result = await api.bulkTasks(ids, 'delete');
        setBulkResult(result);
        setSelectedIds(new Set());
        lastClickedIdx.current = -1;
        router.refresh();
      } catch (err) {
        await dialog.notify({
          title: 'Bulk delete failed',
          message: err instanceof Error ? err.message : 'Unknown error',
          tone: 'danger',
        });
      } finally {
        setBulkRunning(false);
      }
    },
    [selectedIds, dialog, router],
  );
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Batch toggle */}
      {isSuperAdmin && (
        <div className="mb-4 flex justify-end">
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
              <><CheckSquare className="h-4 w-4" /> Batch on</>
            ) : (
              <><Square className="h-4 w-4" /> Batch</>
            )}
          </button>
        </div>
      )}

      <div className="surface overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/[0.06] text-ink-400">
              {batchMode && <th className="px-4 py-3 w-10" aria-label="Select" />}
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, idx) => {
              const isSelected = selectedIds.has(t.id);
              return (
                <tr
                  key={t.id}
                  onClick={
                    batchMode
                      ? (e) => handleToggleSelect(idx, t.id, e.shiftKey)
                      : undefined
                  }
                  className={cn(
                    'border-b border-white/[0.04] transition-colors',
                    batchMode && 'cursor-pointer',
                    batchMode && isSelected && 'bg-blue-500/[0.06]',
                    batchMode && !isSelected && 'hover:bg-white/[0.02]',
                  )}
                >
                  {batchMode && (
                    <td className="px-4 py-3">
                      <span
                        className="rounded border border-white/20 h-4 w-4 flex items-center justify-center"
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
                    </td>
                  )}
                  <td className="px-4 py-3 text-white">{t.title}</td>
                  <td className="px-4 py-3 text-ink-300">{t.ownerUser?.name ?? t.ownerName ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-300">{STATUS_LABELS[t.status]}</td>
                  <td className="px-4 py-3 text-ink-300">{formatDeadline(t.deadlineAt, t.deadlineHasTime)}</td>
                  <td className="px-4 py-3 text-ink-300">{formatDay(t.scheduledDay)}</td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={batchMode ? 6 : 5} className="text-center text-ink-500 py-10">
                  No tasks found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2 text-sm">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-ink-200 hover:bg-white/5"
            >
              Previous
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-md border border-white/5 px-3 py-1.5 text-ink-600">
              Previous
            </span>
          )}

          <span className="text-ink-400">
            Page {page} of {pageCount}
          </span>

          {page < pageCount ? (
            <Link
              href={pageHref(page + 1)}
              className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-ink-200 hover:bg-white/5"
            >
              Next
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-md border border-white/5 px-3 py-1.5 text-ink-600">
              Next
            </span>
          )}
        </div>
      )}

      {/* Batch toolbar */}
      {batchMode && (
        <BulkToolbar
          visibleCount={tasks.length}
          selectedIds={selectedIds}
          allVisibleIds={allVisibleIds}
          onToggleAll={handleToggleAll}
          onClear={() => setSelectedIds(new Set())}
          onAction={handleBulkAction}
          actions={[BULK_DELETE_ACTION]}
          running={bulkRunning}
          result={bulkResult}
          onDismissResult={() => setBulkResult(null)}
        />
      )}

      {/* subtitle: total tasks count */}
      <p className="mt-3 text-xs text-ink-500">{total} total task{total === 1 ? '' : 's'}</p>
    </div>
  );
}
