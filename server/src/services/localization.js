const LANGS = ['ru', 'en', 'hy', 'ar'];
const SUFFIX_PATTERN = new RegExp(`_(${LANGS.join('|')})$`);

function localizedColumns(base) {
  return LANGS.map((lang) => `${base}_${lang}`);
}

// Maps title_hy to title at any depth. There is no fallback between languages.
function resolveLangContent(value, lang) {
  if (Array.isArray(value)) return value.map((item) => resolveLangContent(item, lang));
  if (!value || typeof value !== 'object') return value;

  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (!SUFFIX_PATTERN.test(key)) out[key] = resolveLangContent(child, lang);
  }
  const suffix = `_${lang}`;
  for (const [key, child] of Object.entries(value)) {
    if (key.endsWith(suffix)) out[key.slice(0, -suffix.length)] = child;
  }
  return out;
}

module.exports = { LANGS, localizedColumns, resolveLangContent };
