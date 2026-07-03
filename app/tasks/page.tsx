import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Shell } from '@/components/ui/shell';
import { PageHeader } from '@/components/ui/page-header';
import { TasksListClient } from '@/components/tasks/tasks-list-client';
import type { TaskStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TasksListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: TaskStatus; page?: string }>;
}) {
  const cookieHeader = (await headers()).get('cookie') ?? '';

  let role: 'ADMIN' | 'SUPER_ADMIN' | 'TEAM' = 'ADMIN';
  try {
    const { user } = await api.me(cookieHeader);
    role = user.role;
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

  return (
    <Shell>
      <PageHeader title="All tasks" subtitle={`${total} tasks`} />
      <TasksListClient
        tasks={tasks}
        total={total}
        page={page}
        pageCount={pageCount}
        role={role}
        status={sp.status}
      />
    </Shell>
  );
}
