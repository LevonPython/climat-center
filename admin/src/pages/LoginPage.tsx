import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../api';
import { setToken } from '../auth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from || '/';

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const resp = await apiFetch<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (!resp.ok) {
        setError(resp.error?.message || t('login.error'));
        return;
      }
      setToken(resp.token);
      nav(from, { replace: true });
    } catch {
      setError(t('login.error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-5 relative">
      <div className="absolute top-5 right-5">
        <LanguageSwitcher />
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-xl font-extrabold">{t('login.title')}</div>
        <div className="mt-1 text-sm text-slate-600">{t('login.subtitle')}</div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-semibold">{t('login.username')}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold">{t('login.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
              required
            />
          </label>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? t('login.submitting') : t('login.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

