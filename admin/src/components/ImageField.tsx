import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assetUrl } from '../api';
import { MediaPicker } from './MediaPicker';
import { ui } from './ui';

type ImageFieldProps = {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
};

export function ImageField({ label, value, onChange }: ImageFieldProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);

  return (
    <div className="grid gap-1">
      <div className={ui.label}>{label}</div>
      <div className="flex flex-wrap items-center gap-2">
        {value ? (
          <img src={assetUrl(value)} alt={label} className="h-16 w-24 rounded-lg border border-slate-200 object-contain" />
        ) : (
          <span className="text-xs text-slate-600">{t('blocks.noImage')}</span>
        )}
        <button type="button" className={ui.secondary} aria-label={`${value ? t('blocks.changeImage') : t('blocks.chooseImage')}: ${label}`} onClick={() => setPicking(true)}>
          {value ? t('blocks.changeImage') : t('blocks.chooseImage')}
        </button>
        {value ? (
          <button type="button" className={ui.danger} aria-label={`${t('blocks.removeImage')}: ${label}`} onClick={() => onChange(null)}>
            {t('blocks.removeImage')}
          </button>
        ) : null}
      </div>
      {picking ? <MediaPicker onPick={(asset) => onChange(asset.url)} onClose={() => setPicking(false)} /> : null}
    </div>
  );
}
