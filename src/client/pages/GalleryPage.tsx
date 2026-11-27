import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from 'react';
import {
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react';
import type {
  AppPublicConfig,
  GalleryLayout,
  GalleryViewResponse
} from '../../shared/types';
import { SUPPORT_EMAIL, buildSupportMailto } from '../../shared/contact';
import { CustomSelect } from '../components/CustomSelect';
import { GalleryLockScreen } from '../components/GalleryLockScreen';
import { GallerySurface, type MediaFilter } from '../components/GallerySurface';
import { TurnstileWidget } from '../components/TurnstileWidget';
import { REPORT_REASON_OPTIONS } from '../config/galleryOptions';
import {
  ApiError,
  fetchGalleryView,
  reportGallery,
  toggleLike
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

  const [selectedFolderPath, setSelectedFolderPath] = useState<string>(() => {
    const q = new URLSearchParams(window.location.search).get('folder');
    return q || '__ALL__';
  });
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutOverride, setLayoutOverride] = useState<GalleryLayout | null>(null);

  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [visitorLikes, setVisitorLikes] = useState<Set<string>>(new Set());

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
    const dialog = reportDialogRef.current;
    if (!dialog) return;
    if (reportOpen && !dialog.open) dialog.showModal();
    else if (!reportOpen && dialog.open) dialog.close();
  }, [reportOpen]);

  const filteredItems = useMemo(() => {
    if (!data || data.locked) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.items.filter((item) => {
      if (selectedFolderPath !== '__ALL__' && item.folderPath !== selectedFolderPath) {
        return false;
      }
      if (mediaFilter === 'image' && item.kind !== 'image') return false;
      if (mediaFilter === 'video' && item.kind !== 'video') return false;
      if (mediaFilter === 'favorites' && !visitorLikes.has(item.id)) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.folderPath.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [data, selectedFolderPath, mediaFilter, visitorLikes, searchQuery]);

  const layout = layoutOverride || data?.gallery.layout || 'masonry';

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

  if (data.locked) {
    return <GalleryLockScreen slug={slug} gallery={data.gallery} onUnlocked={loadGallery} />;
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
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filteredItems={filteredItems}
        gridRef={gridRef}
        zipProgress={zipProgress}
        zipError={zipError}
        onBatchDownload={handleBatchDownload}
        onCancelZip={() => zipAbortRef.current?.abort()}
        onToggleLike={handleToggleLike}
        onOpenItem={(item) => {
          const suffix =
            selectedFolderPath !== '__ALL__'
              ? `?folder=${encodeURIComponent(selectedFolderPath)}`
              : '';
          onNavigate(`/g/${slug}/view/${item.id}${suffix}`);
        }}
        onOpenDonate={onOpenDonate}
        onOpenReport={() => {
          setReportStatus('idle');
          setReportOpen(true);
        }}
        onNavigateHome={() => onNavigate('/')}
        feedbackFormUrl={config.feedbackFormUrl}
        reportFormUrl={config.reportFormUrl}
      />

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
