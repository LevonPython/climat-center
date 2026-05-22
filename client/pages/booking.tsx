import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextI18nextConfig = require('../next-i18next.config');
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../components/Layout';
import { apiFetch } from '../lib/api';
import { isValidArmenianPhone, sanitizePhoneInput } from '../lib/phone';
import type { Service } from '../components/ServiceCard';

type BookingPayload = {
  user_name: string;
  phone: string;
  service_id?: string | null;
  date?: string | null;
  time?: string | null;
  address?: string | null;
  problem_description?: string | null;
};

function pickServiceTitle(svc: Service, lang: string) {
  const title =
    (lang === 'ru' ? svc.title_ru : lang === 'am' ? svc.title_am : svc.title_en) ||
    svc.title_en ||
    svc.title_ru ||
    svc.title_am ||
    svc.type;
  return title || '—';
}

export default function BookingPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const lang = router.locale || 'am';
  const selectedServiceId = typeof router.query.serviceId === 'string' ? router.query.serviceId : '';

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const [form, setForm] = useState<BookingPayload>({
    user_name: '',
    phone: '',
    service_id: selectedServiceId || null,
    date: null,
    time: null,
    address: null,
    problem_description: null
  });

  useEffect(() => {
    setForm((f) => ({ ...f, service_id: selectedServiceId || f.service_id || null }));
  }, [selectedServiceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const resp = await apiFetch<{ services: Service[] }>('/api/services');
        if (!cancelled && resp.ok) setServices(resp.services);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const phoneValid = useMemo(() => isValidArmenianPhone(form.phone), [form.phone]);
  const showPhoneError = phoneTouched && form.phone.trim().length > 0 && !phoneValid;
  const canSubmit = useMemo(
    () => form.user_name.trim().length > 1 && phoneValid,
    [form.user_name, phoneValid]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setPhoneTouched(true);
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const resp = await apiFetch<{ booking: { id: string } }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          service_id: form.service_id || null,
          date: form.date || null,
          time: form.time || null
        })
      });
      if (!resp.ok) {
        setError(resp.error?.message || t('errors.generic'));
        return;
      }
      setSuccess(true);
      setPhoneTouched(false);
      setForm({
        user_name: '',
        phone: '',
        service_id: form.service_id || null,
        date: null,
        time: null,
        address: null,
        problem_description: null
      });
    } catch {
      setError(t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title={t('nav.booking')}>
      <div className="max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{t('booking.title')}</h1>
        <p className="mt-2 text-sm text-slate-700">{t('booking.subtitle')}</p>

        <form onSubmit={onSubmit} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">{t('form.name')}</span>
              <input
                value={form.user_name}
                onChange={(e) => setForm((f) => ({ ...f, user_name: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder={t('form.namePlaceholder')}
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">{t('form.phone')}</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: sanitizePhoneInput(e.target.value) }))}
                onBlur={() => setPhoneTouched(true)}
                className={[
                  'rounded-xl border px-3 py-2 outline-none focus:ring-2',
                  showPhoneError
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-slate-200 focus:ring-slate-300'
                ].join(' ')}
                placeholder={t('form.phonePlaceholder')}
                required
              />
              {showPhoneError ? (
                <span className="text-sm text-red-600">{t('form.phoneInvalid')}</span>
              ) : null}
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">{t('form.service')}</span>
              <select
                value={form.service_id || ''}
                onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value || null }))}
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                disabled={loading}
              >
                <option value="">{t('form.serviceAny')}</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {pickServiceTitle(s, lang)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-slate-900">{t('form.date')}</span>
                <input
                  type="date"
                  value={form.date || ''}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value || null }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-semibold text-slate-900">{t('form.time')}</span>
                <input
                  type="time"
                  value={form.time || ''}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value || null }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">{t('form.address')}</span>
              <input
                value={form.address || ''}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value || null }))}
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder={t('form.addressPlaceholder')}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">{t('form.problem')}</span>
              <textarea
                value={form.problem_description || ''}
                onChange={(e) => setForm((f) => ({ ...f, problem_description: e.target.value || null }))}
                className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                placeholder={t('form.problemPlaceholder')}
              />
            </label>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            {success ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-semibold">{t('booking.success')}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? t('form.sending') : t('form.submit')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const lang = locale || 'am';
  return {
    props: {
      ...(await serverSideTranslations(lang, ['common'], nextI18nextConfig))
    }
  };
};

