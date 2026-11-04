import type { ReactNode } from 'react';
import { ui } from './ui';

type LabeledFieldProps = {
  label: string;
  help?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
};

// Help sits outside the label so it doesn't become part of the field's spoken name.
export function LabeledField({ label, help, error, className, children }: LabeledFieldProps) {
  return (
    <div className={`grid content-start gap-1 ${className || ''}`}>
      <label className="grid gap-1">
        <span className={ui.label}>{label}</span>
        {children}
      </label>
      {error ? <span className={ui.error}>{error}</span> : help ? <span className={ui.help}>{help}</span> : null}
    </div>
  );
}
