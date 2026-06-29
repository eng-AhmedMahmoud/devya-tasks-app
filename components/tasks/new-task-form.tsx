'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { TeamMember } from '@/lib/types';
import { OwnerSelect, SOMEONE_ELSE } from '@/components/ui/owner-select';

const CALENDARS = [
  { slug: 'marketing', label: 'Marketing' },
  { slug: 'development', label: 'Development' },
  { slug: 'business', label: 'Business' },
];

export function NewTaskForm() {
  const router = useRouter();
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
        setTeamError(err instanceof Error ? err.message : 'Failed to load team');
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
      setError('Title is required');
      return;
    }
    if (!deadlineDate) {
      setError('Deadline is required');
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
        setError('Type a name for "Someone else"');
        return;
      }
    } else if (ownerChoice) {
      ownerUserId = ownerChoice;
    } else {
      setError('Pick an owner');
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
        setError('Meeting requires date, time, and client name');
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
      setError(err instanceof Error ? err.message : 'Failed to create task');
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
          <ArrowLeft className="h-3.5 w-3.5" /> Back to matrix
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-white">New task</h1>
        <p className="text-sm text-ink-400 mt-1">Add a task to the priority matrix.</p>
      </div>

      <div className="surface p-6 space-y-4">
        <Field label="Title">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[15px] text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
            placeholder="e.g. Send weekly status report"
            maxLength={200}
          />
        </Field>

        <Field label="Description" optional>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus min-h-[80px]"
            maxLength={4000}
            placeholder="Optional notes"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <div className="flex gap-2">
              {(['NORMAL', 'MEETING'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={
                    'flex-1 rounded-md border px-3 py-2 text-sm ' +
                    (type === t
                      ? 'border-white/30 bg-white/[0.06] text-white'
                      : 'border-white/10 bg-white/[0.02] text-ink-300 hover:bg-white/[0.04]')
                  }
                >
                  {t === 'NORMAL' ? 'Normal' : 'Meeting'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Important?">
            <div className="flex gap-2">
              {[
                { v: true, l: 'Yes' },
                { v: false, l: 'No' },
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

        <Field label="Falls upon">
          <OwnerSelect
            team={team}
            value={ownerChoice}
            onChange={setOwnerChoice}
            customName={customOwner}
            onCustomNameChange={setCustomOwner}
            loading={teamLoading}
            error={teamError ? `Team list failed to load — only "Someone else" available. ${teamError}` : null}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Deadline date">
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
            />
          </Field>
          {needTime ? (
            <Field label="Deadline time (within 2 days)">
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
              />
            </Field>
          ) : (
            <div className="text-xs text-ink-400 self-end pb-2">
              Date-only deadline (more than 2 days away).
            </div>
          )}
        </div>

        {type === 'MEETING' && (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="text-sm font-semibold text-white">Meeting details (booking)</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Calendar">
                <select
                  value={meetingCalendar}
                  onChange={(e) => setMeetingCalendar(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
                >
                  {CALENDARS.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Client email" optional>
                <input
                  type="email"
                  value={meetingClientEmail}
                  onChange={(e) => setMeetingClientEmail(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
                />
              </Field>
              <Field label="Time">
                <input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
                />
              </Field>
            </div>
            <Field label="Client name">
              <input
                value={meetingClientName}
                onChange={(e) => setMeetingClientName(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
              />
            </Field>
            <Field label="Attendees" optional>
              <input
                value={meetingAttendees}
                onChange={(e) => setMeetingAttendees(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30"
                placeholder="comma-separated emails"
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
          Cancel
        </Link>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ink-200 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Create task
        </button>
      </div>
    </form>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-300 mb-1.5">
        {label} {optional && <span className="text-ink-500">(optional)</span>}
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
