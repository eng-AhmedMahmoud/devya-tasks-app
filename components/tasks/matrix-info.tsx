'use client';

import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUADRANTS = [
  {
    n: 1,
    title: 'Do',
    accent: '#EF4444',
    sub: 'Important + Urgent',
    body:
      'These tasks are both valuable and time-sensitive. They require your immediate attention because they directly affect your goals or responsibilities and cannot be postponed.',
    example: "Fixing your company's website after it goes offline.",
  },
  {
    n: 2,
    title: 'Schedule',
    accent: '#3B82F6',
    sub: 'Important + Not Urgent',
    body:
      "These tasks are essential for long-term success but don't need to be completed immediately. They are often the first to be postponed because there is no immediate pressure, even though they create the greatest future value.",
    example: 'Developing a long-term business strategy.',
  },
  {
    n: 3,
    title: 'Delegate',
    accent: '#F59E0B',
    sub: 'Not Important + Urgent',
    body:
      "These tasks need to be completed soon, but they do not require your specific expertise. Since they don't significantly contribute to your highest priorities, they should be assigned to someone else whenever possible.",
    example: 'Scheduling appointments.',
  },
  {
    n: 4,
    title: 'Eliminate',
    accent: '#737373',
    sub: 'Not Important + Not Urgent',
    body:
      'These activities neither contribute to your goals nor require immediate action. They consume time without providing meaningful value and should be minimized or avoided.',
    example: 'Mindlessly scrolling through social media.',
  },
];

export function MatrixInfo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="surface mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-white">
          <Info className="h-4 w-4 text-ink-400" />
          How to use the Eisenhower matrix
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
                <div className="text-sm font-semibold text-white">{q.title}</div>
                <div className="text-[11px] uppercase tracking-wider text-ink-400">{q.sub}</div>
              </div>
              <p className="mt-2 text-sm text-ink-200 leading-relaxed">{q.body}</p>
              <p className="mt-2 text-xs italic text-ink-400">Example: {q.example}</p>
            </div>
          ))}
          <div className="md:col-span-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-sm font-semibold text-white mb-2">How to use the matrix</div>
            <p className="text-sm text-ink-200">Whenever a new task appears, ask yourself:</p>
            <ol className="mt-1 text-sm text-ink-200 list-decimal pl-5 space-y-0.5">
              <li>Is this important?</li>
              <li>Is this urgent?</li>
            </ol>
            <p className="mt-2 text-sm text-ink-200">Your answers determine where the task belongs:</p>
            <ul className="mt-1 text-sm text-ink-200 space-y-0.5 pl-2">
              <li>
                Yes + Yes → <span className="font-semibold text-white">Do it now.</span>
              </li>
              <li>
                Yes + No → <span className="font-semibold text-white">Schedule it.</span>
              </li>
              <li>
                No + Yes → <span className="font-semibold text-white">Delegate it if possible.</span>
              </li>
              <li>
                No + No → <span className="font-semibold text-white">Eliminate it.</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
