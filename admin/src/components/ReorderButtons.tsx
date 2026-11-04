import { useTranslation } from 'react-i18next';
import { ui } from './ui';

type ReorderButtonsProps = {
  index: number;
  total: number;
  disabled?: boolean;
  name?: string;
  onMove: (delta: number) => void;
};

export function ReorderButtons({ index, total, disabled, name, onMove }: ReorderButtonsProps) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex gap-1">
      <button
        type="button"
        className={ui.secondary}
        aria-label={name ? t('common.moveUpNamed', { name }) : t('common.moveUp')}
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        className={ui.secondary}
        aria-label={name ? t('common.moveDownNamed', { name }) : t('common.moveDown')}
        disabled={disabled || index === total - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
    </span>
  );
}
