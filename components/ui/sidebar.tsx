'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  BarChart3,
  CalendarDays,
  ExternalLink,
  FileSignature,
  FolderKanban,
  Grid2x2,
  History,
  LayoutGrid,
  ListChecks,
  Loader2,
  LogOut,
  Repeat,
} from 'lucide-react';
import { DevyaLogo } from './devya-logo';
import { LocaleToggle } from './locale-toggle';
import { api } from '@/lib/api';
import { appConfig } from '@/lib/config';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/client';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/', labelKey: 'nav.matrix', icon: Grid2x2, exact: true },
  { href: '/tasks', labelKey: 'nav.allTasks', icon: ListChecks },
  { href: '/templates', labelKey: 'nav.templates', icon: Repeat },
  { href: '/history', labelKey: 'nav.history', icon: History },
  { href: '/assessment', labelKey: 'nav.assessment', icon: LayoutGrid },
];

interface ToolNavItem {
  href: string;
  labelKey: string;
  subKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, start] = useTransition();
  const t = useT();

  const TOOL_NAV: ToolNavItem[] = [
    ...(appConfig.pmUrl
      ? [{ href: appConfig.pmUrl, labelKey: 'nav.pm', subKey: 'nav.pmSub', icon: FolderKanban }]
      : []),
    ...(appConfig.salesUrl
      ? [{ href: appConfig.salesUrl, labelKey: 'nav.sales', subKey: 'nav.salesSub', icon: BarChart3 }]
      : []),
    ...(appConfig.contractsUrl
      ? [{ href: appConfig.contractsUrl, labelKey: 'nav.contracts', subKey: 'nav.contractsSub', icon: FileSignature }]
      : []),
    ...(appConfig.adminUrl
      ? [{ href: appConfig.adminUrl, labelKey: 'nav.admin', subKey: 'nav.adminSub', icon: CalendarDays }]
      : []),
  ];

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
          {t('app.brandBadge')}
        </span>
      </div>

      <div className="px-3 py-3 border-b border-white/[0.04] flex justify-center">
        <LocaleToggle />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-ink-500 font-medium">
            {t('shell.workspace')}
          </div>
          <ul className="space-y-0.5">
            {PRIMARY_NAV.map((item) => (
              <NavLink key={item.labelKey} item={item} active={isActive(item)} label={t(item.labelKey)} />
            ))}
          </ul>
        </div>

        {TOOL_NAV.length > 0 && (
          <div>
            <div className="px-2 mb-2 text-[10px] uppercase tracking-wider text-ink-500 font-medium">
              {t('shell.tools')}
            </div>
            <ul className="space-y-0.5">
              {TOOL_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.labelKey}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-200 hover:text-white hover:bg-white/[0.03] border border-transparent transition-colors ring-focus group"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t(item.labelKey)}</span>
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
          {t('shell.signOut')}
        </button>
      </div>
    </aside>
  );
}

function NavLink({ item, active, label }: { item: NavItem; active: boolean; label: string }) {
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
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}
