import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearToken, getToken } from './auth';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { LoginPage } from './pages/LoginPage';
import { BookingsPage } from './pages/BookingsPage';
import { ServicesPage } from './pages/ServicesPage';
import { ContentPage } from './pages/ContentPage';
import { UsersPage } from './pages/UsersPage';

function Private({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const token = getToken();
  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function Shell(props: { children: JSX.Element; titleKey: string }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const location = useLocation();
  const items = [
    { to: '/', label: t('nav.bookings') },
    { to: '/services', label: t('nav.services') },
    { to: '/content', label: t('nav.content') },
    { to: '/users', label: t('nav.users') }
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
        <div className="px-5 py-4 flex items-center justify-between gap-2">
          <span className="font-extrabold text-slate-900">{t('shell.title')}</span>
          <LanguageSwitcher />
        </div>
        <nav className="px-3 pb-4 grid gap-1">
          {items.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={[
                'rounded-xl px-3 py-2 text-sm font-semibold',
                location.pathname === i.to ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
              ].join(' ')}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <button
            type="button"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            onClick={() => {
              clearToken();
              nav('/login');
            }}
          >
            {t('shell.logout')}
          </button>
        </div>
      </aside>

      <main className="p-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between">
            <h1 className="text-2xl font-extrabold">{t(props.titleKey)}</h1>
          </div>
          <div className="mt-5">{props.children}</div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Private>
            <Shell titleKey="bookings.title">
              <BookingsPage />
            </Shell>
          </Private>
        }
      />
      <Route
        path="/services"
        element={
          <Private>
            <Shell titleKey="services.title">
              <ServicesPage />
            </Shell>
          </Private>
        }
      />
      <Route
        path="/content"
        element={
          <Private>
            <Shell titleKey="content.title">
              <ContentPage />
            </Shell>
          </Private>
        }
      />
      <Route
        path="/users"
        element={
          <Private>
            <Shell titleKey="users.title">
              <UsersPage />
            </Shell>
          </Private>
        }
      />
    </Routes>
  );
}

