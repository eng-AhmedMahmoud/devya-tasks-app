'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, User } from 'lucide-react';
import type { TeamMember } from '@/lib/types';
import { useT } from '@/lib/i18n/client';

export const SOMEONE_ELSE = '__other__';

interface OwnerSelectProps {
  team: TeamMember[];
  value: string;
  onChange: (next: string) => void;
  customName: string;
  onCustomNameChange: (next: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function OwnerSelect({
  team,
  value,
  onChange,
  customName,
  onCustomNameChange,
  loading,
  error,
}: OwnerSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const t = useT();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = team.find((m) => m.id === value);
  const isOther = value === SOMEONE_ELSE;
  const label = loading
    ? t('owner.loading')
    : selected
      ? selected.name ?? selected.email
      : isOther
        ? t('owner.someoneElse')
        : t('owner.pick');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !loading && setOpen((v) => !v)}
        disabled={loading}
        className={
          'w-full flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 hover:bg-white/[0.05] focus:outline-none focus:border-white/30 ring-focus disabled:opacity-60 ' +
          (open ? 'border-white/30 bg-white/[0.06]' : '')
        }
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 truncate text-left">
          <User className="h-3.5 w-3.5 text-ink-400 shrink-0" />
          <span className={selected || isOther ? 'text-ink-100' : 'text-ink-500'}>{label}</span>
        </span>
        <ChevronDown className={'h-4 w-4 text-ink-400 transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-md border border-white/10 bg-ink-800 shadow-2xl py-1 text-sm"
        >
          {team.map((m) => {
            const active = value === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                  className={
                    'w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-white/[0.06] ' +
                    (active ? 'bg-white/[0.04] text-white' : 'text-ink-200')
                  }
                  role="option"
                  aria-selected={active}
                >
                  <span className="truncate">{m.name ?? m.email}</span>
                  {active && <Check className="h-3.5 w-3.5 text-ink-300 shrink-0" />}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => {
                onChange(SOMEONE_ELSE);
                setOpen(false);
              }}
              className={
                'w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-white/[0.06] border-t border-white/[0.04] mt-1 pt-2 ' +
                (isOther ? 'bg-white/[0.04] text-white' : 'text-ink-200')
              }
              role="option"
              aria-selected={isOther}
            >
              <span>{t('owner.someoneElse')}</span>
              {isOther && <Check className="h-3.5 w-3.5 text-ink-300 shrink-0" />}
            </button>
          </li>
        </ul>
      )}

      {isOther && (
        <input
          value={customName}
          onChange={(e) => onCustomNameChange(e.target.value)}
          className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
          placeholder={t('owner.typeName')}
          maxLength={120}
        />
      )}

      {error && (
        <div className="text-xs text-rose-300 mt-1">{error}</div>
      )}
    </div>
  );
}
