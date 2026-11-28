import { Suspense, lazy, useCallback, useEffect, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { FEEDBACK_FORM_URL, REPORT_FORM_URL } from '../shared/contact';
import type { AppPublicConfig } from '../shared/types';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { DonateModal } from './components/DonateModal';
import { fetchAppConfig } from './lib/api';
import {
  canUsePreferenceStorage,
  loadCookieConsent,
  saveCookieConsent,
  type CookieConsentChoice
} from './lib/cookieConsent';
import { GalleryPage } from './pages/GalleryPage';
import { HomePage } from './pages/HomePage';
import { LegalPage } from './pages/LegalPage';
import { ManagePage } from './pages/ManagePage';
import { MediaViewPage } from './pages/MediaViewPage';

const ToolsPage = lazy(() =>
  import('./pages/ToolsPage').then((m) => ({ default: m.ToolsPage }))
);

const DEFAULT_CONFIG: AppPublicConfig = {
  appName: 'UnwrittenChapters',
  donateUrl: '',
  feedbackFormUrl: FEEDBACK_FORM_URL,
  reportFormUrl: REPORT_FORM_URL,
  turnstileSiteKey: '',
  turnstileRequired: false
};

const HOME_THEME_KEY = 'uc_home_theme';

function loadInitialHomeTheme(): 'light' | 'dark' {
  try {
    return localStorage.getItem(HOME_THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [config, setConfig] = useState<AppPublicConfig>(DEFAULT_CONFIG);
  const [donateOpen, setDonateOpen] = useState(false);
  const [homeTheme, setHomeTheme] = useState<'light' | 'dark'>(loadInitialHomeTheme);
  const [cookieConsent, setCookieConsent] = useState<CookieConsentChoice | null>(() =>
    loadCookieConsent()
  );
  const [cookieBannerOpen, setCookieBannerOpen] = useState(() => loadCookieConsent() === null);

  const toggleHomeTheme = useCallback((event?: MouseEvent<HTMLElement>) => {
    const commitThemeToggle = () => {
      setHomeTheme((prev) => {
        const next = prev === 'dark' ? 'light' : 'dark';
        if (canUsePreferenceStorage()) {
          try {
            localStorage.setItem(HOME_THEME_KEY, next);
          } catch {
            // Ignore storage errors
          }
        }
        return next;
      });
    };

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const docWithTransition = document as unknown as {
      startViewTransition?: (cb: () => void) => {
        ready: Promise<void>;
        finished: Promise<void>;
      };
    };

    if (reduceMotion || typeof docWithTransition.startViewTransition !== 'function') {
      commitThemeToggle();
      return;
    }

    const rect = event?.currentTarget?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 48;
    const y = rect ? rect.top + rect.height / 2 : 32;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const rootEl = document.documentElement;
    rootEl.classList.add('uc-theme-transition');

    const transition = docWithTransition.startViewTransition(() => {
      flushSync(commitThemeToggle);
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`
            ]
          },
          {
            duration: 540,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      })
      .catch(() => {
        // Ignore cancelled transitions on rapid toggles
      });

    transition.finished
      .catch(() => {
        // Ignore cancelled transitions on rapid toggles
      })
      .finally(() => {
        rootEl.classList.remove('uc-theme-transition');
      });
  }, []);

  useEffect(() => {
    fetchAppConfig()
      .then(setConfig)
      .catch(() => {
        // Keep default config
      });
  }, []);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    const url = new URL(path, window.location.origin);
    setPathname(url.pathname);
    window.scrollTo({ top: 0 });
  }, []);

  const manageMatch = pathname.match(/^\/g\/([a-zA-Z0-9_-]+)\/manage\/?$/);
  const mediaViewMatch = pathname.match(/^\/g\/([a-zA-Z0-9_-]+)\/view\/([a-zA-Z0-9_-]+)\/?$/);
  const galleryMatch = pathname.match(/^\/g\/([a-zA-Z0-9_-]+)\/?$/);
  const isToolsRoute = pathname === '/tools' || pathname === '/tools/';
  const isPrivacyRoute = pathname === '/privacy' || pathname === '/privacy/';
  const isTermsRoute = pathname === '/terms' || pathname === '/terms/';
  const isHomeRoute =
    !manageMatch && !mediaViewMatch && !galleryMatch && !isToolsRoute && !isPrivacyRoute && !isTermsRoute;
  const isHomeDark = (isHomeRoute || isPrivacyRoute || isTermsRoute) && homeTheme === 'dark';

  return (
    <>
      {manageMatch ? (
        <ManagePage slug={manageMatch[1]} onNavigate={navigate} />
      ) : mediaViewMatch ? (
        <MediaViewPage
          slug={mediaViewMatch[1]}
          fileId={mediaViewMatch[2]}
          config={config}
          onNavigate={navigate}
        />
      ) : galleryMatch ? (
        <GalleryPage
          slug={galleryMatch[1]}
          config={config}
          onOpenDonate={() => setDonateOpen(true)}
          onNavigate={navigate}
        />
      ) : isToolsRoute ? (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-[#f8f6f2] text-sm text-slate-600">
              Loading photo tools...
            </div>
          }
        >
          <ToolsPage config={config} onNavigate={navigate} />
        </Suspense>
      ) : isPrivacyRoute || isTermsRoute ? (
        <LegalPage
          kind={isPrivacyRoute ? 'privacy' : 'terms'}
          config={config}
          dark={homeTheme === 'dark'}
          onNavigate={navigate}
          onOpenCookieSettings={() => setCookieBannerOpen(true)}
        />
      ) : (
        <HomePage
          config={config}
          homeTheme={homeTheme}
          onToggleHomeTheme={toggleHomeTheme}
          onOpenDonate={() => setDonateOpen(true)}
          onOpenCookieSettings={() => setCookieBannerOpen(true)}
          onNavigate={navigate}
        />
      )}

      <DonateModal
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        appName={config.appName}
        donateUrl={config.donateUrl}
        dark={isHomeDark}
      />

      <CookieConsentBanner
        open={cookieBannerOpen}
        initialPreferences={cookieConsent?.preferences ?? true}
        canDismiss={cookieConsent !== null}
        hasBottomTicker={isHomeRoute || Boolean(galleryMatch)}
        onNavigate={navigate}
        onSaveConsent={(preferences) => {
          const saved = saveCookieConsent(preferences);
          setCookieConsent(saved);
          setCookieBannerOpen(false);
        }}
        onDismiss={() => setCookieBannerOpen(false)}
      />
    </>
  );
}
