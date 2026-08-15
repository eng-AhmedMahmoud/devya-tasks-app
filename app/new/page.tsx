import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isManagerRole } from '@/lib/types';
import { Shell } from '@/components/ui/shell';
import { NewTaskForm } from '@/components/tasks/new-task-form';

export const dynamic = 'force-dynamic';

export default async function NewTaskPage() {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  try {
    const { user } = await api.me(cookieHeader);
    if (!isManagerRole(user.role)) redirect('/');
    return (
      <Shell role={user.role}>
        <NewTaskForm />
      </Shell>
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect('/login');
    throw err;
  }
}
