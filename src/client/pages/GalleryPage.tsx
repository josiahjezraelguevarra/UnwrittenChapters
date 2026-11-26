import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import {
  AlertTriangle,
  Download,
  Lock,
  RefreshCw,
  X
} from 'lucide-react';
import type {
  AppPublicConfig,
  GalleryLayout,
  GalleryViewResponse,
  MediaItem
} from '../../shared/types';
import {
  FONT_PRESETS,
  resolveGalleryThemeTokens
} from '../../shared/customization';
import { SUPPORT_EMAIL, buildSupportMailto } from '../../shared/contact';
import { CustomSelect } from '../components/CustomSelect';
import { GallerySurface, type MediaFilter } from '../components/GallerySurface';
import { TurnstileWidget } from '../components/TurnstileWidget';
import { REPORT_REASON_OPTIONS } from '../config/galleryOptions';
import {
  ApiError,
  fetchGalleryView,
  mediaFullUrl,
  mediaThumbUrl,
  reportGallery,
  toggleLike,
  unlockGallery
} from '../lib/api';
import { usePageSeo } from '../lib/seo';
import { downloadItemsAsZip, type ZipProgress } from '../lib/zipDownload';

interface GalleryPageProps {
  slug: string;
  config: AppPublicConfig;
  onOpenDonate: () => void;
  onNavigate: (path: string) => void;
}

