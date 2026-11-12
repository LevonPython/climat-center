import { fireEvent, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../src/api';
import { TranslationsPage } from '../src/pages/TranslationsPage';
import { bodyOf, callsTo, renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn(), assetUrl: (url: string) => url }));
jest.mock('../src/lib/publicTexts', () => ({
  PUBLIC_TEXTS: [
    { key: 'nav.home', defaults: { hy: 'Գլխավոր', ru: 'Главная', en: 'Home', ar: 'الرئيسية' } },
    { key: 'nav.quiz', defaults: { hy: 'Հարցում', ru: 'Опрос', en: 'Quiz', ar: 'استبيان' } },
    { key: 'footer.note', defaults: { hy: 'Ծանոթ', ru: 'Заметка', en: 'Note', ar: 'ملاحظة' } }
  ]
}));

const apiFetchMock = apiFetch as unknown as jest.Mock;
const box = (key: string, language: string) => screen.getByLabelText(`${key} ${language}`);

describe('TranslationsPage', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    apiFetchMock.mockReset();
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => confirmSpy.mockRestore());

  test('shows the default text as a hint and the saved change as the value', async () => {
    routeApi(apiFetchMock, {
      'GET /api/admin/translations': { ok: true, translations: [{ key: 'nav.home', value_hy: 'Սկիզբ', value_ru: null, value_en: null }] }
    });
    renderScreen(<TranslationsPage />);
    await screen.findByText('nav (2)');

    expect(box('nav.home', 'Հայերեն')).toHaveValue('Սկիզբ');
    expect(box('nav.home', 'Русский')).toHaveValue('');
    expect(box('nav.home', 'Русский')).toHaveAttribute('placeholder', 'Главная');
  });

  test('saves every language, with an empty field meaning the default', async () => {
    routeApi(apiFetchMock, {
      'GET /api/admin/translations': { ok: true, translations: [] },
      'PUT /api/admin/translations/nav.quiz': { ok: true, translation: {} }
    });
    renderScreen(<TranslationsPage />);
    await screen.findByText('nav (2)');

    expect(box('nav.quiz', 'العربية')).toHaveAttribute('dir', 'rtl');
    expect(box('nav.quiz', 'English')).toHaveAttribute('dir', 'ltr');
    fireEvent.change(box('nav.quiz', 'English'), { target: { value: 'Survey' } });
    fireEvent.change(box('nav.quiz', 'العربية'), { target: { value: 'استطلاع' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить: nav.quiz' }));

    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/translations/nav.quiz')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/translations/nav.quiz')[0])).toEqual({ value_hy: null, value_ru: null, value_en: 'Survey', value_ar: 'استطلاع' });
  });

  test('going back to the default asks first and removes the change', async () => {
    routeApi(apiFetchMock, {
      'GET /api/admin/translations': { ok: true, translations: [{ key: 'nav.home', value_hy: 'Սկիզբ', value_ru: null, value_en: null }] },
      'DELETE /api/admin/translations/nav.home': { ok: true }
    });
    renderScreen(<TranslationsPage />);
    await screen.findByText('nav (2)');

    fireEvent.click(screen.getByRole('button', { name: 'Вернуть исходный: nav.home' }));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(callsTo(apiFetchMock, 'DELETE', '/api/admin/translations/nav.home')).toHaveLength(1));
  });

  test('search looks through keys and text in every language', async () => {
    routeApi(apiFetchMock, { 'GET /api/admin/translations': { ok: true, translations: [] } });
    renderScreen(<TranslationsPage />);
    await screen.findByText('nav (2)');

    fireEvent.change(screen.getByLabelText('Поиск'), { target: { value: 'заметка' } });
    expect(screen.getByText('footer (1)')).toBeInTheDocument();
    expect(screen.queryByText(/^nav/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Поиск'), { target: { value: 'nothing like this' } });
    expect(screen.getByText('Ничего не найдено.')).toBeInTheDocument();
  });

  test('searching does not throw away text that has not been saved', async () => {
    routeApi(apiFetchMock, { 'GET /api/admin/translations': { ok: true, translations: [] } });
    renderScreen(<TranslationsPage />);
    await screen.findByText('nav (2)');

    fireEvent.change(box('nav.home', 'English'), { target: { value: 'Start' } });
    fireEvent.change(screen.getByLabelText('Поиск'), { target: { value: 'заметка' } });
    fireEvent.change(screen.getByLabelText('Поиск'), { target: { value: '' } });

    expect(box('nav.home', 'English')).toHaveValue('Start');
  });

  test('can show only the changed texts', async () => {
    routeApi(apiFetchMock, {
      'GET /api/admin/translations': { ok: true, translations: [{ key: 'footer.note', value_hy: 'Նոր', value_ru: null, value_en: null }] }
    });
    renderScreen(<TranslationsPage />);
    await screen.findByText('nav (2)');

    fireEvent.click(screen.getByLabelText('Только изменённые'));

    expect(screen.getByText('footer (1)')).toBeInTheDocument();
    expect(screen.queryByText(/^nav/)).not.toBeInTheDocument();
  });
});
