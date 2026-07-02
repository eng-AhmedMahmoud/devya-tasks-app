import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Shell } from '@/components/ui/shell';
import { PageHeader } from '@/components/ui/page-header';
import { formatDeadline, formatDay } from '@/lib/dates';
import type { TaskStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  DELAYED: 'Delayed',
};

export default async function TasksListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: TaskStatus; page?: string }>;
}) {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  try {
    await api.me(cookieHeader);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect('/login');
    throw err;
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items: tasks, total, pageSize } = await api.listTasks(
    { status: sp.status, page },
    cookieHeader,
  );
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Preserve active filters when moving between pages.
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (sp.status) params.set('status', sp.status);
    if (p > 1) params.set('page', String(p));
    const s = params.toString();
    return s ? `/tasks?${s}` : '/tasks';
  };

  return (
    <Shell>
      <PageHeader title="All tasks" subtitle={`${total} tasks`} />

      <div className="surface overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-white/[0.06] text-ink-400">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-white/[0.04]">
                <td className="px-4 py-3 text-white">{t.title}</td>
                <td className="px-4 py-3 text-ink-300">{t.ownerUser?.name ?? t.ownerName ?? '—'}</td>
                <td className="px-4 py-3 text-ink-300">{STATUS_LABELS[t.status]}</td>
                <td className="px-4 py-3 text-ink-300">{formatDeadline(t.deadlineAt, t.deadlineHasTime)}</td>
                <td className="px-4 py-3 text-ink-300">{formatDay(t.scheduledDay)}</td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-ink-500 py-10">
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
    </Shell>
  );
}
