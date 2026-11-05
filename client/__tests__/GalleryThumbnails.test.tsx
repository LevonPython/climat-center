import { fireEvent, screen, within } from '@testing-library/react';
import { GallerySection } from '../components/sections/media';
import { SITE, renderWithSite } from '../test/helpers';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: Record<string, unknown>) => (options?.number ? `${key} ${options.number}` : key) })
}));
jest.mock('../lib/api', () => ({ apiBaseUrl: () => 'https://api.example' }));

const STORE = 'store.public.blob.vercel-storage.com';
const STORED_PHOTO = `https://${STORE}/uploads/photo.jpg`;

function renderWorks(url: string) {
  const works = [{ id: 'w1', url, title: null, alt: null, link_url: null }];
  renderWithSite(<GallerySection content={{ collection: 'works' }} />, { ...SITE, galleries: { works } });
  return screen.getByRole('button', { name: 'sections.showPicture 1' });
}

describe('works gallery pictures', () => {
  const originalStore = process.env.NEXT_PUBLIC_BLOB_HOST;
  beforeAll(() => {
    process.env.NEXT_PUBLIC_BLOB_HOST = STORE;
  });
  afterAll(() => {
    process.env.NEXT_PUBLIC_BLOB_HOST = originalStore;
  });

  test('a stored photo is shown at thumbnail size, not as the full file', () => {
    const picture = within(renderWorks(STORED_PHOTO)).getByRole('presentation', { hidden: true });
    expect(picture.getAttribute('src')).toContain(`/_next/image?url=${encodeURIComponent(STORED_PHOTO)}`);
    expect(picture.getAttribute('srcset')).toBeTruthy();
    expect(picture).toHaveAttribute('sizes', '(min-width: 768px) 310px, (min-width: 640px) 50vw, 100vw');
    expect(picture).toHaveAttribute('loading', 'lazy');
  });

  test.each([
    ['a local upload', '/uploads/photo.jpg', 'https://api.example/uploads/photo.jpg'],
    ['a picture stored elsewhere', 'https://cdn.example/photo.jpg', 'https://cdn.example/photo.jpg']
  ])('%s keeps its own address, because the site can only resize its own store', (_name, url, expected) => {
    const picture = within(renderWorks(url)).getByRole('presentation', { hidden: true });
    expect(picture).toHaveAttribute('src', expected);
    expect(picture).not.toHaveAttribute('srcset');
  });

  test('opening a thumbnail shows the full-size photo', () => {
    fireEvent.click(renderWorks(STORED_PHOTO));
    expect(within(screen.getByRole('dialog')).getByRole('presentation', { hidden: true })).toHaveAttribute('src', STORED_PHOTO);
  });
});
