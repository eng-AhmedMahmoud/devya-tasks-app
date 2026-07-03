'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ListPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useDialog } from '@/components/ui/dialog-provider';
import type { DailyTemplate, TeamMember } from '@/lib/types';
import { OwnerSelect, SOMEONE_ELSE } from '@/components/ui/owner-select';
import { TemplatePickerDialog } from './template-picker-dialog';
import { useT } from '@/lib/i18n/client';

interface TemplatesViewProps {
  isSuperAdmin: boolean;
}

export function TemplatesView({ isSuperAdmin: _isSuperAdmin }: TemplatesViewProps) {
  void _isSuperAdmin;
  const dialog = useDialog();
  const t = useT();
  const [templates, setTemplates] = useState<DailyTemplate[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DailyTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const items = await api.listTemplates();
      setTemplates(items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    api.team().then(setTeam).catch(() => setTeam([]));
  }, [refresh]);

  const remove = async (tpl: DailyTemplate) => {
    const ok = await dialog.confirm({
      title: t('templates.deleteTitle'),
      message: t('templates.deleteMessage', { title: tpl.title }),
      confirmLabel: t('common.delete'),
      tone: 'danger',
    });
    if (!ok) return;
    await api.deleteTemplate(tpl.id);
    await refresh();
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t('templates.title')}</h1>
          <p className="text-sm text-ink-400 mt-1">{t('templates.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-ink-200 hover:bg-white/[0.05]"
          >
            <ListPlus className="h-4 w-4" />
            {t('matrix.insertDaily')}
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-medium text-ink-900 hover:bg-ink-200"
          >
            <Plus className="h-4 w-4" /> {t('templates.addDaily')}
          </button>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-ink-400">
            <tr>
              <th className="text-left px-4 py-2 font-medium">{t('templates.colTitle')}</th>
              <th className="text-left px-4 py-2 font-medium">{t('templates.colOwner')}</th>
              <th className="text-left px-4 py-2 font-medium">{t('templates.colImportant')}</th>
              <th className="text-left px-4 py-2 font-medium">{t('templates.colActive')}</th>
              <th className="text-left px-4 py-2 font-medium">{t('templates.colOrder')}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
                  {t('templates.empty')}
                </td>
              </tr>
            )}
            {templates.map((tpl) => (
              <tr key={tpl.id} className="border-t border-white/[0.04]">
                <td className="px-4 py-2.5">
                  <div className="text-white font-medium">{tpl.title}</div>
                  {tpl.description && <div className="text-xs text-ink-400 mt-0.5 line-clamp-1">{tpl.description}</div>}
                </td>
                <td className="px-4 py-2.5 text-ink-300">{tpl.ownerUser?.name ?? tpl.ownerName ?? '—'}</td>
                <td className="px-4 py-2.5 text-ink-300">{tpl.important ? t('common.yes') : t('common.no')}</td>
                <td className="px-4 py-2.5 text-ink-300">{tpl.active ? t('common.yes') : t('common.no')}</td>
                <td className="px-4 py-2.5 text-ink-300">{tpl.order}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => {
                        setEditing(tpl);
                        setShowForm(true);
                      }}
                      className="rounded-md p-1.5 text-ink-300 hover:text-white hover:bg-white/[0.06]"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(tpl)}
                      className="rounded-md p-1.5 text-rose-300 hover:bg-white/[0.06]"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <TemplateFormDialog
          template={editing}
          team={team}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await refresh();
          }}
        />
      )}
      <TemplatePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onInserted={async (count) => {
          setPickerOpen(false);
          await dialog.notify({
            title:
              count === 1
                ? t('picker.insertedTitleOne', { count })
                : t('picker.insertedTitle', { count }),
            message: t('picker.insertedMessage'),
            tone: 'success',
          });
        }}
      />
    </>
  );
}

function TemplateFormDialog({
  template,
  team,
  onClose,
  onSaved,
}: {
  template: DailyTemplate | null;
  team: TeamMember[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState(template?.title ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [important, setImportant] = useState(template?.important ?? false);
  const [ownerChoice, setOwnerChoice] = useState<string>(
    template?.ownerUserId ?? (template?.ownerName ? SOMEONE_ELSE : ''),
  );
  useEffect(() => {
    if (ownerChoice) return;
    setOwnerChoice(team[0]?.id ?? SOMEONE_ELSE);
  }, [team, ownerChoice]);
  const [customOwner, setCustomOwner] = useState(template?.ownerName ?? '');
  const [order, setOrder] = useState(template?.order ?? 0);
  const [active, setActive] = useState(template?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        important,
        ownerUserId: ownerChoice === SOMEONE_ELSE || !ownerChoice ? null : ownerChoice,
        ownerName: ownerChoice === SOMEONE_ELSE ? customOwner.trim() || null : null,
        order: Number(order) || 0,
        active,
      };
      if (template) await api.updateTemplate(template.id, body);
      else await api.createTemplate(body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('templates.form.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink-900/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <form onSubmit={submit} className="relative w-full max-w-md rounded-xl border border-white/10 bg-ink-800 shadow-2xl">
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{template ? t('templates.form.editTitle') : t('templates.form.addTitle')}</h2>
            <p className="text-sm text-ink-400 mt-1">{t('templates.form.subtitle')}</p>
          </div>
          <label className="block">
            <span className="block text-xs font-medium text-ink-300 mb-1.5">{t('templates.form.fTitle')}</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-ink-300 mb-1.5">{t('templates.form.fDescription')}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus min-h-[60px]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-ink-300 mb-1.5">{t('templates.form.fImportant')}</span>
              <select
                value={important ? 'yes' : 'no'}
                onChange={(e) => setImportant(e.target.value === 'yes')}
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100"
              >
                <option value="no">{t('common.no')}</option>
                <option value="yes">{t('common.yes')}</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-ink-300 mb-1.5">{t('templates.form.fOrder')}</span>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100"
              />
            </label>
          </div>
          <div className="block">
            <span className="block text-xs font-medium text-ink-300 mb-1.5">{t('templates.form.fOwner')}</span>
            <OwnerSelect
              team={team}
              value={ownerChoice}
              onChange={setOwnerChoice}
              customName={customOwner}
              onCustomNameChange={setCustomOwner}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            {t('templates.form.includeInInsert')}
          </label>
          {error && (
            <div className="text-sm text-rose-300 rounded-md border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.06]">
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-ink-200 hover:bg-white/[0.05]">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-1.5 text-sm font-medium text-ink-900 hover:bg-ink-200 disabled:opacity-60">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {template ? t('common.save') : t('common.create')}
          </button>
        </div>
      </form>
    </div>
  );
}
