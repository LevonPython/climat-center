import type { BlockDef, FieldDef, Lang } from './registry';

export type ValidationIssue = { path: string; message: string };

export function canonicalizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(obj).sort();
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = (obj as any)[k];
    if (typeof v === 'undefined') continue;
    out[k] = v;
  }
  return out;
}

export function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidEmail(s: string): boolean {
  // Simple sanity check (server will be strict on keys/types; formats are UX only)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidPhone(s: string): boolean {
  // Allow +, digits, spaces, parentheses, dashes
  return /^[+0-9()\s-]{6,}$/.test(s);
}

function fieldStorageKey(field: FieldDef, lang: Lang): string {
  return field.multilingual ? `${field.key}_${lang}` : field.key;
}

export function makeEmptyDraft(def: BlockDef): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of def.fields) {
    if (f.multilingual) {
      out[`${f.key}_ru`] = null;
      out[`${f.key}_en`] = null;
      out[`${f.key}_am`] = null;
    } else {
      out[f.key] = null;
    }
  }
  return out;
}

export function validateDraft(def: BlockDef, draft: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Unknown keys
  for (const k of Object.keys(draft)) {
    if (!def.allowedKeys.includes(k)) {
      issues.push({ path: k, message: 'Unknown key (not allowed by schema)' });
    }
  }

  // Types + basic format checks
  for (const f of def.fields) {
    const keys = f.multilingual ? (['ru', 'en', 'am'] as const).map((l) => `${f.key}_${l}`) : ([f.key] as const);
    for (const k of keys as readonly string[]) {
      const v = (draft as any)[k];
      if (typeof v === 'undefined') continue;
      if (v !== null && typeof v !== 'string') {
        issues.push({ path: k, message: 'Value must be a string (or null)' });
        continue;
      }
      if (typeof v === 'string' && v.trim()) {
        if (f.kind === 'url' && !isValidUrl(v.trim())) issues.push({ path: k, message: 'Invalid URL (use http/https)' });
        if (f.kind === 'email' && !isValidEmail(v.trim())) issues.push({ path: k, message: 'Invalid email address' });
        if (f.kind === 'phone' && !isValidPhone(v.trim())) issues.push({ path: k, message: 'Invalid phone number' });
      }
    }
  }

  return issues;
}

export function setFieldValue(def: BlockDef, draft: Record<string, unknown>, fieldKey: string, lang: Lang, raw: string) {
  const field = def.fields.find((f) => f.key === fieldKey);
  if (!field) return draft;

  const storageKey = fieldStorageKey(field, lang);
  const next = { ...draft };
  const trimmed = raw.trim();
  next[storageKey] = trimmed ? raw : null;
  return next;
}

