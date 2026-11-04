import '@testing-library/jest-dom';

const i18n = require('i18next').default || require('i18next');
const { initReactI18next } = require('react-i18next');
const ru = require('../public/locales/ru/common.json');
const ruSchema = require('../public/locales/ru/schema.json');

i18n.use(initReactI18next).init({
  lng: 'ru',
  resources: { ru: { common: ru, schema: ruSchema } },
  ns: ['common', 'schema'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
});

