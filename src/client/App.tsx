import { useCallback, useEffect, useState } from 'react';
import type { AppPublicConfig } from '../shared/types';
import { DonateModal } from './components/DonateModal';
import { fetchAppConfig } from './lib/api';
import { GalleryPage } from './pages/GalleryPage';
import { HomePage } from './pages/HomePage';
import { ManagePage } from './pages/ManagePage';

const DEFAULT_CONFIG: AppPublicConfig = {
  appName: 'UnwrittenChapters',
  donateUrl: '',
  turnstileSiteKey: '',
  turnstileRequired: false
};

export function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [config, setConfig] = useState<AppPublicConfig>(DEFAULT_CONFIG);
  const [donateOpen, setDonateOpen] = useState(false);

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
  const galleryMatch = pathname.match(/^\/g\/([a-zA-Z0-9_-]+)\/?$/);

  return (
    <>
      {manageMatch ? (
        <ManagePage slug={manageMatch[1]} onNavigate={navigate} />
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
          onOpenDonate={() => setDonateOpen(true)}
          onNavigate={navigate}
        />
      )}

      <DonateModal
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        appName={config.appName}
        donateUrl={config.donateUrl}
      />
    </>
  );
}
