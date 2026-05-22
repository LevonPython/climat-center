import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuizPage from '../pages/quiz';

// -- framework mocks ----------------------------------------------------------

jest.mock('next/router', () => ({
  useRouter: () => ({ locale: 'ru' })
}));

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'nav.quiz': 'Quick quiz',
        'quiz.title': 'Quick quiz',
        'quiz.subtitle': '2 steps + phone',
        'quiz.step': 'Step',
        'quiz.reset': 'Reset',
        'quiz.problemQuestion': "What's the issue?",
        'quiz.typeQuestion': 'AC type',
        'quiz.contactQuestion': 'Contact',
        'quiz.summary': 'Summary',
        'quiz.problem': 'Problem',
        'quiz.type': 'Type',
        'quiz.submit': 'Send',
        'quiz.success': 'Thanks! We received your request.',
        'quiz.problem0': 'Не морозит',
        'quiz.problem1': 'Течет вода',
        'quiz.problem2': 'Не включается',
        'quiz.problem3': 'Шумит',
        'quiz.problem4': 'Обмерзает',
        'quiz.problem5': 'Неприятный запах',
        'quiz.acType0': 'Настенный',
        'quiz.acType1': 'Кассетный',
        'quiz.acType2': 'Канальный',
        'quiz.acType3': 'Напольно-потолочный',
        'quiz.acType4': 'Оконный',
        'quiz.acType5': 'Колонный',
        'form.name': 'Name',
        'form.namePlaceholder': 'Your name',
        'form.phone': 'Phone',
        'form.phonePlaceholder': '+374...',
        'form.phoneInvalid': 'Invalid phone',
        'form.sending': 'Sending...',
        'actions.next': 'Next',
        'actions.back': 'Back',
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

function clickNext() {
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/** Navigate to step 3 by picking the first option in each step. */
function goToStep3() {
  // Step 1: pick first problem option
  const step1Options = screen.getAllByRole('button').filter(
    (b) => !['Next', 'Back', 'Send', 'Reset'].includes(b.textContent ?? '')
  );
  fireEvent.click(step1Options[0]);
  clickNext();

  // Step 2: pick first AC type option
  const step2Options = screen.getAllByRole('button').filter(
    (b) => !['Next', 'Back', 'Send', 'Reset'].includes(b.textContent ?? '')
  );
  fireEvent.click(step2Options[0]);
  clickNext();
}

function fillPhone(value: string) {
  fireEvent.change(screen.getByPlaceholderText('+374...'), {
    target: { value }
  });
}

function blurPhone() {
  fireEvent.blur(screen.getByPlaceholderText('+374...'));
}

// -- tests --------------------------------------------------------------------

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('QuizPage — navigation', () => {
  test('starts at step 1/3', () => {
    render(<QuizPage />);
    expect(screen.getByText('Step 1/3')).toBeInTheDocument();
  });

  test('Next button is disabled until a problem is selected on step 1', () => {
    render(<QuizPage />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('Next button enables after selecting a problem', () => {
    render(<QuizPage />);
    const problemButtons = screen.getAllByRole('button').filter(
      (b) => !['Next', 'Reset'].includes(b.textContent ?? '')
    );
    fireEvent.click(problemButtons[0]);
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
  });

  test('advances to step 2 after selecting a problem and clicking Next', () => {
    render(<QuizPage />);
    const problemButtons = screen.getAllByRole('button').filter(
      (b) => !['Next', 'Reset'].includes(b.textContent ?? '')
    );
    fireEvent.click(problemButtons[0]);
    clickNext();
    expect(screen.getByText('Step 2/3')).toBeInTheDocument();
  });

  test('advances to step 3 after selecting an AC type', () => {
    render(<QuizPage />);
    goToStep3();
    expect(screen.getByText('Step 3/3')).toBeInTheDocument();
  });

  test('Reset button returns to step 1', () => {
    render(<QuizPage />);
    goToStep3();
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset' })[0]);
    expect(screen.getByText('Step 1/3')).toBeInTheDocument();
  });
});

describe('QuizPage — phone validation on step 3', () => {
  beforeEach(() => {
    render(<QuizPage />);
    goToStep3();
  });

  test('renders phone placeholder +374...', () => {
    expect(screen.getByPlaceholderText('+374...')).toBeInTheDocument();
  });

  test('Send button is disabled when phone is empty', () => {
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  test('Send button is disabled for an invalid phone number', () => {
    fillPhone('+7 000');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  test('Send button enables with a valid Armenian phone', () => {
    fillPhone('+37499123456');
    expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled();
  });

  test('shows phone error after blur with invalid number', () => {
    fillPhone('+7 000');
    blurPhone();
    expect(screen.getByText('Invalid phone')).toBeInTheDocument();
  });

  test('hides phone error once a valid number is entered', () => {
    fillPhone('+7 000');
    blurPhone();
    fillPhone('+37499123456');
    expect(screen.queryByText('Invalid phone')).not.toBeInTheDocument();
  });

  test('Send button remains disabled (not clickable) when phone is invalid', () => {
    fillPhone('+7 bad');
    // The Send button is disabled for invalid phones; clicking it is a no-op.
    // The error surfaces via onBlur, not via a click on the disabled button.
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});

describe('QuizPage — form submission', () => {
  test('shows success banner after successful API call', async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: true, quiz_submission: { id: 'x1' } });

    render(<QuizPage />);
    goToStep3();
    fillPhone('+37499123456');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText('Thanks! We received your request.')).toBeInTheDocument();
    });
  });

  test('shows error message when the API call fails', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      error: { message: 'Network error' }
    });

    render(<QuizPage />);
    goToStep3();
    fillPhone('+37499123456');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  test('Reset inside success banner returns to step 1', async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: true, quiz_submission: { id: 'x2' } });

    render(<QuizPage />);
    goToStep3();
    fillPhone('+37499123456');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => screen.getByText('Thanks! We received your request.'));

    const resetButtons = screen.getAllByRole('button', { name: 'Reset' });
    fireEvent.click(resetButtons[resetButtons.length - 1]);

    expect(screen.getByText('Step 1/3')).toBeInTheDocument();
  });
});
