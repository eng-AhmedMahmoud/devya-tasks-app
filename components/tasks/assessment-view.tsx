'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatMonth, monthKey, shiftMonth } from '@/lib/dates';
import type { AssessmentBucket, AssessmentDoneTask, AssessmentResponse, TaskQuality, UserRole } from '@/lib/types';
import { useDialog } from '@/components/ui/dialog-provider';
import { appConfig } from '@/lib/config';
import { useT } from '@/lib/i18n/client';

function resolveProofUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${appConfig.apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

function ProofThumb({ task }: { task: AssessmentDoneTask }) {
  const imgUrl = task.completionFileType === 'image' && task.completionFileUrl
    ? task.completionFileUrl
    : task.completionImageUrl;
  if (imgUrl) {
    return (
      <a href={resolveProofUrl(imgUrl)} target="_blank" rel="noreferrer">
        <img
          src={resolveProofUrl(imgUrl)}
          alt="proof"
          className="h-14 w-20 rounded-md border border-white/10 object-cover"
        />
      </a>
    );
  }
  if (task.completionFileUrl) {
    return (
      <a
        href={resolveProofUrl(task.completionFileUrl)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-ink-200 hover:bg-white/[0.05]"
      >
        {task.completionFileType ?? 'file'}
      </a>
    );
  }
  return null;
}

interface AssessmentViewProps {
  role: UserRole;
}

export function AssessmentView({ role }: AssessmentViewProps) {
  const dialog = useDialog();
  const t = useT();
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
      setError(err instanceof Error ? err.message : t('matrix.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [month, t]);

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
        title: t('assessment.rateFailed'),
        message: err instanceof Error ? err.message : t('common.unknownError'),
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
          <h1 className="text-2xl font-semibold text-white">{t('assessment.title')}</h1>
          <p className="text-sm text-ink-400 mt-1">
            {t('assessment.subtitle', { month: data ? formatMonth(data.month) : formatMonth(month) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="rounded-md border border-white/10 bg-white/[0.02] p-2 text-ink-200 hover:bg-white/[0.05]"
            aria-label={t('assessment.prevMonth')}
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
            aria-label={t('assessment.nextMonth')}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-ink-400 inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading')}
        </div>
      )}
      {error && <div className="text-sm text-rose-300">{error}</div>}

      {data && (
        <div className="space-y-6">
          {data.buckets.length === 0 && (
            <div className="surface px-4 py-8 text-center text-ink-400">{t('assessment.empty')}</div>
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
  const t = useT();
  return (
    <article className="surface p-5 space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">{bucket.name}</h2>
        <div className="text-xs text-ink-400">
          {t('assessment.totals', {
            total: bucket.totals.total,
            done: bucket.totals.done,
            onTime: bucket.totals.onTime,
            highQuality: bucket.totals.highQuality,
          })}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Ratio label={t('assessment.accomplishing')} value={bucket.ratios.accomplishing} />
        <Ratio label={t('assessment.onTime')} value={bucket.ratios.onTime} />
        <Ratio label={t('assessment.qualityScore')} value={bucket.ratios.quality} />
        <Ratio label={t('assessment.overall')} value={bucket.ratios.overall} accent />
      </div>

      <section>
        <h3 className="text-sm font-semibold text-white mb-2">{t('assessment.qualitySection')}</h3>
        {bucket.doneTasks.length === 0 ? (
          <div className="text-xs text-ink-500">{t('assessment.noneToRate')}</div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {bucket.doneTasks.map((task) => (
              <li key={task.id} className="py-3 flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{task.title}</div>
                  <div className="text-[11px] text-ink-400 mt-0.5">
                    {task.onTime ? t('assessment.onTimeLabel') : t('assessment.lateLabel')} · {t('assessment.currentRating', { quality: task.quality })}
                  </div>
                  {task.completionNote && (
                    <p className="text-xs text-ink-300 mt-1 whitespace-pre-wrap">{task.completionNote}</p>
                  )}
                </div>
                <ProofThumb task={task} />
                {task.completionLinkUrl && (
                  <a
                    href={task.completionLinkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-ink-300 hover:text-white underline"
                  >
                    {t('assessment.linkLabel')}
                  </a>
                )}
                {isSuperAdmin ? (
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => onRate(task.id, 'LOW')}
                      disabled={ratingId === task.id}
                      className={
                        'rounded-md border px-2.5 py-1 text-xs ' +
                        (task.quality === 'LOW'
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                          : 'border-white/10 bg-white/[0.02] text-ink-300 hover:bg-white/[0.06]')
                      }
                    >
                      {t('assessment.rateLow')}
                    </button>
                    <button
                      onClick={() => onRate(task.id, 'HIGH')}
                      disabled={ratingId === task.id}
                      className={
                        'rounded-md border px-2.5 py-1 text-xs ' +
                        (task.quality === 'HIGH'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-white/[0.02] text-ink-300 hover:bg-white/[0.06]')
                      }
                    >
                      {t('assessment.rateHigh')}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-ink-500">{t('assessment.superAdminOnly')}</span>
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
