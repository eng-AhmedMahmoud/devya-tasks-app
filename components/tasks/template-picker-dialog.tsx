'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { DailyTemplate } from '@/lib/types';
import { useT } from '@/lib/i18n/client';

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onInserted: (count: number) => void;
}

export function TemplatePickerDialog({ open, onClose, onInserted }: TemplatePickerDialogProps) {
  const t = useT();
  const [templates, setTemplates] = useState<DailyTemplate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setError(null);
    setLoading(true);
    api
      .listTemplates()
      .then((items) => setTemplates(items.filter((tpl) => tpl.active)))
      .catch((err) => setError(err instanceof Error ? err.message : t('matrix.failedToLoad')))
      .finally(() => setLoading(false));
  }, [open, t]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(templates.map((tpl) => tpl.id)));
  const clearAll = () => setSelected(new Set());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) {
      setError(t('picker.pickAtLeastOne'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.insertTemplates([...selected]);
      onInserted(res.inserted);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('picker.insertFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-ink-900/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <form
        onSubmit={submit}
        className="relative w-full max-w-lg max-h-full overflow-y-auto rounded-xl border border-white/10 bg-ink-800 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1.5 text-ink-400 hover:bg-white/[0.06] hover:text-white"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{t('picker.title')}</h2>
            <p className="text-sm text-ink-400 mt-1">{t('picker.subtitle')}</p>
          </div>
          {loading ? (
            <div className="text-sm text-ink-400 inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {t('picker.loading')}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-ink-400">{t('picker.emptyActive')}</div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-400">{t('picker.selectedOf', { selected: selected.size, total: templates.length })}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAll} className="text-ink-300 hover:text-white underline">
                    {t('common.selectAll')}
                  </button>
                  <button type="button" onClick={clearAll} className="text-ink-300 hover:text-white underline">
                    {t('common.clear')}
                  </button>
                </div>
              </div>
              <ul className="space-y-1 max-h-72 overflow-y-auto">
                {templates.map((tpl) => {
                  const checked = selected.has(tpl.id);
                  return (
                    <li key={tpl.id}>
                      <label
                        className={
                          'flex items-start gap-3 rounded-md border p-3 cursor-pointer ' +
                          (checked
                            ? 'border-white/30 bg-white/[0.05]'
                            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]')
                        }
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(tpl.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium text-white">{tpl.title}</span>
                            {tpl.important && <span className="chip chip-important">{t('task.important')}</span>}
                          </div>
                          {tpl.description && (
                            <div className="text-xs text-ink-400 mt-0.5 line-clamp-2">{tpl.description}</div>
                          )}
                          <div className="text-[11px] text-ink-500 mt-1">
                            {t('detail.owner')}: {tpl.ownerUser?.name ?? tpl.ownerName ?? '—'}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {error && (
            <div className="text-sm text-rose-300 rounded-md border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-ink-200 hover:bg-white/[0.05]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy || selected.size === 0}
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-1.5 text-sm font-medium text-ink-900 hover:bg-ink-200 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {selected.size === 0
              ? t('picker.insert')
              : selected.size === 1
                ? t('picker.insertOne', { count: selected.size })
                : t('picker.insertN', { count: selected.size })}
          </button>
        </div>
      </form>
    </div>
  );
}
