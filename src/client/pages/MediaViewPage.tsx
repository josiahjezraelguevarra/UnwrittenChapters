import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Folder,
  Heart,
  Image as ImageIcon,
  Link2,
  Play,
  RefreshCw,
  Video as VideoIcon,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  FONT_PRESETS,
  hexToRgba,
  resolveGalleryThemeTokens
} from '../../shared/customization';
import type { AppPublicConfig, GalleryViewResponse } from '../../shared/types';
import { GalleryLockScreen } from '../components/GalleryLockScreen';
import {
  ApiError,
  fetchGalleryView,
  mediaFullUrl,
  mediaThumbUrl,
  toggleLike
} from '../lib/api';
import { usePageSeo } from '../lib/seo';

interface MediaViewPageProps {
  slug: string;
  fileId: string;
  config: AppPublicConfig;
  onNavigate: (path: string) => void;
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return 'Video';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function MediaViewPage({ slug, fileId, config, onNavigate }: MediaViewPageProps) {
  const [data, setData] = useState<GalleryViewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [visitorLikes, setVisitorLikes] = useState<Set<string>>(new Set());
  const [zoomed, setZoomed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const folderParam = useMemo(() => {
    const q = new URLSearchParams(window.location.search).get('folder');
    return q || '';
  }, []);

  const backGalleryPath = useMemo(() => {
    const base = `/g/${slug}`;
    return folderParam ? `${base}?folder=${encodeURIComponent(folderParam)}` : base;
  }, [slug, folderParam]);

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
        setError({ message: 'Failed to load media item.' });
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    setZoomed(false);
  }, [fileId]);

  const currentItem = useMemo(() => {
    if (!data || data.locked) return null;
    return data.items.find((item) => item.id === fileId) || null;
  }, [data, fileId]);

  // Separate Photo vs. Video sequence so pictures cycle only through pictures and videos only through videos
  const siblingItems = useMemo(() => {
    if (!data || !currentItem) return [];
    const byKind = data.items.filter((item) => item.kind === currentItem.kind);
    if (folderParam && folderParam !== '__ALL__') {
      const inFolder = byKind.filter((item) => item.folderPath === folderParam);
      if (inFolder.some((i) => i.id === currentItem.id)) return inFolder;
    }
    return byKind;
  }, [data, currentItem, folderParam]);

  const currentIndex = useMemo(
    () => siblingItems.findIndex((item) => item.id === fileId),
    [siblingItems, fileId]
  );

  const prevItem = currentIndex > 0 ? siblingItems[currentIndex - 1] : null;
  const nextItem =
    currentIndex >= 0 && currentIndex < siblingItems.length - 1
      ? siblingItems[currentIndex + 1]
      : null;

  const navigateToSibling = useCallback(
    (targetId: string) => {
      const suffix = folderParam ? `?folder=${encodeURIComponent(folderParam)}` : '';
      onNavigate(`/g/${slug}/view/${targetId}${suffix}`);
    },
    [slug, folderParam, onNavigate]
  );

