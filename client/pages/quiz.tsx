import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextI18nextConfig = require('../next-i18next.config');
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { apiFetch } from '../lib/api';
import { isValidArmenianPhone, sanitizePhoneInput } from '../lib/phone';

type Step = 1 | 2 | 3;

const FALLBACKS = {
  en: {
    problems: ['Not cooling', 'Water leaking', "Won't turn on", 'Making noise', 'Freezing up', 'Bad smell'],
    acTypes: ['Wall-mounted', 'Cassette', 'Ducted', 'Floor-ceiling', 'Window', 'Floor standing']
  },
  ru: {
    problems: ['Не морозит', 'Течет вода', 'Не включается', 'Шумит', 'Обмерзает', 'Неприятный запах'],
    acTypes: ['Настенный', 'Кассетный', 'Канальный', 'Напольно-потолочный', 'Оконный', 'Колонный']
  },
  am: {
    problems: ['Չի սառչում', 'Ջուր է հոսում', 'Չի միանում', 'Աղմուկ է անում', 'Սառչում է', 'Անհաճոյական հոտ'],
    acTypes: ['Պատի', 'Կասետային', 'Խողովակային', 'Հատակ-առաստաղ', 'Պատուհանի', 'Սյունակային']
  }
} as const;

function translatedOrFallback(t: (k: string) => string, key: string, fallbacks: string[]): string[] {
  return fallbacks.map((fallback, i) => {
    const fullKey = `quiz.${key}${i}`;
    const value = t(fullKey);
    const isKey = value === fullKey || value.startsWith('quiz.') || value.includes(`quiz.${key}`);
    return isKey ? fallback : value;
  });
}

function displayLabel(value: string, options: string[], keyPrefix: string, fallbacks: string[]): string {
  if (!value) return value;
  if (options.includes(value)) return value;
  const keyMatch = value.match(new RegExp(`^quiz\\.${keyPrefix}(\\d)$`));
  if (keyMatch) {
    const i = parseInt(keyMatch[1], 10);
    return fallbacks[i] ?? value;
  }
  return value;
}

export default function QuizPage() {
  const { t } = useTranslation('common');
  const { locale } = useRouter();
  const localeKey = (locale && locale in FALLBACKS ? locale : 'am') as keyof typeof FALLBACKS;
  const fallbacks = FALLBACKS[localeKey];

  const problems = translatedOrFallback(t, 'problem', [...fallbacks.problems]);
  const acTypes = translatedOrFallback(t, 'acType', [...fallbacks.acTypes]);
  const [step, setStep] = useState<Step>(1);
  const [problem, setProblem] = useState<string>('');
  const [acType, setAcType] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const canNext1 = useMemo(() => problem.length > 0, [problem]);
  const canNext2 = useMemo(() => acType.length > 0, [acType]);
  const phoneValid = useMemo(() => isValidArmenianPhone(phone), [phone]);
  const showPhoneError = phoneTouched && phone.trim().length > 0 && !phoneValid;
  const canSubmit = useMemo(() => phoneValid, [phoneValid]);

  async function submit() {
    setError(null);
    setSuccess(false);
    setPhoneTouched(true);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const resp = await apiFetch<{ quiz_submission: { id: string } }>('/api/quiz-submissions', {
        method: 'POST',
        body: JSON.stringify({
          answers_json: { problem, acType },
          contact_info: { name, phone }
        })
      });
      if (!resp.ok) {
        setError(resp.error?.message || t('errors.generic'));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title={t('nav.quiz')}>
      <div className="max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{t('quiz.title')}</h1>
        <p className="mt-2 text-sm text-slate-700">{t('quiz.subtitle')}</p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div>
              {t('quiz.step')} {step}/3
            </div>
            <button
              type="button"
              className="hover:text-slate-700"
              onClick={() => {
                setStep(1);
                setProblem('');
                setAcType('');
                setPhone('');
                setPhoneTouched(false);
                setError(null);
                setSuccess(false);
              }}
            >
              {t('quiz.reset')}
            </button>
          </div>

          {step === 1 ? (
            <div className="mt-5">
              <div className="text-sm font-bold text-slate-900">{t('quiz.problemQuestion')}</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {problems.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProblem(p)}
                    className={[
                      'rounded-xl border px-3 py-3 text-left text-sm font-semibold',
                      problem === p ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:bg-slate-50'
                    ].join(' ')}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  disabled={!canNext1}
                  onClick={() => setStep(2)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {t('actions.next')}
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-5">
              <div className="text-sm font-bold text-slate-900">{t('quiz.typeQuestion')}</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {acTypes.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAcType(p)}
                    className={[
                      'rounded-xl border px-3 py-3 text-left text-sm font-semibold',
                      acType === p ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:bg-slate-50'
                    ].join(' ')}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
                >
                  {t('actions.back')}
                </button>
                <button
                  type="button"
                  disabled={!canNext2}
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {t('actions.next')}
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-5">
              <div className="text-sm font-bold text-slate-900">{t('quiz.contactQuestion')}</div>
              <div className="mt-3 grid gap-4">
                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-900">{t('form.name')}</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder={t('form.namePlaceholder')}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-semibold text-slate-900">{t('form.phone')}</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
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

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                  <div className="font-bold text-slate-900">{t('quiz.summary')}</div>
                  <div className="mt-2">
                    <div>
                      <span className="font-semibold">{t('quiz.problem')}:</span>{' '}
                      {displayLabel(problem, problems, 'problem', [...fallbacks.problems])}
                    </div>
                    <div>
                      <span className="font-semibold">{t('quiz.type')}:</span>{' '}
                      {displayLabel(acType, acTypes, 'acType', [...fallbacks.acTypes])}
                    </div>
                  </div>
                </div>

                {error ? <div className="text-sm text-red-600">{error}</div> : null}
                {success ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <p className="font-semibold">{t('quiz.success')}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSuccess(false);
                        setStep(1);
                        setProblem('');
                        setAcType('');
                        setName('');
                        setPhone('');
                        setPhoneTouched(false);
                        setError(null);
                      }}
                      className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                    >
                      {t('quiz.reset')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
                    >
                      {t('actions.back')}
                    </button>
                    <button
                      type="button"
                      disabled={!canSubmit || submitting}
                      onClick={submit}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {submitting ? t('form.sending') : t('quiz.submit')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
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

