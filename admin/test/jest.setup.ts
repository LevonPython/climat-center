import '@testing-library/jest-dom';

const i18n = require('i18next').default || require('i18next');
const { initReactI18next } = require('react-i18next');
const ru = require('../public/locales/ru/common.json');

i18n.use(initReactI18next).init({
  lng: 'ru',
  resources: { ru: { common: ru } },
  ns: ['common'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
});

