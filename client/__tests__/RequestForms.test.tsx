import { fireEvent, screen, waitFor } from '@testing-library/react';
import { RequestFormSection } from '../components/sections/site';
import { RequestPopup } from '../components/site/RequestPopup';
import { renderWithSite } from '../test/helpers';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'hy', asPath: '/usluga/remont?utm=1' }) }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
const mockApiFetch = jest.fn();
jest.mock('../lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiBaseUrl: () => 'https://api.example'
}));

const VALID_PHONE = '+37491123456';
const sentBody = () => JSON.parse(mockApiFetch.mock.calls[0][1].body);

function fill(name: string, phone: string) {
  fireEvent.change(screen.getByLabelText('form.name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('form.phone'), { target: { value: phone } });
}

describe('request window', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({ ok: true, booking: {} });
  });

  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'request.submit' }));

  test('sends the work chosen and the page, without its query', async () => {
    renderWithSite(<RequestPopup onClose={jest.fn()} />);
    fill('Արամ', VALID_PHONE);
    fireEvent.click(screen.getByLabelText('request.work.repair'));
    fireEvent.click(screen.getByLabelText('request.work.cleaning'));
    submit();

    await screen.findByRole('status');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/bookings', expect.objectContaining({ method: 'POST' }));
    expect(sentBody()).toEqual({ user_name: 'Արամ', phone: VALID_PHONE, work_types: ['repair', 'cleaning'], source_page: '/usluga/remont', website: '' });
  });

  test('confirms in plain words', async () => {
    renderWithSite(<RequestPopup onClose={jest.fn()} />);
    fill('Արամ', VALID_PHONE);
    fireEvent.click(screen.getByLabelText('request.work.other'));
    submit();

    expect(await screen.findByRole('status')).toHaveTextContent('request.sent');
    expect(screen.queryByRole('button', { name: 'request.submit' })).not.toBeInTheDocument();
  });

  test('asks for at least one kind of work', () => {
    renderWithSite(<RequestPopup onClose={jest.fn()} />);
    fill('Արամ', VALID_PHONE);
    submit();

    expect(screen.getByText('request.workRequired')).toBeInTheDocument();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  test('choosing work clears that message', () => {
    renderWithSite(<RequestPopup onClose={jest.fn()} />);
    submit();
    fireEvent.click(screen.getByLabelText('request.work.install'));
    expect(screen.queryByText('request.workRequired')).not.toBeInTheDocument();
  });

  test('refuses a phone number that is not valid', () => {
    renderWithSite(<RequestPopup onClose={jest.fn()} />);
    fill('Արամ', '123');
    fireEvent.click(screen.getByLabelText('request.work.repair'));
    submit();

    expect(screen.getByText('form.phoneInvalid')).toBeInTheDocument();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  test('a refused request says so and keeps what was typed', async () => {
    mockApiFetch.mockResolvedValue({ ok: false, error: { message: 'column does not exist' } });
    renderWithSite(<RequestPopup onClose={jest.fn()} />);
    fill('Արամ', VALID_PHONE);
    fireEvent.click(screen.getByLabelText('request.work.repair'));
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('request.failed');
    expect(screen.queryByText(/does not exist/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('form.name')).toHaveValue('Արամ');
  });

  test('a lost connection is handled the same way', async () => {
    mockApiFetch.mockRejectedValue(new TypeError('fetch failed'));
    renderWithSite(<RequestPopup onClose={jest.fn()} />);
    fill('Արամ', VALID_PHONE);
    fireEvent.click(screen.getByLabelText('request.work.repair'));
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('request.failed');
  });

  test('passes the hidden field along, so the server can discard bots', async () => {
    renderWithSite(<RequestPopup onClose={jest.fn()} />);
    fill('Bot', VALID_PHONE);
    fireEvent.change(document.querySelector('input[name="website"]') as HTMLInputElement, { target: { value: 'spam' } });
    fireEvent.click(screen.getByLabelText('request.work.repair'));
    submit();

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(sentBody().website).toBe('spam');
  });

  test('closes with its button', () => {
    const onClose = jest.fn();
    renderWithSite(<RequestPopup onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'sections.close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('form on a page', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({ ok: true, booking: {} });
  });

  test('sends name, phone and page, and needs no work type', async () => {
    renderWithSite(<RequestFormSection content={{ heading: 'Оставьте **заявку**', button_label: 'Отправить заявку' }} sectionId="s1" />);
    fill('Արամ', VALID_PHONE);
    fireEvent.click(screen.getByRole('button', { name: 'Отправить заявку' }));

    expect(await screen.findByRole('status')).toHaveTextContent('request.sent');
    expect(sentBody()).toMatchObject({ user_name: 'Արամ', work_types: [], source_page: '/usluga/remont' });
  });

  test('says what giving your details means, as the request window does', () => {
    renderWithSite(<RequestFormSection content={{}} sectionId="s1" />);
    expect(screen.getByText('request.consent')).toBeInTheDocument();
  });

  test('without a name nothing is sent', () => {
    renderWithSite(<RequestFormSection content={{}} sectionId="s1" />);
    fill('', VALID_PHONE);
    fireEvent.click(screen.getByRole('button', { name: 'request.submit' }));
    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('form.nameRequired');
    expect(screen.getByLabelText('form.name')).toHaveAttribute('aria-invalid', 'true');
  });

  test('without a phone nothing is sent, and it says why', () => {
    renderWithSite(<RequestFormSection content={{}} sectionId="s1" />);
    fill('Արամ', '');
    fireEvent.click(screen.getByRole('button', { name: 'request.submit' }));
    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('form.phoneInvalid');
  });

  test('messages stay away until the visitor tries to send', () => {
    renderWithSite(<RequestFormSection content={{}} sectionId="s1" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('two forms on one page keep separate fields', () => {
    renderWithSite(
      <>
        <RequestFormSection content={{}} sectionId="a" />
        <RequestFormSection content={{}} sectionId="b" />
      </>
    );
    expect(document.getElementById('form-a-name')).toBeTruthy();
    expect(document.getElementById('form-b-name')).toBeTruthy();
  });
});
