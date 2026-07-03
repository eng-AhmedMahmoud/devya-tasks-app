'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/client';

const QUADRANTS = [
  {
    n: 1,
    titleKey: 'matrix.quadrants.doTitle',
    accent: '#EF4444',
    subKey: 'matrix.quadrants.doSubtitle',
    bodyKey: 'matrix.info.doBody',
    exampleKey: 'matrix.info.doExample',
  },
  {
    n: 2,
    titleKey: 'matrix.quadrants.scheduleTitle',
    accent: '#3B82F6',
    subKey: 'matrix.quadrants.scheduleSubtitle',
    bodyKey: 'matrix.info.scheduleBody',
    exampleKey: 'matrix.info.scheduleExample',
  },
  {
    n: 3,
    titleKey: 'matrix.quadrants.delegateTitle',
    accent: '#F59E0B',
    subKey: 'matrix.quadrants.delegateSubtitle',
    bodyKey: 'matrix.info.delegateBody',
    exampleKey: 'matrix.info.delegateExample',
  },
  {
    n: 4,
    titleKey: 'matrix.quadrants.eliminateTitle',
    accent: '#737373',
    subKey: 'matrix.quadrants.eliminateSubtitle',
    bodyKey: 'matrix.info.eliminateBody',
    exampleKey: 'matrix.info.eliminateExample',
  },
];

export function MatrixInfo() {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <div className="surface mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-white">
          <Info className="h-4 w-4 text-ink-400" />
          {t('matrix.info.toggle')}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 grid gap-4 md:grid-cols-2">
          {QUADRANTS.map((q) => (
            <div key={q.n} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  style={{ background: q.accent }}
                >
                  {q.n}
                </span>
                <div className="text-sm font-semibold text-white">{t(q.titleKey)}</div>
                <div className="text-[11px] uppercase tracking-wider text-ink-400">{t(q.subKey)}</div>
              </div>
              <p className="mt-2 text-sm text-ink-200 leading-relaxed">{t(q.bodyKey)}</p>
              <p className="mt-2 text-xs italic text-ink-400">
                {t('matrix.info.example', { text: t(q.exampleKey) })}
              </p>
            </div>
          ))}
          <div className="md:col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-sm font-semibold text-white mb-2">{t('matrix.info.howTitle')}</div>
            <p className="text-sm text-ink-200">{t('matrix.info.howIntro')}</p>
            <ol className="mt-1 text-sm text-ink-200 list-decimal pl-5 space-y-0.5">
              <li>{t('matrix.info.howQ1')}</li>
              <li>{t('matrix.info.howQ2')}</li>
            </ol>
            <p className="mt-2 text-sm text-ink-200">{t('matrix.info.howResultIntro')}</p>
            <ul className="mt-1 text-sm text-ink-200 space-y-0.5 pl-2">
              <li>
                {t('matrix.info.howYesYes')} <span className="font-semibold text-white">{t('matrix.info.howYesYesDo')}</span>
              </li>
              <li>
                {t('matrix.info.howYesNo')} <span className="font-semibold text-white">{t('matrix.info.howYesNoDo')}</span>
              </li>
              <li>
                {t('matrix.info.howNoYes')} <span className="font-semibold text-white">{t('matrix.info.howNoYesDo')}</span>
              </li>
              <li>
                {t('matrix.info.howNoNo')} <span className="font-semibold text-white">{t('matrix.info.howNoNoDo')}</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
