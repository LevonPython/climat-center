import { fireEvent, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../src/api';
import { ContentPage } from '../src/pages/ContentPage';
import { bodyOf, callsTo, renderScreen, routeApi } from '../test/helpers';

jest.mock('../src/api', () => ({ apiFetch: jest.fn(), assetUrl: (url: string) => url }));
jest.mock('../src/components/RichTextEditor', () => ({ RichTextEditor: () => null }));

const apiFetchMock = apiFetch as unknown as jest.Mock;

const field = (key: string, label: string, kind = 'string', multilingual = true) => ({ key, label, kind, multilingual });

const schemas = {
  ok: true,
  block_types: [],
  site_blocks: [
    {
      page_name: 'global',
      section_name: 'contacts',
      title: 'Contacts',
      description: 'Phone, email, working hours and address used across the site.',
      groups: [{ id: 'main', label: 'Phone and email', fieldKeys: ['phone'] }],
      fields: [field('phone', 'Phone', 'phone', false)]
    },
    {
      page_name: 'global',
      section_name: 'footer',
      title: 'Site footer',
      groups: [{ id: 'main', label: 'Footer', fieldKeys: ['copyright'] }],
      fields: [field('copyright', 'Copyright')]
    },
    {
      page_name: 'about',
      section_name: 'page',
      title: 'About page',
      groups: [{ id: 'header', label: 'Top of the page', fieldKeys: ['title'] }],
      fields: [field('title', 'Title')]
    }
  ]
};

const blocks = {
  ok: true,
  content_blocks: [
    { id: 'c1', page_name: 'global', section_name: 'contacts', content_json: { phone: '+374 10 000000' } },
    { id: 'a1', page_name: 'about', section_name: 'page', content_json: { title_hy: 'Մեր մասին' } },
    { id: 'x1', page_name: 'global', section_name: 'old_thing', content_json: {} }
  ]
};

const base = { 'GET /api/admin/schemas': schemas, 'GET /api/content/blocks': blocks };
const SAVE = 'Сохранить';

describe('ContentPage', () => {
  beforeEach(() => apiFetchMock.mockReset());

  test('site settings lists only the global blocks, by their plain names', async () => {
    routeApi(apiFetchMock, base);
    renderScreen(<ContentPage />);

    expect(await screen.findByRole('button', { name: 'Контакты' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Подвал сайта' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Страница «О компании»' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Телефон')).toHaveValue('+374 10 000000');
  });

  test('a saved block is updated by its id', async () => {
    routeApi(apiFetchMock, {
      ...base,
      'PUT /api/content': { ok: true, content_block: { id: 'c1', page_name: 'global', section_name: 'contacts', content_json: { phone: '+374 11 111111' } } }
    });
    renderScreen(<ContentPage />);

    fireEvent.change(await screen.findByLabelText('Телефон'), { target: { value: '+374 11 111111' } });
    fireEvent.click(screen.getByRole('button', { name: SAVE }));

    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/content')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/content')[0])).toEqual({ id: 'c1', content_json: { phone: '+374 11 111111' } });
  });

  test('a block with no saved row yet can still be edited, and is created by its name', async () => {
    routeApi(apiFetchMock, {
      ...base,
      'PUT /api/content': { ok: true, content_block: { id: 'f1', page_name: 'global', section_name: 'footer', content_json: { copyright_hy: '©' } } }
    });
    renderScreen(<ContentPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Подвал сайта' }));
    fireEvent.change(screen.getByLabelText('Авторские права'), { target: { value: '©' } });
    fireEvent.click(screen.getByRole('button', { name: SAVE }));

    await waitFor(() => expect(callsTo(apiFetchMock, 'PUT', '/api/content')).toHaveLength(1));
    expect(bodyOf(callsTo(apiFetchMock, 'PUT', '/api/content')[0])).toMatchObject({
      page_name: 'global',
      section_name: 'footer',
      content_json: { copyright_hy: '©' }
    });
  });

  test('switching blocks with unsaved changes asks first', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    routeApi(apiFetchMock, base);
    renderScreen(<ContentPage />);

    fireEvent.change(await screen.findByLabelText('Телефон'), { target: { value: '+374 22 222222' } });
    fireEvent.click(screen.getByRole('button', { name: 'Подвал сайта' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByLabelText('Телефон')).toHaveValue('+374 22 222222');
    confirmSpy.mockRestore();
  });

  test('a stored block with no definition is not editable', async () => {
    routeApi(apiFetchMock, base);
    renderScreen(<ContentPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'global/old_thing' }));

    expect(screen.getByText('Этот блок нельзя редактировать здесь.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: SAVE })).not.toBeInTheDocument();
  });
});
