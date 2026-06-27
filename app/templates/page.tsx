import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Shell } from '@/components/ui/shell';
import { TemplatesView } from '@/components/tasks/templates-view';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  try {
    const { user } = await api.me(cookieHeader);
    return (
      <Shell>
        <TemplatesView isSuperAdmin={user.role === 'SUPER_ADMIN'} />
      </Shell>
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect('/login');
    throw err;
  }
}
