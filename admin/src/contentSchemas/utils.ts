import { LANGS, type Content, type FieldDef, type Lang } from './types';

export type IssueCode = 'unknownKey' | 'notText' | 'notList' | 'invalidOption' | 'invalidUrl' | 'invalidLink' | 'invalidEmail' | 'invalidPhone';
export type ValidationIssue = { path: string; code: IssueCode };

export function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObjectRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, canonicalize(value[key])])
  );
}

export function stableStringify(value: unknown, indent?: number): string {
  return JSON.stringify(canonicalize(value), null, indent);
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafeLink(s: string): boolean {
  return /^(\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(s);
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidPhone(s: string): boolean {
  return /^[+0-9()\s-]{6,}$/.test(s);
}

function expandKeys(field: FieldDef): string[] {
  return field.multilingual ? LANGS.map((lang) => `${field.key}_${lang}`) : [field.key];
}

export function storageKey(field: FieldDef, lang: Lang): string {
  return field.multilingual ? `${field.key}_${lang}` : field.key;
}

export function makeEmptyDraft(fields: FieldDef[]): Content {
  return Object.fromEntries(fields.flatMap((field) => expandKeys(field).map((key) => [key, field.kind === 'list' ? [] : null])));
}

// Fills in every missing key so comparing a draft with what is saved only reports real edits.
export function normalizeContent(fields: FieldDef[], content: Content): Content {
  const out: Content = { ...makeEmptyDraft(fields), ...content };
  for (const field of fields) {
    const value = out[field.key];
    if (field.kind === 'list' && Array.isArray(value)) {
      out[field.key] = value.map((item) => (isObjectRecord(item) ? normalizeContent(field.fields || [], item) : item));
    }
  }
  return out;
}

export function validateDraft(fields: FieldDef[], draft: Content, prefix = ''): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const known = new Set(fields.flatMap(expandKeys));

  for (const key of Object.keys(draft)) {
    if (!known.has(key)) issues.push({ path: `${prefix}${key}`, code: 'unknownKey' });
  }

  for (const field of fields) {
    for (const key of expandKeys(field)) {
      const value = draft[key];
      const path = `${prefix}${key}`;
      if (field.kind === 'list') {
        if (value === undefined) continue;
        if (!Array.isArray(value)) {
          issues.push({ path, code: 'notList' });
          continue;
        }
        value.forEach((item, index) => {
          if (isObjectRecord(item)) issues.push(...validateDraft(field.fields || [], item, `${path}[${index}].`));
          else issues.push({ path: `${path}[${index}]`, code: 'notList' });
        });
        continue;
      }
      if (value === undefined || value === null) continue;
      if (typeof value !== 'string') {
        issues.push({ path, code: 'notText' });
        continue;
      }
      if (field.kind === 'select' && !field.options?.includes(value)) issues.push({ path, code: 'invalidOption' });
      const trimmed = value.trim();
      if (!trimmed) continue;
      if (field.kind === 'url' && !isValidUrl(trimmed)) issues.push({ path, code: 'invalidUrl' });
      if (field.kind === 'link' && !isSafeLink(trimmed)) issues.push({ path, code: 'invalidLink' });
      if (field.kind === 'email' && !isValidEmail(trimmed)) issues.push({ path, code: 'invalidEmail' });
      if (field.kind === 'phone' && !isValidPhone(trimmed)) issues.push({ path, code: 'invalidPhone' });
    }
  }

  return issues;
}
