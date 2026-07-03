'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckSquare, ListPlus, Loader2, Plus, Repeat, Sparkles, Square } from 'lucide-react';
import { api } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import type { AuthUser, Task, TeamMember } from '@/lib/types';
import { useDialog } from '@/components/ui/dialog-provider';
import { BulkToolbar, BULK_DELETE_ACTION } from '@/components/ui/bulk-toolbar';
import type { BulkResult } from '@/components/ui/bulk-toolbar';
import { useT } from '@/lib/i18n/client';
import { MatrixInfo } from './matrix-info';
import { Quadrant } from './quadrant';
import { TaskCard } from './task-card';
import { CompleteDialog } from './complete-dialog';
import { DelayDialog } from './delay-dialog';
import { TaskDetailDrawer } from './task-detail-drawer';
import { TemplatePickerDialog } from './template-picker-dialog';
import { EditTaskDialog } from './edit-task-dialog';

interface MatrixViewProps {
  user: AuthUser;
}

export function MatrixView({ user }: MatrixViewProps) {
  const dialog = useDialog();
  const t = useT();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Task | null>(null);
  const [delaying, setDelaying] = useState<Task | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // ── Batch mode ────────────────────────────────────────────────────────────
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  // Anchor for shift+click range selection (ordered list of all visible tasks)
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const day = todayKey();
      const { items } = await api.listTasks({ day, active: true, pageSize: 200 });
      setTasks(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('matrix.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
    api
      .team()
      .then((t) => setTeam(t))
      .catch(() => setTeam([]));
  }, [refresh]);

  const { carriedOver, quadrantTasks, allTaskIds } = useMemo(() => {
    const sortFn = (a: Task, b: Task) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.important !== b.important) return a.important ? -1 : 1;
      return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
    };
    const list = [...tasks].sort(sortFn);
    const carried = list.filter(
      (t) => t.status === 'DELAYED' && t.delays.length > 0 && t.creationDay !== t.scheduledDay,
    );
    const carriedIds = new Set(carried.map((t) => t.id));
    const rest = list.filter((t) => !carriedIds.has(t.id));
    return {
      carriedOver: carried,
      quadrantTasks: {
        do: rest.filter((t) => t.important && (t.urgent || t.overdue)),
        schedule: rest.filter((t) => t.important && !(t.urgent || t.overdue)),
        delegate: rest.filter((t) => !t.important && (t.urgent || t.overdue)),
        eliminate: rest.filter((t) => !t.important && !(t.urgent || t.overdue)),
      },
      allTaskIds: list.map((t) => t.id),
    };
  }, [tasks]);

  const handleMarkDone = useCallback((task: Task) => {
    setCompleting(task);
  }, []);

  const handleDelay = useCallback((task: Task) => {
    setDelaying(task);
  }, []);

  const handleDelete = useCallback(
    async (task: Task) => {
      const ok = await dialog.confirm({
        title: t('detail.deleteTitle'),
        message: t('detail.deleteMessage', { title: task.title }),
        confirmLabel: t('common.delete'),
        tone: 'danger',
      });
      if (!ok) return;
      try {
        await api.deleteTask(task.id);
        setOpenTaskId(null);
        await refresh();
      } catch (err) {
        await dialog.notify({
          title: t('detail.deleteFailed'),
          message: err instanceof Error ? err.message : t('common.unknownError'),
          tone: 'danger',
        });
      }
    },
    [dialog, refresh, t],
  );

  const handleEdit = useCallback((task: Task) => {
    setEditing(task);
  }, []);

  // ── Batch toggle-select with shift+click range ────────────────────────────
  const handleToggleSelect = useCallback(
    (task: Task, shiftKey: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (shiftKey && lastClickedId.current) {
          // Range: find indices in the master flat list
          const anchorIdx = allTaskIds.indexOf(lastClickedId.current);
          const targetIdx = allTaskIds.indexOf(task.id);
          if (anchorIdx !== -1 && targetIdx !== -1) {
            const [from, to] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
            const shouldSelect = !prev.has(task.id);
            for (let i = from; i <= to; i++) {
              if (shouldSelect) next.add(allTaskIds[i]);
              else next.delete(allTaskIds[i]);
            }
          }
        } else {
          if (next.has(task.id)) next.delete(task.id);
          else next.add(task.id);
        }
        lastClickedId.current = task.id;
        return next;
      });
    },
    [allTaskIds],
  );

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = allTaskIds.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(allTaskIds);
    });
  }, [allTaskIds]);

  // ── Bulk action handler ───────────────────────────────────────────────────
  const handleBulkAction = useCallback(
    async (actionId: string) => {
      if (actionId !== 'delete') return;
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;

      const ok = await dialog.confirm({
        title:
          ids.length === 1
            ? t('bulk.confirmTitleOne', { count: ids.length })
            : t('bulk.confirmTitle', { count: ids.length }),
        message: t('bulk.confirmMessage'),
        confirmLabel: t('common.delete'),
        tone: 'danger',
      });
      if (!ok) return;

      setBulkRunning(true);
      try {
        const result = await api.bulkTasks(ids, 'delete');
        setBulkResult(result);
        setSelectedIds(new Set());
        lastClickedId.current = null;
        await refresh();
      } catch (err) {
        await dialog.notify({
          title: t('bulk.failed'),
          message: err instanceof Error ? err.message : t('common.unknownError'),
          tone: 'danger',
        });
      } finally {
        setBulkRunning(false);
      }
    },
    [selectedIds, dialog, refresh, t],
  );
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t('matrix.title')}</h1>
          <p className="text-sm text-ink-400 mt-1">
            {t('matrix.signedInAs', { name: user.name ?? user.email, role: user.role })}
          </p>
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
                <><CheckSquare className="h-4 w-4" /> {t('matrix.batchOn')}</>
              ) : (
                <><Square className="h-4 w-4" /> {t('matrix.batch')}</>
              )}
            </button>
          )}
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-ink-200 hover:bg-white/[0.05]"
          >
            <ListPlus className="h-4 w-4" />
            {t('matrix.insertDaily')}
          </button>
          <a
            href="/templates"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-ink-200 hover:bg-white/[0.05]"
          >
            <Repeat className="h-4 w-4" />
            {t('matrix.addDaily')}
          </a>
          <Link
            href="/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-ink-200"
          >
            <Plus className="h-4 w-4" />
            {t('matrix.newTask')}
          </Link>
        </div>
      </div>

      <MatrixInfo />

      {error && (
        <div className="surface px-4 py-3 mb-4 text-sm text-rose-300 border-rose-500/30">{error}</div>
      )}

      {carriedOver.length > 0 && (
        <section className="surface mb-4 border-blue-500/30">
          <div className="px-4 py-3 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">{t('matrix.delayedFromBefore')}</h2>
              <p className="text-xs text-ink-400 mt-0.5">
                {t('matrix.delayedFromBeforeSubtitle')}
              </p>
            </div>
            <span className="chip chip-delayed">{carriedOver.length}</span>
          </div>
          <div className="p-3 space-y-2">
            {carriedOver.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                role={user.role}
                onOpen={(task) => setOpenTaskId(task.id)}
                onMarkDone={handleMarkDone}
                onDelay={handleDelay}
                onDelete={handleDelete}
                onEdit={user.role === 'SUPER_ADMIN' ? handleEdit : undefined}
                batchMode={batchMode}
                selected={selectedIds.has(t.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Quadrant
          number={1}
          title={t('matrix.quadrants.doTitle')}
          subtitle={t('matrix.quadrants.doSubtitle')}
          accent="#EF4444"
          count={quadrantTasks.do.length}
          action={null}
        >
          <Renderer
            tasks={quadrantTasks.do}
            role={user.role}
            onOpen={(task) => setOpenTaskId(task.id)}
            onMarkDone={handleMarkDone}
            onDelay={handleDelay}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyHint={t('matrix.quadrants.doEmpty')}
            batchMode={batchMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </Quadrant>
        <Quadrant
          number={2}
          title={t('matrix.quadrants.scheduleTitle')}
          subtitle={t('matrix.quadrants.scheduleSubtitle')}
          accent="#3B82F6"
          count={quadrantTasks.schedule.length}
          action={null}
        >
          <Renderer
            tasks={quadrantTasks.schedule}
            role={user.role}
            onOpen={(task) => setOpenTaskId(task.id)}
            onMarkDone={handleMarkDone}
            onDelay={handleDelay}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyHint={t('matrix.quadrants.scheduleEmpty')}
            batchMode={batchMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </Quadrant>
        <Quadrant
          number={3}
          title={t('matrix.quadrants.delegateTitle')}
          subtitle={t('matrix.quadrants.delegateSubtitle')}
          accent="#F59E0B"
          count={quadrantTasks.delegate.length}
          action={null}
        >
          <Renderer
            tasks={quadrantTasks.delegate}
            role={user.role}
            onOpen={(task) => setOpenTaskId(task.id)}
            onMarkDone={handleMarkDone}
            onDelay={handleDelay}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyHint={t('matrix.quadrants.delegateEmpty')}
            batchMode={batchMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </Quadrant>
        <Quadrant
          number={4}
          title={t('matrix.quadrants.eliminateTitle')}
          subtitle={t('matrix.quadrants.eliminateSubtitle')}
          accent="#737373"
          count={quadrantTasks.eliminate.length}
          action={null}
        >
          <Renderer
            tasks={quadrantTasks.eliminate}
            role={user.role}
            onOpen={(task) => setOpenTaskId(task.id)}
            onMarkDone={handleMarkDone}
            onDelay={handleDelay}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyHint={t('matrix.quadrants.eliminateEmpty')}
            batchMode={batchMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </Quadrant>
      </div>

      {loading && (
        <div className="mt-4 text-xs text-ink-500 inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('common.refreshing')}
        </div>
      )}

      {/* Batch toolbar (shown when batchMode active) */}
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

      <CompleteDialog
        task={completing}
        onClose={() => setCompleting(null)}
        onCompleted={async () => {
          setCompleting(null);
          setDetailRefresh((n) => n + 1);
          await refresh();
        }}
      />
      <DelayDialog
        task={delaying}
        onClose={() => setDelaying(null)}
        onDelayed={async () => {
          setDelaying(null);
          setDetailRefresh((n) => n + 1);
          await refresh();
        }}
      />
      <TaskDetailDrawer
        taskId={openTaskId}
        role={user.role}
        onClose={() => setOpenTaskId(null)}
        onMarkDone={handleMarkDone}
        onDelay={handleDelay}
        onDelete={handleDelete}
        onEdit={user.role === 'SUPER_ADMIN' ? handleEdit : undefined}
        refreshSignal={detailRefresh}
      />
      <TemplatePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onInserted={async (count) => {
          setPickerOpen(false);
          await dialog.notify({
            title:
              count === 1
                ? t('picker.insertedTitleOne', { count })
                : t('picker.insertedTitle', { count }),
            message: t('picker.insertedMessage'),
            tone: 'success',
          });
          await refresh();
        }}
      />
      <EditTaskDialog
        task={editing}
        team={team}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          setDetailRefresh((n) => n + 1);
          await refresh();
        }}
      />
    </>
  );
}

function Renderer({
  tasks,
  role,
  onOpen,
  onMarkDone,
  onDelay,
  onDelete,
  onEdit,
  emptyHint,
  batchMode,
  selectedIds,
  onToggleSelect,
}: {
  tasks: Task[];
  role: AuthUser['role'];
  onOpen: (t: Task) => void;
  onMarkDone: (t: Task) => void;
  onDelay: (t: Task) => void;
  onDelete: (t: Task) => void;
  onEdit: (t: Task) => void;
  emptyHint: string;
  batchMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (task: Task, shiftKey: boolean) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
        <Sparkles className="h-4 w-4 text-ink-500" />
        <div className="text-xs text-ink-500">{emptyHint}</div>
      </div>
    );
  }
  return (
    <>
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          role={role}
          onOpen={onOpen}
          onMarkDone={onMarkDone}
          onDelay={onDelay}
          onDelete={onDelete}
          onEdit={onEdit}
          batchMode={batchMode}
          selected={selectedIds?.has(t.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </>
  );
}
