'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMonth, monthKey, shiftMonth } from '@/lib/dates';
import type { AssessmentBucket, AssessmentResponse, TaskQuality, UserRole } from '@/lib/types';
import { useDialog } from '@/components/ui/dialog-provider';

interface AssessmentViewProps {
  role: UserRole;
}

export function AssessmentView({ role }: AssessmentViewProps) {
  const dialog = useDialog();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [data, setData] = useState<AssessmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.assessment(month);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rate = async (taskId: string, quality: TaskQuality) => {
    setRatingId(taskId);
    try {
      await api.rateQuality(taskId, quality);
      await refresh();
    } catch (err) {
      await dialog.notify({
        title: 'Could not rate task',
        message: err instanceof Error ? err.message : 'Unknown error',
        tone: 'danger',
      });
    } finally {
      setRatingId(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Monthly assessment</h1>
          <p className="text-sm text-ink-400 mt-1">
            Per-employee ratios for {data ? formatMonth(data.month) : formatMonth(month)}. All ratios use the total number of tasks assigned that month as the denominator.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="rounded-md border border-white/10 bg-white/[0.02] p-2 text-ink-200 hover:bg-white/[0.05]"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-ink-100"
          />
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="rounded-md border border-white/10 bg-white/[0.02] p-2 text-ink-200 hover:bg-white/[0.05]"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-ink-400 inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <div className="text-sm text-rose-300">{error}</div>}

      {data && (
        <div className="space-y-6">
          {data.buckets.length === 0 && (
            <div className="surface px-4 py-8 text-center text-ink-400">No tasks recorded this month.</div>
          )}
          {data.buckets.map((b) => (
            <Card
              key={b.userId ?? b.name}
              bucket={b}
              isSuperAdmin={isSuperAdmin}
              onRate={rate}
              ratingId={ratingId}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Card({
  bucket,
  isSuperAdmin,
  onRate,
  ratingId,
}: {
  bucket: AssessmentBucket;
  isSuperAdmin: boolean;
  onRate: (taskId: string, quality: TaskQuality) => Promise<void>;
  ratingId: string | null;
}) {
  return (
    <article className="surface p-5 space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">{bucket.name}</h2>
        <div className="text-xs text-ink-400">
          {bucket.totals.total} tasks total · {bucket.totals.done} done · {bucket.totals.onTime} on time · {bucket.totals.highQuality} high quality
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Ratio label="Accomplishing" value={bucket.ratios.accomplishing} />
        <Ratio label="On time" value={bucket.ratios.onTime} />
        <Ratio label="Quality" value={bucket.ratios.quality} />
        <Ratio label="Overall" value={bucket.ratios.overall} accent />
      </div>

      <section>
        <h3 className="text-sm font-semibold text-white mb-2">Quality assessment</h3>
        {bucket.doneTasks.length === 0 ? (
          <div className="text-xs text-ink-500">No completed tasks to rate yet.</div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {bucket.doneTasks.map((t) => (
              <li key={t.id} className="py-3 flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{t.title}</div>
                  <div className="text-[11px] text-ink-400 mt-0.5">
                    {t.onTime ? 'On time' : 'Late'} · current rating: {t.quality}
                  </div>
                  {t.completionNote && (
                    <p className="text-xs text-ink-300 mt-1 whitespace-pre-wrap">{t.completionNote}</p>
                  )}
                </div>
                {t.completionImageUrl && (
                  <a href={t.completionImageUrl} target="_blank" rel="noreferrer">
                    <img
                      src={t.completionImageUrl}
                      alt="proof"
                      className="h-14 w-20 rounded-md border border-white/10 object-cover"
                    />
                  </a>
                )}
                {isSuperAdmin ? (
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => onRate(t.id, 'LOW')}
                      disabled={ratingId === t.id}
                      className={
                        'rounded-md border px-2.5 py-1 text-xs ' +
                        (t.quality === 'LOW'
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                          : 'border-white/10 bg-white/[0.02] text-ink-300 hover:bg-white/[0.06]')
                      }
                    >
                      Low
                    </button>
                    <button
                      onClick={() => onRate(t.id, 'HIGH')}
                      disabled={ratingId === t.id}
                      className={
                        'rounded-md border px-2.5 py-1 text-xs ' +
                        (t.quality === 'HIGH'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-white/[0.02] text-ink-300 hover:bg-white/[0.06]')
                      }
                    >
                      High
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-ink-500">Super Admin only</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

function Ratio({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={
        'rounded-lg border px-3 py-3 ' +
        (accent
          ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
          : 'border-white/[0.06] bg-white/[0.02]')
      }
    >
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className="text-xl font-semibold text-white">{value.toFixed(1)}%</div>
    </div>
  );
}
