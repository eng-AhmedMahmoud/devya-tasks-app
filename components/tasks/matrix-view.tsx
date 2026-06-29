'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ListPlus, Loader2, Plus, Repeat, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { todayKey } from '@/lib/dates';
import type { AuthUser, Task, TeamMember } from '@/lib/types';
import { useDialog } from '@/components/ui/dialog-provider';
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const day = todayKey();
      const items = await api.listTasks({ day, active: true });
      setTasks(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    api
      .team()
      .then((t) => setTeam(t))
      .catch(() => setTeam([]));
  }, [refresh]);

  const { carriedOver, quadrantTasks } = useMemo(() => {
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
        title: 'Delete this task?',
        message: `"${task.title}" will be permanently removed.`,
        confirmLabel: 'Delete',
        tone: 'danger',
      });
      if (!ok) return;
      try {
        await api.deleteTask(task.id);
        setOpenTaskId(null);
        await refresh();
      } catch (err) {
        await dialog.notify({
          title: 'Could not delete',
          message: err instanceof Error ? err.message : 'Unknown error',
          tone: 'danger',
        });
      }
    },
    [dialog, refresh],
  );

  const handleEdit = useCallback((task: Task) => {
    setEditing(task);
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Priority matrix</h1>
          <p className="text-sm text-ink-400 mt-1">
            Signed in as {user.name ?? user.email} · role: {user.role}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-ink-200 hover:bg-white/[0.05]"
          >
            <ListPlus className="h-4 w-4" />
            Insert daily tasks
          </button>
          <a
            href="/templates"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-ink-200 hover:bg-white/[0.05]"
          >
            <Repeat className="h-4 w-4" />
            Add daily tasks
          </a>
          <Link
            href="/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-ink-200"
          >
            <Plus className="h-4 w-4" />
            New task
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
              <h2 className="text-sm font-semibold text-white">Delayed tasks from before</h2>
              <p className="text-xs text-ink-400 mt-0.5">
                Carried over from earlier days. They stay here until marked Done or deleted.
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
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Quadrant
          number={1}
          title="Do"
          subtitle="Important + Urgent"
          accent="#EF4444"
          count={quadrantTasks.do.length}
          action={null}
        >
          <Renderer
            tasks={quadrantTasks.do}
            role={user.role}
            onOpen={(t) => setOpenTaskId(t.id)}
            onMarkDone={handleMarkDone}
            onDelay={handleDelay}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyHint="Nothing here. That's a win."
          />
        </Quadrant>
        <Quadrant
          number={2}
          title="Schedule"
          subtitle="Important + Not Urgent"
          accent="#3B82F6"
          count={quadrantTasks.schedule.length}
          action={null}
        >
          <Renderer
            tasks={quadrantTasks.schedule}
            role={user.role}
            onOpen={(t) => setOpenTaskId(t.id)}
            onMarkDone={handleMarkDone}
            onDelay={handleDelay}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyHint="No long-game work scheduled."
          />
        </Quadrant>
        <Quadrant
          number={3}
          title="Delegate"
          subtitle="Not Important + Urgent"
          accent="#F59E0B"
          count={quadrantTasks.delegate.length}
          action={null}
        >
          <Renderer
            tasks={quadrantTasks.delegate}
            role={user.role}
            onOpen={(t) => setOpenTaskId(t.id)}
            onMarkDone={handleMarkDone}
            onDelay={handleDelay}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyHint="Nothing to hand off."
          />
        </Quadrant>
        <Quadrant
          number={4}
          title="Eliminate"
          subtitle="Not Important + Not Urgent"
          accent="#737373"
          count={quadrantTasks.eliminate.length}
          action={null}
        >
          <Renderer
            tasks={quadrantTasks.eliminate}
            role={user.role}
            onOpen={(t) => setOpenTaskId(t.id)}
            onMarkDone={handleMarkDone}
            onDelay={handleDelay}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyHint="Clean."
          />
        </Quadrant>
      </div>

      {loading && (
        <div className="mt-4 text-xs text-ink-500 inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Refreshing…
        </div>
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
            title: `Inserted ${count} task${count === 1 ? '' : 's'}`,
            message: 'Selected templates added to today.',
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
}: {
  tasks: Task[];
  role: AuthUser['role'];
  onOpen: (t: Task) => void;
  onMarkDone: (t: Task) => void;
  onDelay: (t: Task) => void;
  onDelete: (t: Task) => void;
  onEdit: (t: Task) => void;
  emptyHint: string;
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
        />
      ))}
    </>
  );
}
