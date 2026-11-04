import { useTranslation } from 'react-i18next';
import { LANGS, type Lang } from '../contentSchemas/types';
import { ui } from './ui';

const LANGUAGE_NAMES: Record<Lang, string> = { hy: 'Հայերեն', ru: 'Русский', en: 'English' };

export function LangTabs({ value, onChange }: { value: Lang; onChange: (lang: Lang) => void }) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={t('common.contentLanguage')} className="flex flex-wrap gap-2">
      {LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          aria-pressed={value === lang}
          onClick={() => onChange(lang)}
          className={[ui.tab, value === lang ? ui.tabActive : ui.tabIdle].join(' ')}
        >
          {LANGUAGE_NAMES[lang]}
        </button>
      ))}
    </div>
  );
}