  const handleToggleLike = useCallback(
    async (targetId: string) => {
      if (!data?.gallery.allowLikes) return;
      const wasLiked = visitorLikes.has(targetId);

      setVisitorLikes((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(targetId);
        else next.add(targetId);
        return next;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [targetId]: Math.max(0, (prev[targetId] || 0) + (wasLiked ? -1 : 1))
      }));

      try {
        const res = await toggleLike(slug, targetId);
        setVisitorLikes((prev) => {
          const next = new Set(prev);
          if (res.liked) next.add(targetId);
          else next.delete(targetId);
          return next;
        });
        setLikeCounts((prev) => ({ ...prev, [targetId]: res.count }));
      } catch {
        setVisitorLikes((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(targetId);
          else next.delete(targetId);
          return next;
        });
      }
    },
    [data?.gallery.allowLikes, slug, visitorLikes]
  );

  useEffect(() => {
    if (!currentItem) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && prevItem) {
        e.preventDefault();
        navigateToSibling(prevItem.id);
      } else if (e.key === 'ArrowRight' && nextItem) {
        e.preventDefault();
        navigateToSibling(nextItem.id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onNavigate(backGalleryPath);
      } else if ((e.key === 'f' || e.key === 'F') && data?.gallery.allowLikes) {
        e.preventDefault();
        void handleToggleLike(currentItem.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentItem,
    prevItem,
    nextItem,
    navigateToSibling,
    onNavigate,
    backGalleryPath,
    data?.gallery.allowLikes,
    handleToggleLike
  ]);

  usePageSeo({
    title: currentItem
      ? `${currentItem.name} — ${data?.gallery.title || config.appName}`
      : `${data?.gallery.title || 'Media Viewer'} — ${config.appName}`,
    description: `Dedicated ${currentItem?.kind === 'video' ? 'video' : 'photo'} view in ${data?.gallery.title || config.appName}.`,
    robots: 'noindex, nofollow',
    canonicalPath: null
  });

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-950 text-white">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 sm:px-6">
          <div className="h-8 w-36 animate-pulse rounded-lg bg-white/10" />
          <div className="h-8 w-28 animate-pulse rounded-lg bg-white/10" />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="aspect-[4/3] w-full max-w-4xl animate-pulse rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          {error?.code === 'EXPIRED' ? 'Gallery Expired' : 'Unable to Load Media'}
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          {error?.message || 'This media item could not be loaded.'}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => void loadGallery()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-stone-100"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(backGalleryPath)}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to Gallery
          </button>
        </div>
      </main>
    );
  }

  if (data.locked) {
    return <GalleryLockScreen slug={slug} gallery={data.gallery} onUnlocked={loadGallery} />;
  }

  const tokens = resolveGalleryThemeTokens(data.gallery);
  const fontMeta = FONT_PRESETS[data.gallery.fontPreset || 'sans'];

  if (!currentItem) {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
        style={{ backgroundColor: tokens.bg, color: tokens.fg, fontFamily: fontMeta.bodyFamily }}
      >
        <ImageIcon className="h-10 w-10 opacity-40" />
        <h1 className="mt-4 text-xl font-bold" style={{ fontFamily: fontMeta.headingFamily }}>
          Item not found in this gallery
        </h1>
        <p className="mt-2 text-sm" style={{ color: tokens.mutedFg }}>
          This photo or video may have been removed or moved during a Drive sync.
        </p>
        <button
          type="button"
          onClick={() => onNavigate(backGalleryPath)}
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          style={{ backgroundColor: tokens.accent, color: tokens.accentFg }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Gallery</span>
        </button>
      </main>
    );
  }

  const isVideo = currentItem.kind === 'video';
  const liked = visitorLikes.has(currentItem.id);
  const likeCount = likeCounts[currentItem.id] || 0;

  return (
    <div
      className="flex min-h-screen flex-col transition-colors"
      style={{
        backgroundColor: tokens.bg,
        color: tokens.fg,
        fontFamily: fontMeta.bodyFamily
      }}
    >
      {/* Top Bar */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{
          backgroundColor: hexToRgba(tokens.surface, 0.92),
          borderColor: tokens.border
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2.5 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate(backGalleryPath)}
              className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition hover:opacity-85"
              style={{ borderColor: tokens.border, backgroundColor: tokens.bg, color: tokens.fg }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Gallery</span>
            </button>

            <span
              className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex"
              style={{ backgroundColor: tokens.surfaceMuted, color: tokens.mutedFg }}
            >
              {isVideo ? <VideoIcon className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
              <span>
                {isVideo ? 'Video' : 'Photo'} {currentIndex + 1} of {siblingItems.length}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isVideo && (
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                aria-pressed={zoomed}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition hover:opacity-85"
                style={{ borderColor: tokens.border, backgroundColor: tokens.bg, color: tokens.fg }}
              >
                {zoomed ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{zoomed ? 'Fit Screen' : 'Zoom Full'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition hover:opacity-85"
              style={{ borderColor: tokens.border, backgroundColor: tokens.bg, color: tokens.fg }}
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Link Copied' : 'Share Item'}</span>
            </button>

            {data.gallery.allowLikes && (
              <button
                type="button"
                aria-pressed={liked}
                onClick={() => void handleToggleLike(currentItem.id)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition"
                style={
                  liked
                    ? { backgroundColor: '#e11d48', borderColor: '#e11d48', color: '#ffffff' }
                    : { borderColor: tokens.border, backgroundColor: tokens.bg, color: tokens.fg }
                }
              >
                <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
                <span>{liked ? 'Favorited' : 'Favorite'}</span>
                {likeCount > 0 && <span className="opacity-85">({likeCount})</span>}
              </button>
            )}

            {data.gallery.allowDownload && (
              <a
                href={mediaFullUrl(slug, currentItem.id, true)}
                download={currentItem.name}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold transition hover:opacity-90"
                style={{ backgroundColor: tokens.accent, color: tokens.accentFg }}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Dedicated Picture or Video Stage */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
        <div
          className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border p-2 sm:p-4"
          style={{
            borderColor: tokens.border,
            backgroundColor: isVideo ? '#09090b' : tokens.surface
          }}
        >
          {prevItem && (
            <button
              type="button"
              aria-label={`Previous ${isVideo ? 'video' : 'photo'}`}
              onClick={() => navigateToSibling(prevItem.id)}
              className="absolute top-1/2 left-3 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-black/80"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {isVideo ? (
            <video
              key={currentItem.id}
              src={mediaFullUrl(slug, currentItem.id, false)}
              poster={mediaThumbUrl(slug, currentItem.id, 1200)}
              controls
              controlsList={data.gallery.allowDownload ? undefined : 'nodownload'}
              disablePictureInPicture={!data.gallery.allowDownload}
              onContextMenu={
                data.gallery.allowDownload ? undefined : (e) => e.preventDefault()
              }
              autoPlay
              playsInline
              className="max-h-[74vh] w-full max-w-5xl rounded-xl bg-black"
            />
          ) : (
            <div className={zoomed ? 'max-h-[78vh] w-full overflow-auto text-center' : 'flex items-center justify-center'}>
              <img
                key={currentItem.id}
                src={mediaFullUrl(slug, currentItem.id, false)}
                alt={currentItem.name}
                draggable={data.gallery.allowDownload}
                onContextMenu={
                  data.gallery.allowDownload ? undefined : (e) => e.preventDefault()
                }
                onClick={() => setZoomed((z) => !z)}
                className={`${!data.gallery.allowDownload ? 'select-none ' : ''}${
                  zoomed
                    ? 'mx-auto h-auto max-w-none cursor-zoom-out rounded-lg'
                    : 'max-h-[74vh] w-auto max-w-full cursor-zoom-in rounded-lg object-contain'
                }`}
              />
            </div>
          )}

          {nextItem && (
            <button
              type="button"
              aria-label={`Next ${isVideo ? 'video' : 'photo'}`}
              onClick={() => navigateToSibling(nextItem.id)}
              className="absolute top-1/2 right-3 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition hover:bg-black/80"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Item Metadata Strip */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
          style={{ borderColor: tokens.border, backgroundColor: tokens.surface }}
        >
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold sm:text-base" style={{ fontFamily: fontMeta.headingFamily }}>
              {currentItem.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs" style={{ color: tokens.mutedFg }}>
              {isVideo && <span>{formatDuration(currentItem.durationMs)}</span>}
              {currentItem.width > 0 && currentItem.height > 0 && (
                <span>
                  {currentItem.width} × {currentItem.height}
                </span>
              )}
              {currentItem.sizeBytes > 0 && <span>· {formatFileSize(currentItem.sizeBytes)}</span>}
              {currentItem.folderPath && (
                <span className="inline-flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  <span>{currentItem.folderPath}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs" style={{ color: tokens.mutedFg }}>
            <span className="hidden sm:inline">Use ← / → keys to switch {isVideo ? 'videos' : 'photos'}</span>
          </div>
        </div>

        {/* Separated Strip: Other Photos OR Other Videos */}
        {siblingItems.length > 1 && (
          <section aria-label={isVideo ? 'More videos' : 'More photos'}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-wider uppercase" style={{ color: tokens.mutedFg }}>
                {isVideo ? `Videos in gallery (${siblingItems.length})` : `Photos in gallery (${siblingItems.length})`}
              </h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {siblingItems.map((sibling) => {
                const active = sibling.id === currentItem.id;
                return (
                  <button
                    key={sibling.id}
                    type="button"
                    onClick={() => navigateToSibling(sibling.id)}
                    aria-label={sibling.name}
                    aria-current={active ? 'true' : undefined}
                    className={`relative shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      active ? 'opacity-100 shadow-md' : 'opacity-65 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: active ? tokens.accent : 'transparent',
                      width: isVideo ? '120px' : '76px',
                      height: '76px'
                    }}
                  >
                    <img
                      src={mediaThumbUrl(slug, sibling.id, 240)}
                      alt={sibling.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {isVideo && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                        <Play className="h-4 w-4 fill-current" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
