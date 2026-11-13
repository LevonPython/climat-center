import { useTranslation } from 'react-i18next';
import { useSchemaLabel } from '../contentSchemas/useSchemas';
import { textDirection, type Content, type FieldDef, type Lang } from '../contentSchemas/types';
import { isObjectRecord, makeEmptyDraft, storageKey } from '../contentSchemas/utils';
import { moveItem } from '../lib/order';
import { ImageField } from './ImageField';
import { LabeledField } from './LabeledField';
import { ReorderButtons } from './ReorderButtons';
import { RichTextEditor } from './RichTextEditor';
import { ui } from './ui';

type FieldEditorProps = {
  field: FieldDef;
  values: Content;
  lang: Lang;
  invalid: Set<string>;
  path?: string;
  onChange: (next: Content) => void;
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function ListField({ field, values, lang, invalid, path = '', onChange }: FieldEditorProps) {
  const { t } = useTranslation();
  const label = useSchemaLabel();
  const key = storageKey(field, lang);
  const rows = Array.isArray(values[key]) ? (values[key] as unknown[]) : [];
  const itemFields = field.fields || [];
  const setRows = (next: unknown[]) => onChange({ ...values, [key]: next });

  function remove(index: number) {
    if (!window.confirm(t('blocks.confirmRemoveItem'))) return;
    setRows(rows.filter((_, position) => position !== index));
  }

  return (
    <fieldset className="grid gap-2 rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-xs font-bold text-slate-800">{label(field.label)}</legend>
      {rows.map((row, index) => {
        const item = isObjectRecord(row) ? row : {};
        const itemName = t('blocks.itemNumber', { number: index + 1 });
        return (
          <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">{itemName}</span>
              <span className="flex flex-wrap gap-1">
                <ReorderButtons index={index} total={rows.length} name={itemName} onMove={(delta) => setRows(moveItem(rows, index, delta))} />
                <button type="button" className={ui.danger} aria-label={`${t('blocks.removeItem')}: ${itemName}`} onClick={() => remove(index)}>
                  {t('blocks.removeItem')}
                </button>
              </span>
            </div>
            {itemFields.map((itemField) => (
              <FieldEditor
                key={itemField.key}
                field={itemField}
                values={item}
                lang={lang}
                invalid={invalid}
                path={`${path}${key}[${index}].`}
                onChange={(next) => setRows(rows.map((other, position) => (position === index ? next : other)))}
              />
            ))}
          </div>
        );
      })}
      <div>
        <button type="button" className={ui.secondary} onClick={() => setRows([...rows, makeEmptyDraft(itemFields)])}>
          {t('blocks.addItem', { name: label(field.label) })}
        </button>
      </div>
    </fieldset>
  );
}

export function FieldEditor(props: FieldEditorProps) {
  const { field, values, lang, invalid, path = '', onChange } = props;
  const label = useSchemaLabel();
  const { t } = useTranslation();
  const key = storageKey(field, lang);
  const value = values[key];
  const name = label(field.label);
  const isInvalid = invalid.has(`${path}${key}`);
  const setText = (raw: string) => onChange({ ...values, [key]: raw.trim() ? raw : null });

  if (field.kind === 'list') return <ListField {...props} />;

  if (field.kind === 'rich_text') {
    return (
      <RichTextEditor
        key={key}
        label={name}
        value={typeof value === 'string' ? value : null}
        lang={lang}
        invalid={isInvalid}
        onChange={(html) => onChange({ ...values, [key]: html })}
      />
    );
  }

  if (field.kind === 'image') {
    return <ImageField label={name} value={typeof value === 'string' ? value : null} onChange={(url) => onChange({ ...values, [key]: url })} />;
  }

  return (
    <LabeledField label={name} help={field.help ? label(field.help) : undefined}>
      {field.kind === 'select' ? (
        <select
          className={isInvalid ? ui.inputInvalid : ui.input}
          value={asText(value)}
          aria-invalid={isInvalid}
          onChange={(event) => onChange({ ...values, [key]: event.target.value || null })}
        >
          <option value="">{t('blocks.chooseOption')}</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {label(option)}
            </option>
          ))}
        </select>
      ) : field.kind === 'text' ? (
        <textarea
          lang={field.multilingual ? lang : undefined}
          dir={field.multilingual ? textDirection(lang) : undefined}
          className={`${isInvalid ? ui.inputInvalid : ui.input} min-h-24`}
          value={asText(value)}
          aria-invalid={isInvalid}
          onChange={(event) => setText(event.target.value)}
        />
      ) : (
        <input
          lang={field.multilingual ? lang : undefined}
          dir={field.multilingual ? textDirection(lang) : undefined}
          type={field.kind === 'email' ? 'email' : field.kind === 'phone' ? 'tel' : field.kind === 'url' ? 'url' : 'text'}
          className={isInvalid ? ui.inputInvalid : ui.input}
          value={asText(value)}
          aria-invalid={isInvalid}
          onChange={(event) => setText(event.target.value)}
        />
      )}
    </LabeledField>
  );
}
