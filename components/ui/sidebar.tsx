'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  CalendarDays,
  ExternalLink,
  Grid2x2,
  History,
  LayoutGrid,
  Loader2,
  LogOut,
  Repeat,
} from 'lucide-react';
import { DevyaLogo } from './devya-logo';
import { api } from '@/lib/api';
import { appConfig } from '@/lib/config';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'Priority matrix', icon: Grid2x2, exact: true },
  { href: '/templates', label: 'Daily templates', icon: Repeat },
  { href: '/history', label: 'Daily history', icon: History },
  { href: '/assessment', label: 'Monthly assessment', icon: LayoutGrid },
];

const TOOL_NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; sub: string }[] = [
  ...(appConfig.adminUrl
    ? [{ href: appConfig.adminUrl, label: 'Admin & CMS', icon: CalendarDays, sub: 'Bookings + content' }]
    : []),
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();

  function handleLogout() {
    start(async () => {
      try {
        await api.logout();
      } catch {}
      router.push('/login');
      router.refresh();
    });
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/5 bg-ink-950/60 backdrop-blur-md">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/5">
        <DevyaLogo width={96} />
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-300">
          Tasks
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-ink-500 font-medium">
            Workspace
          </div>
          <ul className="space-y-0.5">
            {PRIMARY_NAV.map((item) => (
              <NavLink key={item.label} item={item} active={isActive(item)} />
            ))}
          </ul>
        </div>

        {TOOL_NAV.length > 0 && (
          <div>
            <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-ink-500 font-medium">
              Tools
            </div>
            <ul className="space-y-0.5">
              {TOOL_NAV.map((t) => {
                const Icon = t.icon;
                return (
                  <li key={t.label}>
                    <a
                      href={t.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-200 hover:text-white hover:bg-white/[0.03] border border-transparent transition-colors ring-focus group"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t.label}</span>
                      </span>
                      <ExternalLink className="h-3 w-3 text-ink-500 group-hover:text-white shrink-0" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      <div className="px-3 pb-3 space-y-2">
        <button
          onClick={handleLogout}
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-ink-200 hover:bg-white/5 hover:border-white/20 transition-colors disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Sign out
        </button>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ring-focus',
          active
            ? 'bg-white/[0.06] text-white border border-white/10'
            : 'text-ink-200 hover:text-white hover:bg-white/[0.03] border border-transparent',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}
