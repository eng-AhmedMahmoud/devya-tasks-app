import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { DevyaLogo } from '@/components/ui/devya-logo';
import { LoginForm } from '@/components/auth/login-form';
import { api, ApiError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const cookieHeader = (await headers()).get('cookie') ?? '';
  if (cookieHeader) {
    try {
      await api.me(cookieHeader);
      redirect('/');
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401 && err.status !== 403) throw err;
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-grid px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-8">
          <DevyaLogo width={120} />
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-300">
            Tasks
          </span>
        </div>
        <div className="surface-strong p-6">
          <h1 className="text-lg font-semibold text-white mb-1">Sign in</h1>
          <p className="text-sm text-ink-400 mb-5">Internal team access only.</p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-ink-500">
          Trouble signing in? Contact your administrator.
        </p>
      </div>
    </div>
  );
}
