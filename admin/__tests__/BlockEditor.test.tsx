import { fireEvent, screen, waitFor } from '@testing-library/react';
import { BlockEditor } from '../src/components/BlockEditor';
import { LANGS, LANGUAGE_NAMES, type FieldDef } from '../src/contentSchemas/types';
import { apiFetch } from '../src/api';
import { renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn(), assetUrl: (url: string) => url }));
jest.mock('../src/components/RichTextEditor', () => ({
  RichTextEditor: ({ label, value, onChange }: any) => (
    <textarea aria-label={label} value={value || ''} onChange={(e) => onChange(e.target.value || null)} />
  )
}));

const apiFetchMock = apiFetch as unknown as jest.Mock;

const fields: FieldDef[] = [
  { key: 'heading', label: 'Heading', kind: 'string', multilingual: true },
  { key: 'body', label: 'Text', kind: 'rich_text', multilingual: true },
  { key: 'website', label: 'WhatsApp link', kind: 'url' },
  {
    key: 'items',
    label: 'Steps',
    kind: 'list',
    fields: [{ key: 'title', label: 'Title', kind: 'string', multilingual: true }]
  }
];

const save = () => screen.getByRole('button', { name: 'Сохранить' });

describe('BlockEditor', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    apiFetchMock.mockReset();
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => confirmSpy.mockRestore());

  test('edits only the chosen language and saves every language', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderScreen(<BlockEditor fields={fields} content={{ heading_hy: 'Հայ', heading_ru: 'Рус' }} onSave={onSave} />);

    expect(screen.getByLabelText('Заголовок')).toHaveValue('Հայ');
    fireEvent.click(screen.getByRole('button', { name: 'Русский' }));
    expect(screen.getByLabelText('Заголовок')).toHaveValue('Рус');

    fireEvent.change(screen.getByLabelText('Заголовок'), { target: { value: 'Новый' } });
    fireEvent.click(save());

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ heading_hy: 'Հայ', heading_ru: 'Новый', heading_en: null, items: [] });
    expect(await screen.findByRole('status')).toHaveTextContent('Сохранено');
  });

  test('each language tab edits its own field, and Arabic is typed right to left', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderScreen(<BlockEditor fields={fields} content={{}} onSave={onSave} />);

    for (const lang of LANGS) {
      fireEvent.click(screen.getByRole('button', { name: LANGUAGE_NAMES[lang] }));
      expect(screen.getByLabelText('Заголовок')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      fireEvent.change(screen.getByLabelText('Заголовок'), { target: { value: `heading ${lang}` } });
    }
    fireEvent.click(save());

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject(Object.fromEntries(LANGS.map((lang) => [`heading_${lang}`, `heading ${lang}`])));
  });

  test('nothing to save until something changes, and clearing a field stores null', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderScreen(<BlockEditor fields={fields} content={{ heading_hy: 'Հայ' }} onSave={onSave} />);

    expect(save()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Заголовок'), { target: { value: '   ' } });
    fireEvent.click(save());

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].heading_hy).toBeNull();
  });

  test('shows what the server stored after saving, such as cleaned rich text', async () => {
    const onSave = jest.fn().mockResolvedValue({ body_hy: '<p>clean</p>' });
    renderScreen(<BlockEditor fields={fields} content={{}} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Текст'), { target: { value: '<p>clean</p><script>x</script>' } });
    fireEvent.click(save());

    await waitFor(() => expect(screen.getByLabelText('Текст')).toHaveValue('<p>clean</p>'));
    expect(save()).toBeDisabled();
  });

  test('an invalid link blocks saving and is explained in plain words', () => {
    renderScreen(<BlockEditor fields={fields} content={{}} onSave={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Ссылка на WhatsApp'), { target: { value: 'javascript:alert(1)' } });

    expect(save()).toBeDisabled();
    expect(screen.getByText(/Укажите полную ссылку/)).toBeInTheDocument();
    expect(screen.getByLabelText('Ссылка на WhatsApp')).toHaveAttribute('aria-invalid', 'true');
  });

  test('list items can be added, reordered and removed', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderScreen(<BlockEditor fields={fields} content={{ items: [{ title_hy: 'Ա' }, { title_hy: 'Բ' }] }} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Переместить ниже: Элемент 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Добавить: Этапы' }));
    fireEvent.click(screen.getByRole('button', { name: 'Убрать: Элемент 2' }));
    fireEvent.click(save());

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].items).toEqual([
      { title_hy: 'Բ', title_ru: null, title_en: null, title_ar: null },
      { title_hy: null, title_ru: null, title_en: null, title_ar: null }
    ]);
  });

  test('keeps a list item when the editor declines the confirmation', () => {
    confirmSpy.mockReturnValue(false);
    renderScreen(<BlockEditor fields={fields} content={{ items: [{ title_hy: 'Ա' }] }} onSave={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Убрать: Элемент 1' }));

    expect(screen.getByRole('button', { name: 'Убрать: Элемент 1' })).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  test('a failed save shows a plain message and keeps the edit', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('column "x" does not exist'));
    renderScreen(<BlockEditor fields={fields} content={{}} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText('Заголовок'), { target: { value: 'Keep me' } });
    fireEvent.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить');
    expect(screen.queryByText(/does not exist/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Заголовок')).toHaveValue('Keep me');
  });

  test('restoring a version asks first and saves that version', async () => {
    routeApi(apiFetchMock, {
      'GET /versions': {
        ok: true,
        versions: [{ id: 'v1', updated_by_username: 'admin', content_json: { heading_hy: 'Հին' }, created_at: '2026-01-01T00:00:00Z' }]
      }
    });
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderScreen(<BlockEditor fields={fields} content={{ heading_hy: 'Նոր' }} versionsPath="/versions" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'История' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Восстановить' }));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].heading_hy).toBe('Հին');
  });

  test('a version that no longer fits the schema cannot be restored', async () => {
    routeApi(apiFetchMock, {
      'GET /versions': {
        ok: true,
        versions: [{ id: 'v1', updated_by_username: null, content_json: { removed_field: 'x' }, created_at: '2026-01-01T00:00:00Z' }]
      }
    });
    renderScreen(<BlockEditor fields={fields} content={{}} versionsPath="/versions" onSave={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'История' }));

    expect(await screen.findByRole('button', { name: 'Восстановить' })).toBeDisabled();
  });

  test('leaving JSON mode with broken input does not block saving the form', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderScreen(<BlockEditor fields={fields} content={{}} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: /JSON/ }));
    fireEvent.change(screen.getByRole('textbox', { name: /JSON/ }), { target: { value: '{ broken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Форма' }));
    fireEvent.change(screen.getByLabelText('Заголовок'), { target: { value: 'Из формы' } });

    expect(save()).toBeEnabled();
    fireEvent.click(save());
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].heading_hy).toBe('Из формы');
  });

  test('advanced JSON edits the same draft and flags broken input', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    renderScreen(<BlockEditor fields={fields} content={{}} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: /JSON/ }));
    const box = screen.getByRole('textbox', { name: /JSON/ });

    fireEvent.change(box, { target: { value: '{ broken' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(box, { target: { value: '{"heading_en":"From JSON"}' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(save());

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].heading_en).toBe('From JSON');
  });
});
