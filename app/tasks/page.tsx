import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Shell } from '@/components/ui/shell';
import { PageHeader } from '@/components/ui/page-header';
import { TasksListClient } from '@/components/tasks/tasks-list-client';
import type { TaskStatus } from '@/lib/types';
import { getLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/dictionary';

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
  const dict = getDictionary(await getLocale());
  const subtitle = dict.tasks.totalCount.replace('{count}', String(total));

  return (
    <Shell>
      <PageHeader title={dict.tasks.title} subtitle={subtitle} />
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
