import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearToken, getToken } from './auth';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { LeaveGuard, UnsavedProvider, useConfirmLeave } from './lib/unsaved';
import { BookingsPage } from './pages/BookingsPage';
import { ContentPage } from './pages/ContentPage';
import { GalleriesPage } from './pages/GalleriesPage';
import { LoginPage } from './pages/LoginPage';
import { MediaPage } from './pages/MediaPage';
import { NavigationPage } from './pages/NavigationPage';
import { PageEditorPage } from './pages/PageEditorPage';
import { PagesPage } from './pages/PagesPage';
import { ServicesPage } from './pages/ServicesPage';
import { TranslationsPage } from './pages/TranslationsPage';
import { UsersPage } from './pages/UsersPage';

function Private({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const token = getToken();
  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.bookings' },
  { to: '/pages', labelKey: 'nav.pages' },
  { to: '/services', labelKey: 'nav.services' },
  { to: '/navigation', labelKey: 'nav.navigation' },
  { to: '/galleries', labelKey: 'nav.galleries' },
  { to: '/media', labelKey: 'nav.media' },
  { to: '/settings', labelKey: 'nav.settings' },
  { to: '/translations', labelKey: 'nav.translations' },
  { to: '/content', labelKey: 'nav.content' },
  { to: '/users', labelKey: 'nav.users' }
];

function isActive(to: string, pathname: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

function Shell(props: { children: JSX.Element; titleKey: string }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const location = useLocation();
  const confirmLeave = useConfirmLeave();

  return (
    <div className="min-h-screen grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 bg-white">
        <div className="px-5 py-4 flex items-center justify-between gap-2">
          <span className="font-extrabold text-slate-900">{t('shell.title')}</span>
          <LanguageSwitcher />
        </div>
        <nav className="px-3 pb-4 flex flex-wrap gap-1 lg:grid">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={[
                'rounded-xl px-3 py-2 text-sm font-semibold',
                isActive(item.to, location.pathname) ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
              ].join(' ')}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <button
            type="button"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            onClick={() => {
              if (!confirmLeave()) return;
              clearToken();
              nav('/login');
            }}
          >
            {t('shell.logout')}
          </button>
        </div>
      </aside>

      <main className="min-w-0 p-5">
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

const PRIVATE_ROUTES = [
  { path: '/', titleKey: 'bookings.title', element: <BookingsPage /> },
  { path: '/pages', titleKey: 'pages.title', element: <PagesPage /> },
  { path: '/pages/:id', titleKey: 'pages.editTitle', element: <PageEditorPage /> },
  { path: '/services', titleKey: 'services.title', element: <ServicesPage /> },
  { path: '/navigation', titleKey: 'navigation.title', element: <NavigationPage /> },
  { path: '/galleries', titleKey: 'galleries.title', element: <GalleriesPage /> },
  { path: '/media', titleKey: 'media.title', element: <MediaPage /> },
  { path: '/settings', titleKey: 'settings.title', element: <ContentPage key="global" scope="global" /> },
  { path: '/translations', titleKey: 'translations.title', element: <TranslationsPage /> },
  { path: '/content', titleKey: 'content.title', element: <ContentPage key="pages" scope="pages" /> },
  { path: '/users', titleKey: 'users.title', element: <UsersPage /> }
];

export default function App() {
  return (
    <UnsavedProvider>
      <LeaveGuard />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {PRIVATE_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <Private>
                <Shell titleKey={route.titleKey}>{route.element}</Shell>
              </Private>
            }
          />
        ))}
      </Routes>
    </UnsavedProvider>
  );
}
