import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Shell } from '@/components/ui/shell';
import { AssessmentView } from '@/components/tasks/assessment-view';

export const dynamic = 'force-dynamic';

export default async function AssessmentPage() {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  try {
    const { user } = await api.me(cookieHeader);
    return (
      <Shell>
        <AssessmentView role={user.role} />
      </Shell>
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect('/login');
    throw err;
  }
}
