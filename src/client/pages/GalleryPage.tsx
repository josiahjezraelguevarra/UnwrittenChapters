import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Flag,
  Folder,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  Rows3,
  Square,
  Video as VideoIcon,
  X
} from 'lucide-react';
import type {
  AppPublicConfig,
  GalleryLayout,
  GalleryViewResponse,
  MediaItem
} from '../../shared/types';
import { TurnstileWidget } from '../components/TurnstileWidget';
import {
  ApiError,
  fetchGalleryView,
  mediaFullUrl,
  mediaThumbUrl,
  reportGallery,
  toggleLike,
  unlockGallery
} from '../lib/api';
import { downloadItemsAsZip, type ZipProgress } from '../lib/zipDownload';

interface GalleryPageProps {
  slug: string;
  config: AppPublicConfig;
  onOpenDonate: () => void;
  onNavigate: (path: string) => void;
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return 'Video';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function GalleryPage({ slug, config, onOpenDonate, onNavigate }: GalleryPageProps) {
  const [data, setData] = useState<GalleryViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const [passwordInput, setPasswordInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('__ALL__');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video' | 'favorites'>('all');
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
  const isDark = data?.gallery.theme === 'dark';

  // Initialize PhotoSwipe lightbox for photo items in the current view
  useEffect(() => {
    if (!gridRef.current || !data || data.locked) return;

    const lightbox = new PhotoSwipeLightbox({
      gallery: gridRef.current,
      children: 'a[data-pswp-photo="true"]',
      pswpModule: () => import('photoswipe')
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
    return (
      <div className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-56 animate-pulse rounded-2xl bg-stone-200" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-stone-200" />
            ))}
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
    return (
      <main
        className={`flex min-h-screen flex-col items-center justify-center px-4 ${
          isDark ? 'bg-slate-950 text-slate-100' : 'bg-stone-50 text-slate-900'
        }`}
      >
        <div
          className={`w-full max-w-md rounded-2xl border p-6 shadow-sm ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-stone-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold">{data.gallery.title}</h1>
              <p className="text-xs opacity-70">
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
              className={`min-h-[44px] w-full rounded-xl border px-3.5 text-sm ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-white'
                  : 'border-stone-300 bg-white text-slate-900'
              }`}
            />
            {unlockError && (
              <p role="alert" className="text-sm text-red-500">
                {unlockError}
              </p>
            )}
            <button
              type="submit"
              disabled={unlocking}
              className="min-h-[44px] w-full rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {unlocking ? 'Unlocking...' : 'Open Gallery'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const coverId =
    data.gallery.coverFileId || data.items.find((i) => i.kind === 'image')?.id || null;
  const hasSubfolders = data.folders.length > 1;
  const photoCount = data.items.filter((i) => i.kind === 'image').length;
  const videoCount = data.items.filter((i) => i.kind === 'video').length;

  return (
    <div
      className={`min-h-screen transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-stone-50 text-slate-900'
      }`}
    >
      {/* Hero Cover */}
      <header className="relative overflow-hidden border-b border-black/10">
        {coverId && (
          <div className="absolute inset-0">
            <img
              src={mediaThumbUrl(slug, coverId, 1600)}
              alt=""
              className="h-full w-full object-cover opacity-35 blur-xs"
            />
            <div
              className={`absolute inset-0 ${
                isDark
                  ? 'bg-gradient-to-b from-slate-950/60 via-slate-950/80 to-slate-950'
                  : 'bg-gradient-to-b from-white/50 via-stone-50/80 to-stone-50'
              }`}
            />
          </div>
        )}

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {data.gallery.brandName ? (
              data.gallery.brandUrl ? (
                <a
                  href={data.gallery.brandUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-wide uppercase opacity-80 hover:opacity-100"
                >
                  <span>{data.gallery.brandName}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="text-sm font-semibold tracking-wide uppercase opacity-80">
                  {data.gallery.brandName}
                </span>
              )
            ) : (
              <span className="text-sm font-semibold tracking-wide uppercase opacity-75">
                {config.appName}
              </span>
            )}

            <button
              type="button"
              onClick={onOpenDonate}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition ${
                isDark
                  ? 'border-slate-700 bg-slate-900/80 text-rose-300 hover:bg-slate-800'
                  : 'border-rose-200 bg-white/90 text-rose-700 hover:bg-rose-50'
              }`}
            >
              <Heart className="h-3.5 w-3.5" />
              <span>Donate</span>
            </button>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            {data.gallery.title}
          </h1>
          {data.gallery.description && (
            <p className="mt-3 max-w-2xl text-base opacity-80">{data.gallery.description}</p>
          )}
          <p className="mt-4 text-xs font-medium opacity-70">
            {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
            {videoCount > 0 ? ` · ${videoCount} ${videoCount === 1 ? 'video' : 'videos'}` : ''}
            {hasSubfolders ? ` · ${data.folders.length} folders` : ''}
            {` · ${data.gallery.viewCount + 1} views`}
          </p>
        </div>
      </header>

      {/* Toolbar */}
      <nav
        aria-label="Gallery filters and actions"
        className={`sticky top-0 z-20 border-b backdrop-blur ${
          isDark
            ? 'border-slate-800 bg-slate-950/90'
            : 'border-stone-200 bg-white/90'
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['all', `All (${data.items.length})`],
                ['image', `Photos (${photoCount})`],
                ...(videoCount > 0 ? [['video', `Videos (${videoCount})`]] : []),
                ...(data.gallery.allowLikes
                  ? [['favorites', `Favorites (${visitorLikes.size})`]]
                  : [])
              ] as Array<['all' | 'image' | 'video' | 'favorites', string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMediaFilter(key)}
                className={`min-h-[38px] rounded-full px-3.5 text-xs font-medium transition ${
                  mediaFilter === key
                    ? isDark
                      ? 'bg-white text-slate-950'
                      : 'bg-slate-900 text-white'
                    : isDark
                      ? 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div
              role="group"
              aria-label="Layout mode"
              className={`flex items-center rounded-lg border p-0.5 ${
                isDark ? 'border-slate-800 bg-slate-900' : 'border-stone-200 bg-stone-100'
              }`}
            >
              {(
                [
                  ['masonry', LayoutGrid, 'Masonry layout'],
                  ['justified', Rows3, 'Justified rows layout'],
                  ['grid', Square, 'Square grid layout']
                ] as const
              ).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-label={label}
                  onClick={() => setLayoutOverride(mode)}
                  className={`flex min-h-[34px] min-w-[34px] items-center justify-center rounded-md transition ${
                    layout === mode
                      ? isDark
                        ? 'bg-slate-700 text-white'
                        : 'bg-white text-slate-900 shadow-2xs'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            {data.gallery.allowDownload && filteredItems.length > 0 && (
              <button
                type="button"
                disabled={Boolean(zipProgress)}
                onClick={handleBatchDownload}
                className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl px-4 text-xs font-semibold transition disabled:opacity-50 ${
                  isDark
                    ? 'bg-white text-slate-950 hover:bg-slate-200'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {zipProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      Zipping {zipProgress.completed}/{zipProgress.total}
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download ZIP ({filteredItems.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {hasSubfolders && (
          <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
            <button
              type="button"
              onClick={() => setSelectedFolderPath('__ALL__')}
              className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                selectedFolderPath === '__ALL__'
                  ? isDark
                    ? 'border-white bg-white/10 text-white'
                    : 'border-slate-900 bg-slate-900/5 text-slate-900'
                  : isDark
                    ? 'border-slate-800 text-slate-400 hover:text-white'
                    : 'border-stone-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>All Folders</span>
            </button>
            {data.folders.map((folder) => {
              const label = folder.path ? folder.path : 'Root';
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedFolderPath(folder.path)}
                  className={`inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition ${
                    selectedFolderPath === folder.path
                      ? isDark
                        ? 'border-white bg-white/10 text-white'
                        : 'border-slate-900 bg-slate-900/5 text-slate-900'
                      : isDark
                        ? 'border-slate-800 text-slate-400 hover:text-white'
                        : 'border-stone-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Folder className="h-3.5 w-3.5" />
                  <span>
                    {label} ({folder.itemCount})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Main Grid */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {zipProgress && (
          <div
            role="status"
            className={`mb-6 flex items-center justify-between gap-4 rounded-xl border p-4 ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-stone-200 bg-white'
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                Preparing ZIP ({zipProgress.completed} of {zipProgress.total}):{' '}
                <span className="opacity-75">{zipProgress.currentFile || 'Starting...'}</span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.round((zipProgress.completed / zipProgress.total) * 100)}%`
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => zipAbortRef.current?.abort()}
              className="min-h-[36px] rounded-lg border border-red-300 px-3 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
          </div>
        )}

        {zipError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {zipError}
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 py-16 text-center">
            <ImageIcon className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-3 text-base font-medium">No items match this filter</p>
            <button
              type="button"
              onClick={() => {
                setMediaFilter('all');
                setSelectedFolderPath('__ALL__');
              }}
              className="mt-4 min-h-[40px] rounded-xl bg-slate-900 px-4 text-xs font-medium text-white dark:bg-white dark:text-slate-900"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            ref={gridRef}
            className={
              layout === 'masonry'
                ? 'masonry-columns'
                : layout === 'justified'
                  ? 'justified-grid'
                  : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
            }
          >
            {filteredItems.map((item) => {
              const liked = visitorLikes.has(item.id);
              const count = likeCounts[item.id] || 0;
              const thumbSrc = mediaThumbUrl(slug, item.id, 800);
              const fullSrc = mediaFullUrl(slug, item.id, false);
              const aspectRatio =
                layout === 'grid' ? '1 / 1' : `${item.width || 4} / ${item.height || 3}`;

              const cardClass =
                layout === 'masonry'
                  ? 'masonry-item group relative overflow-hidden rounded-xl'
                  : layout === 'justified'
                    ? 'justified-item group relative overflow-hidden rounded-xl'
                    : 'group relative overflow-hidden rounded-xl';

              const justifiedFlexGrow =
                layout === 'justified'
                  ? { flexGrow: (item.width || 4) / (item.height || 3), flexBasis: '220px' }
                  : undefined;

              return (
                <article
                  key={item.id}
                  className={`${cardClass} ${isDark ? 'bg-slate-900' : 'bg-stone-200'}`}
                  style={justifiedFlexGrow}
                >
                  {item.kind === 'image' ? (
                    <a
                      href={fullSrc}
                      data-pswp-photo="true"
                      data-pswp-width={item.width || 1600}
                      data-pswp-height={item.height || 1200}
                      className="block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                    >
                      <img
                        src={thumbSrc}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        style={layout === 'justified' ? undefined : { aspectRatio }}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveVideo(item)}
                      aria-label={`Play video ${item.name}`}
                      style={layout === 'justified' ? undefined : { aspectRatio }}
                      className="relative block h-full w-full overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                    >
                      <img
                        src={thumbSrc}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/35">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-lg">
                          <Play className="ml-0.5 h-6 w-6 fill-current" />
                        </span>
                      </span>
                      <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-xs font-medium text-white">
                        <VideoIcon className="h-3 w-3" />
                        <span>{formatDuration(item.durationMs)}</span>
                      </span>
                    </button>
                  )}

                  {/* Quick Hover/Touch Controls */}
                  <div className="pointer-events-none absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    {data.gallery.allowLikes && (
                      <button
                        type="button"
                        aria-label={liked ? `Unlike ${item.name}` : `Like ${item.name}`}
                        aria-pressed={liked}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleLike(item.id);
                        }}
                        className={`pointer-events-auto inline-flex min-h-[38px] min-w-[38px] items-center justify-center gap-1 rounded-full px-2.5 text-xs font-semibold shadow-sm backdrop-blur transition ${
                          liked
                            ? 'bg-rose-600 text-white'
                            : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                        {count > 0 && <span>{count}</span>}
                      </button>
                    )}

                    {data.gallery.allowDownload && (
                      <a
                        href={mediaFullUrl(slug, item.id, true)}
                        download={item.name}
                        aria-label={`Download ${item.name}`}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto flex min-h-[38px] min-w-[38px] items-center justify-center rounded-full bg-black/60 text-white shadow-sm backdrop-blur transition hover:bg-black/80"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 py-8 text-center text-xs opacity-75">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 px-4">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="underline underline-offset-2 hover:opacity-100"
          >
            Create your own free gallery with {config.appName}
          </button>
          <button
            type="button"
            onClick={onOpenDonate}
            className="font-medium text-rose-500 underline underline-offset-2 hover:text-rose-400"
          >
            Support / Donate
          </button>
          <button
            type="button"
            onClick={() => {
              setReportStatus('idle');
              setReportOpen(true);
            }}
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-100"
          >
            <Flag className="h-3 w-3" />
            <span>Report</span>
          </button>
        </div>
      </footer>

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
            <div>
              <label htmlFor="report-reason" className="block text-xs font-medium text-slate-700">
                Reason
              </label>
              <select
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 px-3 text-sm"
              >
                <option value="Inappropriate content">Inappropriate or illegal content</option>
                <option value="Copyright / DMCA">Copyright / DMCA violation</option>
                <option value="Spam / Abuse">Spam or abusive link</option>
              </select>
            </div>
            <div>
              <label htmlFor="report-details" className="block text-xs font-medium text-slate-700">
                Details (optional)
              </label>
              <textarea
                id="report-details"
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 p-2.5 text-sm"
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
              <p className="text-xs text-red-600">Could not submit report. Please try again.</p>
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
    </div>
  );
}
