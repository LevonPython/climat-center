import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const push = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({
    locale: 'ru',
    asPath: '/services',
    push
  })
}));

describe('LanguageSwitcher', () => {
  test('calls router.push with selected locale', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(push).toHaveBeenCalledWith('/services', '/services', { locale: 'en' });
  });

  test('offers every language, Arabic included', () => {
    render(<LanguageSwitcher />);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['HY', 'RU', 'EN', 'AR']);
    fireEvent.click(screen.getByRole('button', { name: 'AR' }));
    expect(push).toHaveBeenCalledWith('/services', '/services', { locale: 'ar' });
  });
});

