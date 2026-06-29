'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Link as LinkIcon, Loader2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Task } from '@/lib/types';

interface CompleteDialogProps {
  task: Task | null;
  onClose: () => void;
  onCompleted: () => void;
}

type ProofMode = 'file' | 'link';
type FileType = 'image' | 'pdf' | 'html' | 'file';

const ACCEPT_FILE = 'image/*,application/pdf,text/html,text/plain,application/zip,application/json,application/octet-stream';

function classifyFile(file: File): FileType {
  const mime = file.type;
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'text/html' || file.name.toLowerCase().endsWith('.html')) return 'html';
  return 'file';
}

export function CompleteDialog({ task, onClose, onCompleted }: CompleteDialogProps) {
  const [mode, setMode] = useState<ProofMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!task) return;
    setMode('file');
    setFile(null);
    setLink('');
    setNote('');
    setPreview(null);
    setError(null);
  }, [task]);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
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
    setError(null);
    if (mode === 'file' && !file) {
      setError('Upload a file or switch to link');
      return;
    }
    if (mode === 'link' && !link.trim()) {
      setError('Paste a URL or switch to file');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'file' && file) {
        const fileType = classifyFile(file);
        const uploaded = fileType === 'image' ? await api.uploadProof(file) : await api.uploadProofFile(file);
        await api.completeTask(task.id, {
          fileUrl: uploaded.url,
          fileType,
          note: note.trim() || undefined,
        });
      } else {
        const url = link.trim();
        if (!/^https?:\/\//i.test(url)) {
          setError('Link must start with http:// or https://');
          setBusy(false);
          return;
        }
        await api.completeTask(task.id, {
          linkUrl: url,
          note: note.trim() || undefined,
        });
      }
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
              Attach a proof (file or link) for <span className="text-white">"{task.title}"</span>.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('file')}
              className={
                'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm ' +
                (mode === 'file'
                  ? 'border-white/30 bg-white/[0.06] text-white'
                  : 'border-white/10 bg-white/[0.02] text-ink-300 hover:bg-white/[0.04]')
              }
            >
              <FileText className="h-3.5 w-3.5" /> File upload
            </button>
            <button
              type="button"
              onClick={() => setMode('link')}
              className={
                'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm ' +
                (mode === 'link'
                  ? 'border-white/30 bg-white/[0.06] text-white'
                  : 'border-white/10 bg-white/[0.02] text-ink-300 hover:bg-white/[0.04]')
              }
            >
              <LinkIcon className="h-3.5 w-3.5" /> Link / URL
            </button>
          </div>

          {mode === 'file' ? (
            <div>
              <span className="block text-xs font-medium text-ink-300 mb-1.5">Proof file</span>
              {file ? (
                <div className="space-y-2">
                  {preview && (
                    <img
                      src={preview}
                      alt="proof preview"
                      className="rounded-md border border-white/10 max-h-64 object-contain mx-auto"
                    />
                  )}
                  <div className="text-xs text-ink-300">
                    {file.name} <span className="text-ink-500">· {(file.size / 1024).toFixed(0)} KB · {file.type || 'unknown'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                    className="text-xs text-ink-400 underline"
                  >
                    Choose a different file
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-white/10 bg-white/[0.02] px-4 py-8 cursor-pointer hover:border-white/20">
                  <Upload className="h-5 w-5 text-ink-400" />
                  <span className="text-sm text-ink-200">Click to choose a file</span>
                  <span className="text-xs text-ink-500">Image, PDF, HTML, or any file up to 20 MB</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT_FILE}
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>
          ) : (
            <label className="block">
              <span className="block text-xs font-medium text-ink-300 mb-1.5">Link / URL</span>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-ink-100 focus:outline-none focus:border-white/30 ring-focus"
              />
            </label>
          )}

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
