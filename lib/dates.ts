export const TZ = 'Africa/Cairo';

export function todayKey(): string {
  return dayKey(new Date());
}

export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

export function hoursBetween(from: string | Date, to: Date = new Date()): number {
  const a = typeof from === 'string' ? new Date(from) : from;
  return (to.getTime() - a.getTime()) / (1000 * 60 * 60);
}

export function isWithin48HoursOfNow(deadline: string | Date): boolean {
  const dl = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const diff = dl.getTime() - Date.now();
  return diff <= 2 * 24 * 60 * 60 * 1000;
}

export function formatDeadline(iso: string, hasTime: boolean): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = hasTime
    ? { timeZone: TZ, year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { timeZone: TZ, year: 'numeric', month: 'short', day: '2-digit' };
  return new Intl.DateTimeFormat('en-GB', opts).format(d);
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(d);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function monthKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' })
    .format(date)
    .slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: 'long' }).format(dt);
}
