'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { TeamMember } from '@/lib/types';
import { OwnerSelect, SOMEONE_ELSE } from '@/components/ui/owner-select';
import { useT } from '@/lib/i18n/client';

const CALENDARS = [
  { slug: 'marketing', labelKey: 'newTask.calendarMarketing' },
  { slug: 'development', labelKey: 'newTask.calendarDevelopment' },
  { slug: 'business', labelKey: 'newTask.calendarBusiness' },
];

export function NewTaskForm() {
  const router = useRouter();
  const t = useT();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'NORMAL' | 'MEETING'>('NORMAL');
  const [ownerChoice, setOwnerChoice] = useState<string>('');
  const [customOwner, setCustomOwner] = useState('');
  const [important, setImportant] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('17:00');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [meetingCalendar, setMeetingCalendar] = useState('marketing');
  const [meetingClientName, setMeetingClientName] = useState('');
  const [meetingClientEmail, setMeetingClientEmail] = useState('');
  const [meetingAttendees, setMeetingAttendees] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTeamLoading(true);
    api
      .team()
      .then((t) => {
        setTeam(t);
        setOwnerChoice((prev) => prev || t[0]?.id || SOMEONE_ELSE);
        setTeamError(null);
      })
      .catch((err) => {
        setTeam([]);
        setOwnerChoice(SOMEONE_ELSE);
        setTeamError(err instanceof Error ? err.message : t('matrix.failedToLoad'));
      })
      .finally(() => setTeamLoading(false));
  }, []);

  useEffect(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    setDeadlineDate(today.toISOString().slice(0, 10));
    setMeetingDate(today.toISOString().slice(0, 10));
  }, []);

  const needTime = useMemo(() => {
    if (!deadlineDate) return false;
    const dl = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`);
    const diff = dl.getTime() - Date.now();
    return diff <= 2 * 24 * 60 * 60 * 1000;
  }, [deadlineDate, deadlineTime]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError(t('newTask.errors.titleRequired'));
      return;
    }
    if (!deadlineDate) {
      setError(t('newTask.errors.deadlineRequired'));
      return;
    }
    const deadlineHasTime = needTime;
    const deadlineAt = deadlineHasTime
      ? new Date(`${deadlineDate}T${deadlineTime}:00`).toISOString()
      : new Date(`${deadlineDate}T23:59:00`).toISOString();

    let ownerUserId: string | null = null;
    let ownerName: string | null = null;
    if (ownerChoice === SOMEONE_ELSE) {
      ownerName = customOwner.trim() || null;
      if (!ownerName) {
        setError(t('newTask.errors.someoneElseName'));
        return;
      }
    } else if (ownerChoice) {
      ownerUserId = ownerChoice;
    } else {
      setError(t('newTask.errors.ownerRequired'));
      return;
    }

    let meeting: NonNullable<ReturnType<typeof buildMeeting>> | undefined;
    if (type === 'MEETING') {
      const built = buildMeeting({
        date: meetingDate,
        time: meetingTime,
        calendarSlug: meetingCalendar,
        clientName: meetingClientName,
        clientEmail: meetingClientEmail,
        attendees: meetingAttendees,
      });
      if (!built) {
        setError(t('newTask.errors.meetingRequired'));
        return;
      }
      meeting = built;
    }

    setBusy(true);
    try {
      await api.createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        ownerUserId,
        ownerName,
        important,
        deadlineAt,
        deadlineHasTime,
        meeting,
      });
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('newTask.errors.createFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-ink-200 hover:bg-white/[0.05]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t('newTask.backToMatrix')}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-white">{t('newTask.title')}</h1>
        <p className="text-sm text-ink-400 mt-1">{t('newTask.subtitle')}</p>
      </div>

      <div className="surface p-6 space-y-4">
        <Field label={t('newTask.fTitle')}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[15px] text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
            placeholder={t('newTask.titlePlaceholder')}
            maxLength={200}
          />
        </Field>

        <Field label={t('newTask.fDescription')} optional>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus min-h-[80px]"
            maxLength={4000}
            placeholder={t('newTask.descriptionPlaceholder')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('newTask.fType')}>
            <div className="flex gap-2">
              {(['NORMAL', 'MEETING'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setType(k)}
                  className={
                    'flex-1 rounded-md border px-3 py-2 text-sm ' +
                    (type === k
                      ? 'border-white/30 bg-white/[0.06] text-white'
                      : 'border-white/10 bg-white/[0.02] text-ink-300 hover:bg-white/[0.04]')
                  }
                >
                  {k === 'NORMAL' ? t('newTask.typeNormal') : t('newTask.typeMeeting')}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('newTask.fImportant')}>
            <div className="flex gap-2">
              {[
                { v: true, l: t('common.yes') },
                { v: false, l: t('common.no') },
              ].map((opt) => (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => setImportant(opt.v)}
                  className={
                    'flex-1 rounded-md border px-3 py-2 text-sm ' +
                    (important === opt.v
                      ? 'border-white/30 bg-white/[0.06] text-white'
                      : 'border-white/10 bg-white/[0.02] text-ink-300 hover:bg-white/[0.04]')
                  }
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label={t('newTask.fOwner')}>
          <OwnerSelect
            team={team}
            value={ownerChoice}
            onChange={setOwnerChoice}
            customName={customOwner}
            onCustomNameChange={setCustomOwner}
            loading={teamLoading}
            error={teamError ? t('newTask.errors.teamLoadFailed', { error: teamError }) : null}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('newTask.fDeadlineDate')}>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
            />
          </Field>
          {needTime ? (
            <Field label={t('newTask.fDeadlineTime')}>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
              />
            </Field>
          ) : (
            <div className="text-xs text-ink-400 self-end pb-2">
              {t('newTask.dateOnly')}
            </div>
          )}
        </div>

        {type === 'MEETING' && (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="text-sm font-semibold text-white">{t('newTask.meetingHeader')}</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('newTask.fCalendar')}>
                <select
                  value={meetingCalendar}
                  onChange={(e) => setMeetingCalendar(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
                >
                  {CALENDARS.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {t(c.labelKey)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('newTask.fClientEmail')} optional>
                <input
                  type="email"
                  value={meetingClientEmail}
                  onChange={(e) => setMeetingClientEmail(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('newTask.fMeetingDate')}>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
                />
              </Field>
              <Field label={t('newTask.fMeetingTime')}>
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
                />
              </Field>
            </div>
            <Field label={t('newTask.fClientName')}>
              <input
                value={meetingClientName}
                onChange={(e) => setMeetingClientName(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
              />
            </Field>
            <Field label={t('newTask.fAttendees')} optional>
              <input
                value={meetingAttendees}
                onChange={(e) => setMeetingAttendees(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
                placeholder={t('newTask.attendeesPlaceholder')}
              />
            </Field>
          </div>
        )}

        {error && (
          <div className="text-sm text-rose-300 rounded-md border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/"
          className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-ink-200 hover:bg-white/[0.05]"
        >
          {t('common.cancel')}
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ink-200 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('newTask.submit')}
        </button>
      </div>
    </form>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-300 mb-1.5">
        {label} {optional && <span className="text-ink-500">{t('common.optional')}</span>}
      </span>
      {children}
    </label>
  );
}

function buildMeeting(input: {
  date: string;
  time: string;
  calendarSlug: string;
  clientName: string;
  clientEmail: string;
  attendees: string;
}) {
  if (!input.date || !input.time || !input.clientName.trim()) return null;
  const attendees = input.attendees
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const email = input.clientEmail.trim();
  return {
    date: input.date,
    time: input.time,
    calendarSlug: input.calendarSlug,
    clientName: input.clientName.trim(),
    clientEmail: email || undefined,
    attendees,
  };
}
