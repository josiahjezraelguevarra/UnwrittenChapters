import { useCallback, useEffect, useState } from 'react';
import { FEEDBACK_FORM_URL, REPORT_FORM_URL } from '../shared/contact';
import type { AppPublicConfig } from '../shared/types';
import { DonateModal } from './components/DonateModal';
import { fetchAppConfig } from './lib/api';
import { GalleryPage } from './pages/GalleryPage';
import { HomePage } from './pages/HomePage';
import { ManagePage } from './pages/ManagePage';
import { MediaViewPage } from './pages/MediaViewPage';

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

  const toggleHomeTheme = useCallback(() => {
    setHomeTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(HOME_THEME_KEY, next);
      } catch {
        // Ignore storage errors
      }
      return next;
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
      ) : (
        <HomePage
          config={config}
          homeTheme={homeTheme}
          onToggleHomeTheme={toggleHomeTheme}
          onOpenDonate={() => setDonateOpen(true)}
          onNavigate={navigate}
        />
      )}

      <DonateModal
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        appName={config.appName}
        donateUrl={config.donateUrl}
        dark={!manageMatch && !mediaViewMatch && !galleryMatch && homeTheme === 'dark'}
      />
    </>
  );
}
