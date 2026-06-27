'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Task } from '@/lib/types';

interface CompleteDialogProps {
  task: Task | null;
  onClose: () => void;
  onCompleted: () => void;
}

export function CompleteDialog({ task, onClose, onCompleted }: CompleteDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!task) return;
    setFile(null);
    setNote('');
    setPreview(null);
    setError(null);
  }, [task]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!task) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    if (!file) {
      setError('Proof image is required to mark this task done.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded = await api.uploadProof(file);
      await api.completeTask(task.id, { imageUrl: uploaded.url, note: note.trim() || undefined });
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
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
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Mark done</h2>
            <p className="text-sm text-ink-400 mt-1">
              Attach a proof image (required) and an optional note for{' '}
              <span className="text-white">"{task.title}"</span>.
            </p>
          </div>

          <div>
            <span className="block text-xs font-medium text-ink-300 mb-1.5">Proof image (required)</span>
            {preview ? (
              <div className="space-y-2">
                <img
                  src={preview}
                  alt="proof preview"
                  className="rounded-md border border-white/10 max-h-64 object-contain mx-auto"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                  className="text-xs text-ink-400 underline"
                >
                  Choose a different image
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-white/10 bg-white/[0.02] px-4 py-8 cursor-pointer hover:border-white/20">
                <Upload className="h-5 w-5 text-ink-400" />
                <span className="text-sm text-ink-200">Click to choose an image</span>
                <span className="text-xs text-ink-500">PNG or JPG up to 10 MB</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-ink-300 mb-1.5">
              Note <span className="text-ink-500">(optional)</span>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus min-h-[80px]"
              placeholder="What was done?"
            />
          </label>

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
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-ink-900 hover:bg-emerald-400 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirm done
          </button>
        </div>
      </form>
    </div>
  );
}
