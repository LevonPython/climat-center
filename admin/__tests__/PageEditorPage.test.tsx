import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { apiFetch } from '../src/api';
import { PageEditorPage } from '../src/pages/PageEditorPage';
import { bodyOf, callsTo, renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn(), assetUrl: (url: string) => url }));
jest.mock('../src/components/RichTextEditor', () => ({
  RichTextEditor: ({ label, value, onChange }: any) => (
    <textarea aria-label={label} value={value || ''} onChange={(e) => onChange(e.target.value || null)} />
  )
}));

const apiFetchMock = apiFetch as unknown as jest.Mock;

const section = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  block_type: 'rich_text',
  sort_order: 0,
  is_visible: true,
  content_json: { heading_ru: `Раздел ${id}` },
  ...overrides
});

const basePage = {
  id: 'p1',
  slug: 'usluga/remont',
  type: 'service',
  parent_id: null,
  status: 'hidden',
  sort_order: 0,
  title_ru: 'Ремонт',
  title_en: null,
  title_hy: 'Վերանորոգում',
  meta_title_ru: null,
  meta_title_en: null,
  meta_title_hy: null,
  meta_description_ru: null,
  meta_description_en: null,
  meta_description_hy: null,
  needs_review_ru: false,
  needs_review_en: false,
  needs_review_hy: true
};

const schemas = {
  ok: true,
  site_blocks: [],
  block_types: [
    {
      type: 'rich_text',
      label: 'Text',
      description: 'Heading with formatted text.',
      fields: [
        { key: 'heading', label: 'Heading', kind: 'string', multilingual: true },
        { key: 'body', label: 'Text', kind: 'rich_text', multilingual: true }
      ]
    },
    { type: 'faq', label: 'Questions and answers', description: 'A list of questions with answers.', fields: [] }
  ]
};

function renderEditor(sections: unknown[], extra: Record<string, unknown> = {}) {
  routeApi(apiFetchMock, {
    'GET /api/admin/pages/p1': { ok: true, page: { ...basePage, sections } },
    'GET /api/admin/pages': { ok: true, pages: [basePage, { ...basePage, id: 'p2', slug: 'other', title_ru: 'Другая' }] },
    'GET /api/admin/schemas': schemas,
    ...extra
  });
  return renderScreen(
    <Routes>
      <Route path="/pages/:id" element={<PageEditorPage />} />
    </Routes>,
    '/pages/p1'
  );
}

