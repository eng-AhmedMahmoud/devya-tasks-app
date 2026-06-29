import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Shell } from '@/components/ui/shell';
import { NewTaskForm } from '@/components/tasks/new-task-form';

export const dynamic = 'force-dynamic';

export default async function NewTaskPage() {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  try {
    await api.me(cookieHeader);
    return (
      <Shell>
        <NewTaskForm />
      </Shell>
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect('/login');
    throw err;
  }
}
