import { fireEvent, render, screen } from '@testing-library/react';
import { Carousel } from '../components/site/Carousel';
import { Lightbox } from '../components/site/Lightbox';
import { textDirection } from '../lib/direction';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const images = [{ url: 'https://cdn.example/a.jpg' }, { url: 'https://cdn.example/b.jpg' }, { url: 'https://cdn.example/c.jpg' }];

describe('right-to-left pages', () => {
  const scrollBy = jest.fn();

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, value: scrollBy });
  });

  afterEach(() => {
    scrollBy.mockReset();
    document.documentElement.removeAttribute('dir');
  });

  test('only Arabic is written right to left', () => {
    expect(['hy', 'ru', 'en', 'ar', undefined].map(textDirection)).toEqual(['ltr', 'ltr', 'ltr', 'rtl', 'ltr']);
  });

  test.each([
    ['ltr', 1],
    ['rtl', -1]
  ])('in a %s page, "next" scrolls the carousel toward its end', (dir, sign) => {
    render(
      <div dir={dir}>
        <Carousel label="Brands">
          <span>One</span>
        </Carousel>
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: 'sections.next' }));
    expect(Math.sign(scrollBy.mock.calls[0][0].left)).toBe(sign);
  });

  test.each([
    ['ltr', 'ArrowRight'],
    ['rtl', 'ArrowLeft']
  ])('in a %s page, %s shows the next picture', (dir, key) => {
    document.documentElement.setAttribute('dir', dir);
    const onChange = jest.fn();
    render(<Lightbox images={images} index={1} onChange={onChange} onClose={jest.fn()} />);
    fireEvent.keyDown(window, { key });
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
