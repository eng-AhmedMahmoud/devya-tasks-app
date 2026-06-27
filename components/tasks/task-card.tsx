'use client';

import { AlertTriangle, CalendarClock, CheckCircle2, Clock, MoreHorizontal, RotateCw, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDeadline, formatDateTime } from '@/lib/dates';
import type { Task, UserRole } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  role: UserRole;
  onOpen: (task: Task) => void;
  onMarkDone: (task: Task) => void;
  onDelay: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskCard({ task, role, onOpen, onMarkDone, onDelay, onDelete }: TaskCardProps) {
  const [menu, setMenu] = useState(false);
  const ownerLabel = task.ownerUser?.name ?? task.ownerName ?? 'Unassigned';
  const latestDelay = task.delays[0];
  const showDelayBadge = task.status === 'DELAYED' || task.delays.length > 0;

  return (
    <div
      className={cn(
        'group rounded-lg border bg-white/[0.02] p-3 hover:border-white/15 transition-colors text-left w-full',
        task.overdue ? 'border-rose-500/50' : 'border-white/10',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {task.overdue && (
              <span className="chip chip-overdue">
                <AlertTriangle className="h-3 w-3 mr-1" /> Overdue
              </span>
            )}
            {task.urgent && !task.overdue && <span className="chip chip-urgent">Urgent</span>}
            {task.important && <span className="chip chip-important">Important</span>}
            {showDelayBadge && (
              <span className="chip chip-delayed">
                <RotateCw className="h-3 w-3 mr-1" /> Delayed
              </span>
            )}
            {task.status === 'DONE' && (
              <span className="chip chip-done">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Done
              </span>
            )}
            {task.type === 'MEETING' && <span className="chip">Meeting</span>}
          </div>
          <div className="text-sm font-medium text-white truncate">{task.title}</div>
          {task.description && (
            <div className="text-xs text-ink-400 mt-1 line-clamp-2">{task.description}</div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {formatDeadline(task.deadlineAt, task.deadlineHasTime)}
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {ownerLabel}
            </span>
            {latestDelay && (
              <span className="inline-flex items-center gap-1 text-blue-300">
                <Clock className="h-3 w-3" />
                delayed {formatDateTime(latestDelay.delayedAt)}
              </span>
            )}
          </div>
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenu((v) => !v);
            }}
            className="rounded-md p-1 text-ink-400 hover:text-white hover:bg-white/[0.06]"
            aria-label="Task actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setMenu(false)}
                aria-hidden
              />
              <div className="absolute right-0 mt-1 z-30 w-44 rounded-md border border-white/10 bg-ink-800 shadow-xl py-1 text-sm">
                {task.status !== 'DONE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      onMarkDone(task);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-ink-200 hover:bg-white/[0.06]"
                  >
                    Mark done…
                  </button>
                )}
                {task.status !== 'DONE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      onDelay(task);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-ink-200 hover:bg-white/[0.06]"
                  >
                    Delay…
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    onOpen(task);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-ink-200 hover:bg-white/[0.06]"
                >
                  View details
                </button>
                {role === 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      onDelete(task);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-rose-300 hover:bg-white/[0.06]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
