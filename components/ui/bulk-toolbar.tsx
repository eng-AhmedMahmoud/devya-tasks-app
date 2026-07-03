'use client';

import { useEffect, useRef } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/client';

export interface BulkAction {
  id: string;
  labelKey?: string;
  label?: string;
  icon?: React.ReactNode;
  tone?: 'danger' | 'default';
  disabled?: boolean;
}

export interface BulkResult {
  ok: number;
  failed: Array<{ id: string; reason: string }>;
}

interface BulkToolbarProps {
  /** Total visible items (for "select all visible") */
  visibleCount: number;
  selectedIds: Set<string>;
  allVisibleIds: string[];
  onToggleAll: () => void;
  onClear: () => void;
  onAction: (actionId: string) => void;
  actions: BulkAction[];
  running: boolean;
  result: BulkResult | null;
  onDismissResult: () => void;
  className?: string;
}

/**
 * Sticky bottom toolbar that appears while batch mode is active.
 * Escape is handled by the parent; this component is purely visual.
 */
export function BulkToolbar({
  visibleCount,
  selectedIds,
  allVisibleIds,
  onToggleAll,
  onClear,
  onAction,
  actions,
  running,
  result,
  onDismissResult,
  className,
}: BulkToolbarProps) {
  const t = useT();
  const n = selectedIds.size;
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));

  // Auto-dismiss result after 6 s
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!result) return;
    dismissTimer.current = setTimeout(() => onDismissResult(), 6000);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [result, onDismissResult]);

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'surface-strong shadow-xl shadow-black/50',
        'min-w-[320px] max-w-[640px] w-max',
        className,
      )}
      role="toolbar"
      aria-label={t('bulk.aria')}
    >
      {/* Result banner */}
      {result && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-white">
            <span className="text-emerald-400 font-medium">{t('bulk.deletedN', { count: result.ok })}</span>
            {result.failed.length > 0 && (
              <>
                {' · '}
                <details className="inline">
                  <summary className="cursor-pointer text-amber-400 font-medium">
                    {t('bulk.skippedN', { count: result.failed.length })}
                  </summary>
                  <ul className="absolute bottom-full mb-2 left-0 surface px-3 py-2 space-y-1 text-xs text-ink-300 max-h-40 overflow-y-auto w-80">
                    {result.failed.map((f) => (
                      <li key={f.id} className="truncate">
                        <span className="text-ink-500 font-mono text-[10px]">{f.id.slice(0, 8)}…</span>{' '}
                        {f.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </span>
          <button
            onClick={onDismissResult}
            className="ml-auto rounded p-1 text-ink-400 hover:text-white"
            aria-label={t('bulk.dismissAria')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Normal state */}
      {!result && (
        <>
          {/* Count + select-all / clear */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-white whitespace-nowrap">
              {t('bulk.selected', { count: n })}
            </span>
            <button
              onClick={onToggleAll}
              disabled={running}
              className="text-xs text-ink-300 hover:text-white disabled:opacity-40 whitespace-nowrap"
            >
              {allSelected ? t('bulk.deselectAll') : t('bulk.selectAllVisible', { count: visibleCount })}
            </button>
            <button
              onClick={onClear}
              disabled={running}
              className="text-xs text-ink-500 hover:text-ink-300 disabled:opacity-40"
              aria-label={t('bulk.clearAria')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="w-px h-5 bg-white/10 shrink-0" />

          {/* Actions */}
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              disabled={running || n === 0 || action.disabled}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40',
                action.tone === 'danger'
                  ? 'bg-rose-600/80 text-white hover:bg-rose-600'
                  : 'bg-white/[0.08] text-ink-200 hover:bg-white/[0.12]',
              )}
            >
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                action.icon
              )}
              {action.labelKey ? t(action.labelKey) : action.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/** Default delete action descriptor (re-use across views) */
export const BULK_DELETE_ACTION: BulkAction = {
  id: 'delete',
  labelKey: 'bulk.deleteAction',
  icon: <Trash2 className="h-3.5 w-3.5" />,
  tone: 'danger',
};
