import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Shell } from '@/components/ui/shell';
import { MatrixView } from '@/components/tasks/matrix-view';
import { MeetingRequestsBar } from '@/components/bookings/meeting-requests-bar';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  try {
    const { user } = await api.me(cookieHeader);
    return (
      <Shell>
        <MeetingRequestsBar />
        <MatrixView user={user} />
      </Shell>
    );
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) redirect('/login');
    throw err;
  }
}
