const sanitizeHtml = require('sanitize-html');

const { expandFieldKeys } = require('../contentSchemas/registry');

const RICH_TEXT_OPTIONS = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'h4', 'blockquote', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan']
  },
  allowedClasses: { ul: ['two-columns'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false
};

function sanitizeRichText(html) {
  return sanitizeHtml(html, RICH_TEXT_OPTIONS);
}

function sanitizeContent(fields, content) {
  const out = { ...content };
  for (const field of fields) {
    for (const key of expandFieldKeys(field)) {
      if (field.kind === 'rich_text' && typeof out[key] === 'string') {
        out[key] = sanitizeRichText(out[key]);
      }
      if (field.kind === 'list' && Array.isArray(out[key])) {
        out[key] = out[key].map((item) => sanitizeContent(field.fields, item));
      }
    }
  }
  return out;
}

module.exports = { sanitizeContent, sanitizeRichText };
