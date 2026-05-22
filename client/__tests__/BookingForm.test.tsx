import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookingPage from '../pages/booking';

// -- framework mocks ----------------------------------------------------------

jest.mock('next/router', () => ({
  useRouter: () => ({ locale: 'ru', query: {}, push: jest.fn() })
}));

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'nav.booking': 'Booking',
        'booking.title': 'Leave a request',
        'booking.subtitle': 'Fill the form',
        'booking.success': 'Request sent.',
        'form.name': 'Name',
        'form.namePlaceholder': 'Your name',
        'form.phone': 'Phone',
        'form.phonePlaceholder': '+374...',
        'form.phoneInvalid': 'Invalid phone',
        'form.service': 'Service',
        'form.serviceAny': 'Any',
        'form.date': 'Date',
        'form.time': 'Time',
        'form.address': 'Address',
        'form.addressPlaceholder': 'City, street',
        'form.problem': 'Comment',
        'form.problemPlaceholder': 'Describe',
        'form.submit': 'Submit',
        'form.sending': 'Sending...',
        'errors.generic': 'Something went wrong.'
      };
      return map[key] ?? key;
    }
  })
}));

const mockApiFetch = jest.fn();
jest.mock('../lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args)
}));

jest.mock('../components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// -- helpers ------------------------------------------------------------------

function fillName(value: string) {
  fireEvent.change(screen.getByPlaceholderText('Your name'), {
    target: { value }
  });
}

function fillPhone(value: string) {
  fireEvent.change(screen.getByPlaceholderText('+374...'), {
    target: { value }
  });
}

function blurPhone() {
  fireEvent.blur(screen.getByPlaceholderText('+374...'));
}

function submitForm() {
  fireEvent.submit(screen.getByRole('button', { name: 'Submit' }).closest('form')!);
}

// -- tests --------------------------------------------------------------------

beforeEach(() => {
  mockApiFetch.mockReset();
  // Services request returns empty list by default
  mockApiFetch.mockResolvedValue({ ok: true, services: [] });
});

describe('BookingPage — phone field', () => {
  test('renders placeholder +374...', () => {
    render(<BookingPage />);
    expect(screen.getByPlaceholderText('+374...')).toBeInTheDocument();
  });

  test('does not show phone error before the field is touched', () => {
    render(<BookingPage />);
    expect(screen.queryByText('Invalid phone')).not.toBeInTheDocument();
  });

  test('shows phone error after blur with an invalid number', () => {
    render(<BookingPage />);
    fillPhone('+7 495 000');
    blurPhone();
    expect(screen.getByText('Invalid phone')).toBeInTheDocument();
  });

  test('hides phone error once a valid Armenian number is entered', () => {
    render(<BookingPage />);
    fillPhone('+7 495 000');
    blurPhone();
    expect(screen.getByText('Invalid phone')).toBeInTheDocument();

    fillPhone('+37499123456');
    expect(screen.queryByText('Invalid phone')).not.toBeInTheDocument();
  });

  test('strips non-phone characters from input', () => {
    render(<BookingPage />);
    fillPhone('+374abc99');
    const input = screen.getByPlaceholderText('+374...') as HTMLInputElement;
    expect(input.value).toBe('+37499');
  });
});

describe('BookingPage — submit button state', () => {
  test('submit button is disabled when name and phone are empty', () => {
    render(<BookingPage />);
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  test('submit button is disabled with a valid name but invalid phone', () => {
    render(<BookingPage />);
    fillName('Aram');
    fillPhone('123');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  test('submit button is disabled with a valid phone but no name', () => {
    render(<BookingPage />);
    fillPhone('+37499123456');
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
  });

  test('submit button is enabled with valid name and valid phone', () => {
    render(<BookingPage />);
    fillName('Aram');
    fillPhone('+37499123456');
    expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
  });
});

describe('BookingPage — form submission', () => {
  test('shows success message after successful submission', async () => {
    // Override: first call is the services request, second is the booking POST
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, services: [] })
      .mockResolvedValueOnce({ ok: true, booking: { id: 'abc' } });

    render(<BookingPage />);
    fillName('Aram');
    fillPhone('+37499123456');
    submitForm();

    await waitFor(() => {
      expect(screen.getByText('Request sent.')).toBeInTheDocument();
    });
  });

  test('shows phone error on submit attempt with invalid phone', async () => {
    render(<BookingPage />);
    fillName('Aram');
    fillPhone('+7 bad');
    submitForm();

    expect(screen.getByText('Invalid phone')).toBeInTheDocument();
  });

  test('shows error message when the API call fails', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, services: [] })
      .mockResolvedValueOnce({ ok: false, error: { message: 'Server error' } });

    render(<BookingPage />);
    fillName('Aram');
    fillPhone('+37499123456');
    submitForm();

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  test('clears the form after successful submission', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, services: [] })
      .mockResolvedValueOnce({ ok: true, booking: { id: 'abc' } });

    render(<BookingPage />);
    fillName('Aram');
    fillPhone('+37499123456');
    submitForm();

    await waitFor(() => screen.getByText('Request sent.'));

    const nameInput = screen.getByPlaceholderText('Your name') as HTMLInputElement;
    const phoneInput = screen.getByPlaceholderText('+374...') as HTMLInputElement;
    expect(nameInput.value).toBe('');
    expect(phoneInput.value).toBe('');
  });
});
