'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface QuadrantProps {
  number: number;
  title: string;
  subtitle: string;
  accent: string;
  count: number;
  action: ReactNode;
  children: ReactNode;
}

export function Quadrant({ number, title, subtitle, accent, count, action, children }: QuadrantProps) {
  return (
    <div className="surface flex flex-col min-h-[420px]">
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{ background: accent }}
          >
            {number}
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{title}</div>
            <div className="text-[10px] uppercase tracking-wider text-ink-400">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">{count}</span>
          {action}
        </div>
      </div>
      <div className={cn('p-3 flex-1 overflow-y-auto space-y-2')}>{children}</div>
    </div>
  );
}
