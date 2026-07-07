'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, MailCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useT } from '@/lib/i18n/client';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://admin.devya-solutions.com';
const FORGOT_PASSWORD_URL = `${ADMIN_URL}/forgot-password`;
const CHANGE_PASSWORD_URL = `${ADMIN_URL}/account/password?required=1`;

const INPUT_CLASS =
  'w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[15px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] ring-focus';

export function LoginForm() {
  const params = useSearchParams();
  const from = params.get('from') || '/';
  const safeFrom = from.startsWith('/') && !from.startsWith('//') ? from : '/';
  const t = useT();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  // 'credentials' -> normal sign-in; 'verify-email' -> backend sent an OTP and
  // refused the session until the mailbox is proven.
  const [step, setStep] = useState<'credentials' | 'verify-email'>('credentials');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function doLogin() {
    const res = await api.login(email, password);
    window.location.assign(
      res.user.mustChangePassword ? CHANGE_PASSWORD_URL : safeFrom,
    );
  }

  function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await doLogin();
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.message === 'EMAIL_NOT_VERIFIED') {
            setStep('verify-email');
            setNotice(t('login.verifyNotice', { email }));
          } else {
            setError(err.message || t('login.invalidCredentials'));
          }
        } else {
          setError(t('login.networkError'));
        }
      }
    });
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        await api.verifyEmail(email, code);
        // Mailbox proven — replay the sign-in with the credentials still in state.
        await doLogin();
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message || t('login.codeInvalid'));
        } else {
          setError(t('login.networkError'));
        }
      }
    });
  }

  function resend() {
    setError(null);
    start(async () => {
      try {
        await api.resendVerification(email);
        setNotice(t('login.resent', { email }));
      } catch {
        setError(t('login.resendFailed'));
      }
    });
  }

  if (step === 'verify-email') {
    return (
      <form onSubmit={submitCode} className="space-y-3">
        {notice && (
          <div className="flex items-start gap-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/[0.08] px-3 py-2.5 text-sm text-emerald-200">
            <MailCheck className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        <label className="block">
          <span className="block text-xs font-medium text-ink-300 mb-1.5">{t('login.verifyCode')}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={`${INPUT_CLASS} text-center tracking-[0.5em] font-mono text-lg`}
            placeholder="••••••"
          />
        </label>
        {error && (
          <div className="text-sm text-rose-300 rounded-md border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={pending || code.length !== 6}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-ink-900 hover:bg-ink-200 disabled:opacity-60 ring-focus"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t('login.verifySubmit')}
        </button>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={resend}
            disabled={pending}
            className="text-xs text-ink-400 hover:text-ink-200 transition-colors disabled:opacity-60"
          >
            {t('login.resend')}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('credentials');
              setCode('');
              setNotice(null);
              setError(null);
            }}
            className="text-xs text-ink-400 hover:text-ink-200 transition-colors"
          >
            {t('login.backToSignIn')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitCredentials} className="space-y-3">
      <label className="block">
        <span className="block text-xs font-medium text-ink-300 mb-1.5">{t('login.email')}</span>
        <input
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT_CLASS}
          placeholder={t('login.emailPlaceholder')}
        />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-ink-300 mb-1.5">{t('login.password')}</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT_CLASS}
          placeholder={t('login.passwordPlaceholder')}
        />
      </label>
      <div className="flex justify-end">
        <a href={FORGOT_PASSWORD_URL} className="text-xs text-ink-400 hover:text-ink-200 transition-colors">
          {t('login.forgot')}
        </a>
      </div>
      {error && (
        <div className="text-sm text-rose-300 rounded-md border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-ink-900 hover:bg-ink-200 disabled:opacity-60 ring-focus"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t('login.submit')}
      </button>
    </form>
  );
}