export function GalleryPage({ slug, config, onOpenDonate, onNavigate }: GalleryPageProps) {
  const [data, setData] = useState<GalleryViewResponse | null>(null);

  usePageSeo({
    title: data?.gallery.title
      ? `${data.gallery.title} — ${config.appName}`
      : `Client Gallery — ${config.appName}`,
    description:
      data?.gallery.description ||
      `Private client photo and video gallery shared on ${config.appName}.`,
    robots: 'noindex, nofollow',
    canonicalPath: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const [passwordInput, setPasswordInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('__ALL__');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [layoutOverride, setLayoutOverride] = useState<GalleryLayout | null>(null);

  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [visitorLikes, setVisitorLikes] = useState<Set<string>>(new Set());

  const [activeVideo, setActiveVideo] = useState<MediaItem | null>(null);
  const videoDialogRef = useRef<HTMLDialogElement>(null);

  const [zipProgress, setZipProgress] = useState<ZipProgress | null>(null);
  const [zipError, setZipError] = useState('');
  const zipAbortRef = useRef<AbortController | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate content');
  const [reportDetails, setReportDetails] = useState('');
  const [reportToken, setReportToken] = useState('');
  const [reportStatus, setReportStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const reportDialogRef = useRef<HTMLDialogElement>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGalleryView(slug);
      setData(res);
      setLikeCounts(res.likeCounts || {});
      setVisitorLikes(new Set(res.visitorLikes || []));
    } catch (err) {
      if (err instanceof ApiError) {
        setError({ message: err.message, code: err.code });
      } else {
        setError({ message: 'Failed to load gallery.' });
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    const dialog = videoDialogRef.current;
    if (!dialog) return;
    if (activeVideo && !dialog.open) dialog.showModal();
    else if (!activeVideo && dialog.open) dialog.close();
  }, [activeVideo]);

  useEffect(() => {
    const dialog = reportDialogRef.current;
    if (!dialog) return;
    if (reportOpen && !dialog.open) dialog.showModal();
    else if (!reportOpen && dialog.open) dialog.close();
  }, [reportOpen]);

  const filteredItems = useMemo(() => {
    if (!data || data.locked) return [];
    return data.items.filter((item) => {
      if (selectedFolderPath !== '__ALL__' && item.folderPath !== selectedFolderPath) {
        return false;
      }
      if (mediaFilter === 'image' && item.kind !== 'image') return false;
      if (mediaFilter === 'video' && item.kind !== 'video') return false;
      if (mediaFilter === 'favorites' && !visitorLikes.has(item.id)) return false;
      return true;
    });
  }, [data, selectedFolderPath, mediaFilter, visitorLikes]);

  const layout = layoutOverride || data?.gallery.layout || 'masonry';
  const fontMeta = FONT_PRESETS[data?.gallery.fontPreset || 'sans'];
  const tokens = data ? resolveGalleryThemeTokens(data.gallery) : null;
  const activeAccentStyle = tokens
    ? { backgroundColor: tokens.accent, color: tokens.accentFg, borderColor: tokens.accent }
    : undefined;

  // Initialize PhotoSwipe lightbox for photo items in the current view
  useEffect(() => {
    if (!gridRef.current || !data || data.locked) return;

    const lightbox = new PhotoSwipeLightbox({
      gallery: gridRef.current,
      children: 'button[data-pswp-photo="true"]',
      pswpModule: () => import('photoswipe')
    });

    lightbox.addFilter('domItemData', (itemData, element) => {
      const src = element.dataset.pswpSrc;
      if (src) itemData.src = src;
      const w = Number(element.dataset.pswpWidth || '0');
      const h = Number(element.dataset.pswpHeight || '0');
      if (w > 0) {
        itemData.width = w;
        itemData.w = w;
      }
      if (h > 0) {
        itemData.height = h;
        itemData.h = h;
      }
      const thumbEl = element.querySelector('img');
      if (thumbEl) {
        itemData.msrc = thumbEl.currentSrc || thumbEl.src;
        itemData.alt = thumbEl.getAttribute('alt') || '';
      }
      return itemData;
    });

    if (data.gallery.allowDownload) {
      lightbox.on('uiRegister', () => {
        lightbox.pswp?.ui?.registerElement({
          name: 'download-button',
          order: 8,
          isButton: true,
          tagName: 'a',
          html: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
          onInit: (el, pswp) => {
            el.setAttribute('download', '');
            el.setAttribute('aria-label', 'Download photo');
            pswp.on('change', () => {
              const curr = pswp.currSlide?.data;
              if (curr?.src) {
                el.setAttribute('href', `${curr.src}&download=1`);
              }
            });
          }
        });
      });
    }

    lightbox.init();
    return () => {
      lightbox.destroy();
    };
  }, [data, filteredItems, layout]);

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    setUnlocking(true);
    try {
      await unlockGallery(slug, passwordInput);
      setPasswordInput('');
      await loadGallery();
    } catch (err) {
      setUnlockError(err instanceof ApiError ? err.message : 'Incorrect password.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleToggleLike = async (fileId: string) => {
    if (!data?.gallery.allowLikes) return;
    const wasLiked = visitorLikes.has(fileId);

    setVisitorLikes((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [fileId]: Math.max(0, (prev[fileId] || 0) + (wasLiked ? -1 : 1))
    }));

    try {
      const res = await toggleLike(slug, fileId);
      setVisitorLikes((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(fileId);
        else next.delete(fileId);
        return next;
      });
      setLikeCounts((prev) => ({ ...prev, [fileId]: res.count }));
    } catch {
      // Revert optimistic update on failure
      setVisitorLikes((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(fileId);
        else next.delete(fileId);
        return next;
      });
    }
  };

  const handleBatchDownload = async () => {
    if (!data || !data.gallery.allowDownload || filteredItems.length === 0) return;
    setZipError('');
    const controller = new AbortController();
    zipAbortRef.current = controller;
    setZipProgress({ completed: 0, total: filteredItems.length, currentFile: '' });

    try {
      await downloadItemsAsZip(
        slug,
        `${data.gallery.slug}.zip`,
        filteredItems,
        (prog) => setZipProgress(prog),
        controller.signal
      );
      setZipProgress(null);
    } catch (err) {
      setZipProgress(null);
      if ((err as DOMException)?.name !== 'AbortError') {
        setZipError(err instanceof Error ? err.message : 'ZIP download failed.');
      }
    } finally {
      zipAbortRef.current = null;
    }
  };

  const handleReportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setReportStatus('sending');
    try {
      await reportGallery(slug, reportReason, reportDetails, reportToken || undefined);
      setReportStatus('sent');
    } catch {
      setReportStatus('error');
    }
  };

  if (loading) {
    const skeletonAspects = [
      'aspect-[3/4]',
      'aspect-[4/3]',
      'aspect-[4/5]',
      'aspect-square',
      'aspect-[3/4]',
      'aspect-[4/3]',
      'aspect-[3/4]',
      'aspect-[4/5]',
      'aspect-[4/3]',
      'aspect-square'
    ];

    return (
      <div className="min-h-screen w-full bg-stone-50 pb-12">
        {/* Hero Skeleton */}
        <header className="border-b border-stone-200 bg-stone-100/70">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 animate-pulse rounded-md bg-stone-200" />
                <div className="h-4 w-32 animate-pulse rounded bg-stone-200" />
              </div>
              <div className="h-9 w-24 animate-pulse rounded-full bg-stone-200" />
            </div>

            <div className="mt-5 h-10 w-3/4 max-w-md animate-pulse rounded-xl bg-stone-200 sm:h-12" />
            <div className="mt-3 h-4 w-2/3 max-w-lg animate-pulse rounded bg-stone-200/80" />
            <div className="mt-4 h-3.5 w-44 animate-pulse rounded bg-stone-200/80" />
          </div>
        </header>

        {/* Sticky Toolbar Skeleton */}
        <nav
          aria-hidden="true"
          className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:px-6 sm:py-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-20 animate-pulse rounded-full bg-stone-200" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-stone-200/80" />
              <div className="h-9 w-24 animate-pulse rounded-full bg-stone-200/80" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-stone-200/80" />
              <div className="h-9 w-36 animate-pulse rounded-xl bg-stone-200" />
            </div>
          </div>
        </nav>

        {/* Full-Width Masonry Grid Skeleton */}
        <main className="w-full px-4 py-6">
          <div className="masonry-columns">
            {skeletonAspects.map((aspect, i) => (
              <div
                key={i}
                className={`masonry-item w-full animate-pulse rounded-xl bg-stone-200/85 ${aspect}`}
              />
            ))}
          </div>
        </main>

        {/* Bottom Verse Ticker Skeleton */}
        <div
          aria-hidden="true"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-[#f3efe7]/95"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <div className="h-5 w-14 animate-pulse rounded-full bg-stone-300/70" />
            <div className="h-3.5 flex-1 animate-pulse rounded bg-stone-300/60" />
            <div className="h-7 w-7 animate-pulse rounded-full bg-stone-300/70" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {error?.code === 'EXPIRED'
            ? 'Gallery Expired'
            : error?.code === 'BLOCKED'
              ? 'Gallery Unavailable'
              : 'Gallery Not Found'}
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          {error?.message || 'This gallery could not be loaded.'}
        </p>
        <p className="mt-2 max-w-md text-xs text-slate-500">
          API exhausted or hosting issue? Contact{' '}
          <a
            href={buildSupportMailto(`Gallery /g/${slug}`)}
            className="font-semibold text-slate-800 underline underline-offset-2"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={loadGallery}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-stone-100"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Create a Gallery
          </button>
        </div>
      </main>
    );
  }

  if (data.locked && tokens) {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center px-4 transition-colors"
        style={{
          backgroundColor: tokens.bg,
          color: tokens.fg,
          fontFamily: fontMeta.bodyFamily
        }}
      >
        <div
          className="w-full max-w-md rounded-2xl border p-6 shadow-sm"
          style={{
            borderColor: tokens.border,
            backgroundColor: tokens.surface
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                backgroundColor: tokens.accentSoftBg,
                color: tokens.accent
              }}
            >
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold" style={{ fontFamily: fontMeta.headingFamily }}>
                {data.gallery.title}
              </h1>
              <p className="text-xs" style={{ color: tokens.mutedFg }}>
                {data.gallery.brandName ? `By ${data.gallery.brandName} · ` : ''}
                Password required
              </p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="mt-5 space-y-3">
            <label htmlFor="unlock-pass" className="block text-sm font-medium">
              Enter Gallery Password
            </label>
            <input
              id="unlock-pass"
              type="password"
              required
              autoFocus
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              className="min-h-[44px] w-full rounded-xl border px-3.5 text-sm focus:outline-none"
              style={{
                borderColor: tokens.border,
                backgroundColor: tokens.bg,
                color: tokens.fg
              }}
            />
            {unlockError && (
              <p role="alert" className="text-sm text-red-500">
                {unlockError}
              </p>
            )}
            <button
              type="submit"
              disabled={unlocking}
              className="min-h-[44px] w-full rounded-xl px-4 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={activeAccentStyle}
            >
              {unlocking ? 'Unlocking...' : 'Open Gallery'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <>
      <GallerySurface
        slug={slug}
        appName={config.appName}
        gallery={data.gallery}
        items={data.items}
        folders={data.folders}
        likeCounts={likeCounts}
        visitorLikes={visitorLikes}
        layout={layout}
        onLayoutChange={setLayoutOverride}
        mediaFilter={mediaFilter}
        onMediaFilterChange={setMediaFilter}
        selectedFolderPath={selectedFolderPath}
        onSelectedFolderPathChange={setSelectedFolderPath}
        filteredItems={filteredItems}
        gridRef={gridRef}
        zipProgress={zipProgress}
        zipError={zipError}
        onBatchDownload={handleBatchDownload}
        onCancelZip={() => zipAbortRef.current?.abort()}
        onToggleLike={handleToggleLike}
        onOpenVideo={setActiveVideo}
        onOpenDonate={onOpenDonate}
        onOpenReport={() => {
          setReportStatus('idle');
          setReportOpen(true);
        }}
        onNavigateHome={() => onNavigate('/')}
        feedbackFormUrl={config.feedbackFormUrl}
        reportFormUrl={config.reportFormUrl}
      />

      {/* HD Video Player Dialog */}
      <dialog
        ref={videoDialogRef}
        onClose={() => setActiveVideo(null)}
        onClick={(e) => {
          if (e.target === videoDialogRef.current) setActiveVideo(null);
        }}
        aria-label={activeVideo?.name || 'Video player'}
        className="m-auto w-[min(95vw,56rem)] rounded-2xl border border-slate-800 bg-slate-950 p-0 text-white shadow-2xl"
      >
        {activeVideo && (
          <div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-4 py-3">
              <p className="truncate text-sm font-medium">{activeVideo.name}</p>
              <div className="flex items-center gap-2">
                {data.gallery.allowDownload && (
                  <a
                    href={mediaFullUrl(slug, activeVideo.id, true)}
                    download={activeVideo.name}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-slate-800 px-3 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </a>
                )}
                <button
                  type="button"
                  aria-label="Close video player"
                  onClick={() => setActiveVideo(null)}
                  className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <video
              key={activeVideo.id}
              src={mediaFullUrl(slug, activeVideo.id, false)}
              poster={mediaThumbUrl(slug, activeVideo.id, 1200)}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] w-full bg-black"
            />
          </div>
        )}
      </dialog>

      {/* Report Abuse Dialog */}
      <dialog
        ref={reportDialogRef}
        onClose={() => setReportOpen(false)}
        onClick={(e) => {
          if (e.target === reportDialogRef.current) setReportOpen(false);
        }}
        aria-labelledby="report-modal-title"
        className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-stone-200 bg-white p-6 text-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="report-modal-title" className="text-lg font-semibold">
            Report Gallery
          </h2>
          <button
            type="button"
            aria-label="Close report dialog"
            onClick={() => setReportOpen(false)}
            className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-500 hover:bg-stone-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {reportStatus === 'sent' ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-emerald-700">
              Thank you. Your report has been recorded for review.
            </p>
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="min-h-[40px] w-full rounded-xl bg-slate-900 text-sm font-medium text-white"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleReportSubmit} className="mt-4 space-y-3">
            <CustomSelect
              id="report-reason"
              label="Reason"
              value={reportReason}
              options={REPORT_REASON_OPTIONS}
              onChange={setReportReason}
            />
            <div>
              <label htmlFor="report-details" className="block text-xs font-medium text-slate-700">
                Details (optional)
              </label>
              <textarea
                id="report-details"
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Share any context that helps us review this gallery..."
                className="uc-input mt-1 min-h-[84px] py-2.5"
              />
            </div>
            {config.turnstileSiteKey && (
              <TurnstileWidget
                siteKey={config.turnstileSiteKey}
                onToken={setReportToken}
                theme="light"
              />
            )}
            {reportStatus === 'error' && (
              <p className="text-xs text-red-600">
                Could not submit report. Please try again or email{' '}
                <a
                  href={buildSupportMailto(`Report /g/${slug}`)}
                  className="font-semibold underline underline-offset-2"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            )}
            <button
              type="submit"
              disabled={reportStatus === 'sending'}
              className="min-h-[44px] w-full rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {reportStatus === 'sending' ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}