describe('PageEditorPage', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    apiFetchMock.mockReset();
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => confirmSpy.mockRestore());

  test('saves page details and search texts per language', async () => {
    renderEditor([], {
      'PUT /api/admin/pages/p1': { ok: true, page: { ...basePage, meta_title_ru: 'Для поиска', status: 'published' } }
    });
    await screen.findByLabelText('Адрес');
    expect(screen.getByLabelText('Заголовок')).toHaveValue('Վերանորոգում');

    fireEvent.click(screen.getByRole('button', { name: 'Русский' }));
    fireEvent.change(screen.getByLabelText('Заголовок для поисковых систем'), { target: { value: 'Для поиска' } });
    fireEvent.change(screen.getByLabelText('Статус'), { target: { value: 'published' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Сохранить' })[0]);

    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/pages/p1')).toHaveLength(1));
    const body = bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/pages/p1')[0]);
    expect(body).toMatchObject({ meta_title_ru: 'Для поиска', status: 'published', title_hy: 'Վերանորոգում' });
    expect(body.id).toBeUndefined();
    expect(await screen.findByRole('status')).toHaveTextContent('Сохранено');
  });

  test('a bad address blocks saving', async () => {
    renderEditor([]);
    const address = await screen.findByLabelText('Адрес');

    fireEvent.change(address, { target: { value: 'Не Латиница' } });

    expect(address).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getAllByRole('button', { name: 'Сохранить' })[0]).toBeDisabled();
  });

  test('a page cannot be chosen as its own parent', async () => {
    renderEditor([]);
    await screen.findByRole('option', { name: 'Другая' });

    expect(screen.queryByRole('option', { name: 'Վերանորոգում' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Ремонт' })).not.toBeInTheDocument();
  });

  test('adds a section and opens it for editing', async () => {
    const added = section('new', { content_json: {} });
    const sections: unknown[] = [];
    renderEditor(sections, {
      'GET /api/admin/pages/p1': () => ({ ok: true, page: { ...basePage, sections } }),
      'POST /api/admin/pages/p1/sections': () => {
        sections.push(added);
        return { ok: true, section: added };
      }
    });
    await screen.findByRole('option', { name: 'Вопросы и ответы' });

    fireEvent.change(screen.getByLabelText('Тип нового раздела'), { target: { value: 'rich_text' } });
    expect(screen.getByText('Заголовок и оформленный текст.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Добавить раздел' }));

    expect(await screen.findByRole('textbox', { name: 'Текст' })).toBeInTheDocument();
    expect(bodyOf(callsTo(apiFetchMock, 'POST', '/api/admin/pages/p1/sections')[0])).toEqual({ block_type: 'rich_text' });
  });

  test('moves a section by sending the whole new order', async () => {
    renderEditor([section('a'), section('b'), section('c')], {
      'PUT /api/admin/pages/p1/sections/order': { ok: true }
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Переместить ниже: Раздел a' }));

    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/pages/p1/sections/order')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/pages/p1/sections/order')[0])).toEqual({ ids: ['b', 'a', 'c'] });
    expect(screen.getByRole('button', { name: 'Переместить выше: Раздел a' })).toBeDisabled();
  });

  test('a section is named by its heading in whichever language has one', async () => {
    renderEditor([section('a', { content_json: { heading_hy: 'Միայն հայերեն' } }), section('b', { content_json: {} })]);

    expect(await screen.findByText('Միայն հայերեն')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Изменить: Текст' })).toBeInTheDocument();
  });

  test('hides and shows a section without touching its content', async () => {
    renderEditor([section('a'), section('b', { is_visible: false })], {
      'PUT /api/admin/sections/a': { ok: true, section: section('a') },
      'PUT /api/admin/sections/b': { ok: true, section: section('b') }
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Скрыть: Раздел a' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/sections/a')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/sections/a')[0])).toEqual({ is_visible: false });

    fireEvent.click(screen.getByRole('button', { name: 'Показать: Раздел b' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/sections/b')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/sections/b')[0])).toEqual({ is_visible: true });
    expect(screen.getByText('Скрыто')).toBeInTheDocument();
  });

  test('deleting a section asks first', async () => {
    confirmSpy.mockReturnValue(false);
    renderEditor([section('a')], { 'DELETE /api/admin/sections/a': { ok: true } });

    fireEvent.click(await screen.findByRole('button', { name: 'Удалить: Раздел a' }));

    expect(callsTo(apiFetchMock, 'DELETE', '/api/admin/sections/a')).toHaveLength(0);

    confirmSpy.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Удалить: Раздел a' }));
    await waitFor(() => expect(callsTo(apiFetchMock, 'DELETE', '/api/admin/sections/a')).toHaveLength(1));
  });

  test('a refused delete keeps the open section and its unsaved edits', async () => {
    renderEditor([section('a')], {
      'DELETE /api/admin/sections/a': { ok: false, error: { message: 'Forbidden', status: 403 } }
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Изменить: Раздел a' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Текст' }), { target: { value: 'draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Удалить: Раздел a' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('нет прав');
    expect(screen.getByRole('textbox', { name: 'Текст' })).toHaveValue('draft');
  });

  test('a successful delete closes the open section', async () => {
    renderEditor([section('a')], { 'DELETE /api/admin/sections/a': { ok: true } });

    fireEvent.click(await screen.findByRole('button', { name: 'Изменить: Раздел a' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Текст' }), { target: { value: 'draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Удалить: Раздел a' }));

    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Текст' })).not.toBeInTheDocument());
  });

  test('edits a section with the form its block type describes', async () => {
    renderEditor([section('a')], {
      'PUT /api/admin/sections/a': { ok: true, section: section('a', { content_json: { body_hy: '<p>Տեքստ</p>' } }) }
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Изменить: Раздел a' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Текст' }), { target: { value: '<p>Տեքստ</p>' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Сохранить' })[1]);

    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/admin/sections/a')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/admin/sections/a')[0]).content_json.body_hy).toBe('<p>Տեքստ</p>');
  });

  test('closing a section with unsaved changes asks first', async () => {
    renderEditor([section('a')]);

    fireEvent.click(await screen.findByRole('button', { name: 'Изменить: Раздел a' }));
    const body = await screen.findByRole('textbox', { name: 'Текст' });
    fireEvent.change(body, { target: { value: 'draft' } });

    confirmSpy.mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть: Раздел a' }));

    expect(screen.getByRole('textbox', { name: 'Текст' })).toHaveValue('draft');
  });

  test('a failed background refresh keeps the form and its unsaved edits', async () => {
    let healthy = true;
    renderEditor([section('a')], {
      'GET /api/admin/pages/p1': () =>
        healthy ? { ok: true, page: { ...basePage, sections: [section('a')] } } : { ok: false, error: { message: 'Invalid token', status: 401 } },
      'PUT /api/admin/sections/a': () => {
        healthy = false;
        return { ok: true, section: section('a') };
      }
    });

    const title = await screen.findByLabelText('Заголовок');
    fireEvent.change(title, { target: { value: 'Не потерять' } });
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть: Раздел a' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Сеанс завершён');
    expect(screen.getByLabelText('Заголовок')).toHaveValue('Не потерять');
  });

  test('adding a section while another has unsaved edits asks first', async () => {
    renderEditor([section('a')], { 'POST /api/admin/pages/p1/sections': { ok: true, section: section('new') } });
    await screen.findByRole('option', { name: 'Вопросы и ответы' });

    fireEvent.click(await screen.findByRole('button', { name: 'Изменить: Раздел a' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Текст' }), { target: { value: 'draft' } });

    confirmSpy.mockReturnValue(false);
    fireEvent.change(screen.getByLabelText('Тип нового раздела'), { target: { value: 'faq' } });
    fireEvent.click(screen.getByRole('button', { name: 'Добавить раздел' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(callsTo(apiFetchMock, 'POST', '/api/admin/pages/p1/sections')).toHaveLength(0);
    expect(screen.getByRole('textbox', { name: 'Текст' })).toHaveValue('draft');
  });

  test('the home page cannot be switched to hidden', async () => {
    routeApi(apiFetchMock, {
      'GET /api/admin/pages/p1': { ok: true, page: { ...basePage, slug: 'home', status: 'published', sections: [] } },
      'GET /api/admin/pages': { ok: true, pages: [] },
      'GET /api/admin/schemas': schemas
    });
    renderScreen(
      <Routes>
        <Route path="/pages/:id" element={<PageEditorPage />} />
      </Routes>,
      '/pages/p1'
    );

    expect(await screen.findByLabelText('Статус')).toBeDisabled();
  });

  test('a page that is gone shows a plain message', async () => {
    routeApi(apiFetchMock, { 'GET /api/admin/pages/p1': { ok: false, error: { message: 'Not found', status: 404 } } });
    renderScreen(
      <Routes>
        <Route path="/pages/:id" element={<PageEditorPage />} />
      </Routes>,
      '/pages/p1'
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Страница не найдена');
  });
});
