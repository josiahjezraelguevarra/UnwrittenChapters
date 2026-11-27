import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import {
  ArrowUp,
  ChevronDown,
  Columns2,
  Download,
  ExternalLink,
  Flag,
  Folder,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Maximize,
  Play,
  Rows3,
  Search,
  Square,
  Video as VideoIcon,
  X
} from 'lucide-react';
import {
  CARD_RADIUS_META,
  FONT_PRESETS,
  GRID_GAP_META,
  hexToRgba,
  resolveGalleryThemeTokens,
  validateCaptionMode,
  validateCardStyle,
  validateHeroStyle
} from '../../shared/customization';
import type {
  GalleryFolder,
  GalleryLayout,
  MediaItem,
  PublicGalleryConfig
} from '../../shared/types';
import { buildSupportMailto } from '../../shared/contact';
import { mediaFullUrl, mediaThumbUrl } from '../lib/api';
import type { ZipProgress } from '../lib/zipDownload';
import { SupportErrorAlert } from './SupportErrorAlert';
import { VerseTickerBar } from './VerseTickerBar';

export type MediaFilter = 'all' | 'image' | 'video' | 'favorites';

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

export interface GallerySurfaceProps {
  slug: string;
  appName: string;
  gallery: PublicGalleryConfig;
  items: MediaItem[];
  folders: GalleryFolder[];
  likeCounts: Record<string, number>;
  visitorLikes: Set<string>;
  layout: GalleryLayout;
  onLayoutChange: (mode: GalleryLayout) => void;
  mediaFilter: MediaFilter;
  onMediaFilterChange: (filter: MediaFilter) => void;
  selectedFolderPath: string;
  onSelectedFolderPathChange: (path: string) => void;
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  filteredItems: MediaItem[];
  gridRef?: RefObject<HTMLDivElement | null>;
  previewMode?: boolean;
  previewViewport?: 'desktop' | 'mobile';
  previewImageMap?: Record<string, string>;
  zipProgress?: ZipProgress | null;
  zipError?: string;
  onBatchDownload?: () => void;
  onCancelZip?: () => void;
  onToggleLike?: (fileId: string) => void;
  onOpenItem?: (item: MediaItem) => void;
  onOpenVideo?: (item: MediaItem) => void;
  onOpenDonate?: () => void;
  onOpenReport?: () => void;
  onNavigateHome?: () => void;
  feedbackFormUrl?: string;
  reportFormUrl?: string;
}

export function GallerySurface({
  slug,
  appName,
  gallery,
  items,
  folders,
  likeCounts,
  visitorLikes,
  layout,
  onLayoutChange,
  mediaFilter,
  onMediaFilterChange,
  selectedFolderPath,
  onSelectedFolderPathChange,
  searchQuery = '',
  onSearchQueryChange,
  filteredItems,
  gridRef,
  previewMode = false,
  previewViewport = 'desktop',
  previewImageMap,
  zipProgress = null,
  zipError = '',
  onBatchDownload,
  onCancelZip,
  onToggleLike,
  onOpenItem,
  onOpenVideo,
  onOpenDonate,
  onOpenReport,
  onNavigateHome,
  feedbackFormUrl,
  reportFormUrl
}: GallerySurfaceProps) {
  const tokens = resolveGalleryThemeTokens(gallery);
  const fontMeta = FONT_PRESETS[gallery.fontPreset || 'sans'];
  const gapCss = GRID_GAP_META[gallery.gridGap || 'normal'].cssValue;
  const radiusCss = CARD_RADIUS_META[gallery.cardRadius || 'rounded'].cssValue;
  const heroStyle = validateHeroStyle(gallery.heroStyle);
  const cardStyle = validateCardStyle(gallery.cardStyle);
  const captionMode = validateCaptionMode(gallery.captionMode);

  const activeAccentStyle: CSSProperties = {
    backgroundColor: tokens.accent,
    color: tokens.accentFg,
    borderColor: tokens.accent
  };

  const coverId = gallery.coverFileId || items.find((i) => i.kind === 'image')?.id || null;
  const resolveThumb = (fileId: string, width: number) =>
    previewImageMap?.[fileId] || mediaThumbUrl(slug, fileId, width);

  const toolbarRef = useRef<HTMLElement>(null);
  const internalGridRef = useRef<HTMLDivElement>(null);
  const activeGridRef = gridRef ?? internalGridRef;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [galleryRevealed, setGalleryRevealed] = useState(
    previewMode || heroStyle !== 'fullscreen'
  );

  useEffect(() => {
    if (previewMode) return;
    const onScroll = () => setShowScrollTop(window.scrollY > 560);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [previewMode]);

  useEffect(() => {
    if (previewMode || heroStyle !== 'fullscreen') {
      setGalleryRevealed(true);
      return;
    }
    const target = toolbarRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      setGalleryRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setGalleryRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [previewMode, heroStyle]);

  useEffect(() => {
    if (previewMode) return;
    const container = activeGridRef.current;
    if (!container) return;
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>('[data-gallery-card="true"]')
    );
    if (cards.length === 0) return;

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      cards.forEach((el) => el.classList.add('uc-card-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let batchIdx = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.style.transitionDelay = `${Math.min(batchIdx * 45, 225)}ms`;
          el.classList.add('uc-card-visible');
          observer.unobserve(el);
          batchIdx += 1;
        }
      },
      { rootMargin: '0px 0px -30px 0px', threshold: 0.04 }
    );

    cards.forEach((el) => {
      if (!el.classList.contains('uc-card-visible')) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [previewMode, activeGridRef, filteredItems, layout]);

  const scrollToGallery = () => {
    setGalleryRevealed(true);
    toolbarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hasSubfolders = folders.length > 1;
  const photoCount = items.filter((i) => i.kind === 'image').length;
  const videoCount = items.filter((i) => i.kind === 'video').length;
  const isMobilePreview = previewMode && previewViewport === 'mobile';
  const isNoGap = (gallery.gridGap || 'normal') === 'none';

  const gridContainerClass =
    layout === 'masonry'
      ? previewMode
        ? isMobilePreview
          ? 'columns-2'
          : 'columns-2 md:columns-3'
        : 'masonry-columns'
      : layout === 'justified'
        ? 'justified-grid'
        : layout === 'large'
          ? previewMode
            ? isMobilePreview
              ? 'mx-auto grid max-w-5xl grid-cols-1'
              : 'mx-auto grid max-w-5xl grid-cols-1 sm:grid-cols-2'
            : 'mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2'
          : layout === 'editorial'
            ? previewMode
              ? isMobilePreview
                ? 'grid grid-cols-2'
                : 'grid grid-cols-2 sm:grid-cols-4'
              : 'grid grid-cols-2 md:grid-cols-4'
            : previewMode
              ? isMobilePreview
                ? 'grid grid-cols-2'
                : 'grid grid-cols-2 sm:grid-cols-3'
              : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5';

  const gridContainerStyle: CSSProperties | undefined =
    layout === 'grid' || layout === 'large' || layout === 'editorial'
      ? { gap: gapCss }
      : layout === 'masonry' && previewMode
        ? { columnGap: gapCss }
        : undefined;

  const innerMediaRadius =
    cardStyle === 'mat' || cardStyle === 'polaroid'
      ? radiusCss === '0px'
        ? '0px'
        : '0.45rem'
      : captionMode === 'below'
        ? '0px'
        : radiusCss;

  const renderBrandHeader = () => (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <span className="inline-flex items-center gap-2.5">
        <img
          src="/logo.svg"
          alt=""
          className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8"
        />
        <span className="uc-font-serif text-lg font-semibold tracking-tight sm:text-xl">
          {appName}
        </span>
      </span>

      <button
        type="button"
        onClick={previewMode ? undefined : onOpenDonate}
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition hover:opacity-85"
        style={{
          borderColor: tokens.border,
          backgroundColor: hexToRgba(tokens.surface, 0.85),
          color: tokens.fg
        }}
      >
        <Heart className="h-3.5 w-3.5" />
        <span>Donate</span>
      </button>
    </div>
  );

  const renderStudioEyebrow = (centered = false) => {
    if (!gallery.brandName) return null;
    const baseClass = `inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] uppercase opacity-85 ${
      centered ? 'mb-3 justify-center' : 'mt-5 mb-2'
    }`;
    if (gallery.brandUrl) {
      return (
        <a
          href={gallery.brandUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={previewMode ? (e) => e.preventDefault() : undefined}
          className={`${baseClass} underline-offset-4 transition hover:underline hover:opacity-100`}
        >
          <span>{gallery.brandName}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      );
    }
    return <p className={baseClass}>{gallery.brandName}</p>;
  };

  return (
    <div
      className={`${previewMode ? 'min-h-full' : 'min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom))]'} transition-colors duration-200`}
      style={
        {
          backgroundColor: tokens.bg,
          color: tokens.fg,
          fontFamily: fontMeta.bodyFamily,
          '--gallery-gap': gapCss,
          '--gallery-radius': radiusCss
        } as CSSProperties
      }
    >
      {/* Hero Cover */}
      {heroStyle === 'fullscreen' ? (
        <header
          className={`relative flex flex-col justify-between overflow-hidden border-b ${
            previewMode
              ? isMobilePreview
                ? 'min-h-[380px]'
                : 'min-h-[440px]'
              : 'min-h-[100svh]'
          }`}
          style={{
            borderColor: tokens.border,
            color: coverId ? '#ffffff' : tokens.fg
          }}
        >
          {coverId && (
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={resolveThumb(coverId, previewMode ? 1200 : 1600)}
                alt=""
                className={`h-full w-full object-cover ${previewMode ? 'scale-[1.02]' : 'uc-hero-zoom'}`}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(10,10,12,0.45), rgba(10,10,12,0.52) 52%, rgba(10,10,12,0.78))'
                }}
              />
            </div>
          )}

          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
            {renderBrandHeader()}
          </div>

          <div className="relative z-10 mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-5 py-10 text-center">
            {renderStudioEyebrow(true)}
            <h1
              className={`font-bold tracking-tight ${
                isMobilePreview
                  ? 'text-3xl'
                  : previewMode
                    ? 'text-4xl'
                    : 'text-4xl sm:text-6xl'
              }`}
              style={{ fontFamily: fontMeta.headingFamily }}
            >
              {gallery.title || 'Untitled Gallery'}
            </h1>
            {gallery.description && (
              <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-90 sm:text-base">
                {gallery.description}
              </p>
            )}
            <p className="mt-4 text-xs font-medium tracking-wide opacity-80">
              {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
              {videoCount > 0 ? ` · ${videoCount} ${videoCount === 1 ? 'video' : 'videos'}` : ''}
              {hasSubfolders ? ` · ${folders.length} chapters` : ''}
              {!previewMode ? ` · ${gallery.viewCount + 1} views` : ''}
            </p>
          </div>

          <div className="relative z-10 flex justify-center pb-8 sm:pb-12">
            <button
              type="button"
              onClick={previewMode ? undefined : scrollToGallery}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/35 bg-black/35 px-5 text-xs font-semibold tracking-wide text-white backdrop-blur-md transition hover:bg-black/55"
            >
              <span>View Gallery</span>
              <ChevronDown className="uc-hero-bounce h-4 w-4" />
            </button>
          </div>
        </header>
      ) : (
        <header
          className="relative overflow-hidden border-b"
          style={{ borderColor: tokens.border }}
        >
          {heroStyle === 'banner' && coverId && (
            <div className="absolute inset-0">
              <img
                src={resolveThumb(coverId, previewMode ? 1200 : 1600)}
                alt=""
                className="h-full w-full object-cover opacity-35 blur-xs"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, ${hexToRgba(tokens.bg, 0.52)}, ${hexToRgba(
                    tokens.bg,
                    0.84
                  )} 65%, ${tokens.bg})`
                }}
              />
            </div>
          )}

          <div
            className={`relative mx-auto max-w-6xl ${
              previewMode
                ? isMobilePreview
                  ? 'px-4 py-7'
                  : 'px-5 py-9'
                : 'px-4 py-12 sm:px-6 sm:py-16'
            }`}
          >
            {renderBrandHeader()}

            {heroStyle === 'split' && coverId ? (
              <div
                className={`mt-6 grid grid-cols-1 items-center gap-6 ${
                  isMobilePreview ? '' : 'md:grid-cols-12 md:gap-8'
                }`}
              >
                <div className={isMobilePreview ? '' : 'md:col-span-7'}>
                  {renderStudioEyebrow(false)}
                  <h1
                    className={`font-bold tracking-tight ${
                      isMobilePreview
                        ? 'text-2xl'
                        : previewMode
                          ? 'text-3xl sm:text-4xl'
                          : 'text-3xl sm:text-5xl'
                    }`}
                    style={{ fontFamily: fontMeta.headingFamily }}
                  >
                    {gallery.title || 'Untitled Gallery'}
                  </h1>
                  {gallery.description && (
                    <p
                      className="mt-3 max-w-2xl text-sm sm:text-base"
                      style={{ color: tokens.mutedFg }}
                    >
                      {gallery.description}
                    </p>
                  )}
                  <p className="mt-4 text-xs font-medium" style={{ color: tokens.mutedFg }}>
                    {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                    {videoCount > 0 ? ` · ${videoCount} ${videoCount === 1 ? 'video' : 'videos'}` : ''}
                    {hasSubfolders ? ` · ${folders.length} folders` : ''}
                    {!previewMode ? ` · ${gallery.viewCount + 1} views` : ''}
                  </p>
                </div>
                <div className={isMobilePreview ? '' : 'md:col-span-5'}>
                  <div
                    className="overflow-hidden border shadow-md"
                    style={{
                      borderRadius: radiusCss,
                      borderColor: tokens.border,
                      backgroundColor: tokens.surface
                    }}
                  >
                    <img
                      src={resolveThumb(coverId, previewMode ? 800 : 1200)}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {renderStudioEyebrow(false)}
                <h1
                  className={`${gallery.brandName ? 'mt-1' : 'mt-4'} font-bold tracking-tight ${
                    isMobilePreview
                      ? 'text-2xl'
                      : previewMode
                        ? 'text-3xl sm:text-4xl'
                        : 'text-3xl sm:text-5xl'
                  }`}
                  style={{ fontFamily: fontMeta.headingFamily }}
                >
                  {gallery.title || 'Untitled Gallery'}
                </h1>
                {gallery.description && (
                  <p
                    className="mt-3 max-w-2xl text-sm sm:text-base"
                    style={{ color: tokens.mutedFg }}
                  >
                    {gallery.description}
                  </p>
                )}
                <p className="mt-4 text-xs font-medium" style={{ color: tokens.mutedFg }}>
                  {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                  {videoCount > 0 ? ` · ${videoCount} ${videoCount === 1 ? 'video' : 'videos'}` : ''}
                  {hasSubfolders ? ` · ${folders.length} folders` : ''}
                  {!previewMode ? ` · ${gallery.viewCount + 1} views` : ''}
                </p>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Toolbar */}
      <nav
        ref={toolbarRef}
        id="gallery-toolbar"
        aria-label="Gallery filters and actions"
        className="sticky top-0 z-20 border-b backdrop-blur-md transition-colors"
        style={{
          backgroundColor: hexToRgba(tokens.surface, 0.9),
          borderColor: tokens.border
        }}
      >
        <div
          className={`mx-auto flex max-w-6xl flex-col gap-2 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${
            previewMode ? '' : 'sm:px-6 sm:py-3'
          }`}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:pb-0">
            {(
              [
                ['all', `All (${items.length})`],
                ['image', `Photos (${photoCount})`],
                ...(videoCount > 0 ? [['video', `Videos (${videoCount})`]] : []),
                ...(gallery.allowLikes
                  ? [['favorites', `Favorites (${visitorLikes.size})`]]
                  : [])
              ] as Array<[MediaFilter, string]>
            ).map(([key, label]) => {
              const active = mediaFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onMediaFilterChange(key)}
                  className="min-h-[38px] shrink-0 rounded-full px-3 text-xs font-medium whitespace-nowrap transition hover:opacity-90"
                  style={
                    active
                      ? activeAccentStyle
                      : {
                          backgroundColor: tokens.surfaceMuted,
                          color: tokens.mutedFg
                        }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
            {!previewMode && onSearchQueryChange && items.length > 12 && (
              <div className="relative flex-1 sm:w-44 sm:flex-initial">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 opacity-55" />
                <input
                  type="search"
                  aria-label="Search filenames"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Search photo..."
                  className="min-h-[36px] w-full rounded-lg border pr-7 pl-8 text-xs focus:outline-none sm:min-h-[34px]"
                  style={{
                    borderColor: tokens.border,
                    backgroundColor: tokens.surfaceMuted,
                    color: tokens.fg
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => onSearchQueryChange('')}
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 opacity-60 hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            <div
              role="group"
              aria-label="Layout mode"
              className="flex items-center rounded-lg border p-0.5"
              style={{
                borderColor: tokens.border,
                backgroundColor: tokens.surfaceMuted
              }}
            >
              {(
                [
                  ['masonry', LayoutGrid, 'Masonry layout'],
                  ['justified', Rows3, 'Justified rows layout'],
                  ['grid', Square, 'Square grid layout'],
                  ['large', Maximize, 'Large showcase layout'],
                  ['editorial', Columns2, 'Editorial magazine layout']
                ] as const
              ).map(([mode, Icon, label]) => {
                const active = layout === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-label={label}
                    aria-pressed={active}
                    title={label}
                    onClick={() => onLayoutChange(mode)}
                    className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md transition sm:min-h-[32px] sm:min-w-[32px] ${
                      active ? 'shadow-2xs' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={
                      active
                        ? { backgroundColor: tokens.surface, color: tokens.fg }
                        : { color: tokens.fg }
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>

            {gallery.allowDownload && filteredItems.length > 0 && (
              <button
                type="button"
                disabled={Boolean(zipProgress)}
                onClick={previewMode ? undefined : onBatchDownload}
                className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition hover:opacity-90 disabled:opacity-75 sm:px-3.5"
                style={activeAccentStyle}
              >
                {zipProgress ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>
                      Zipping {zipProgress.completed}/{zipProgress.total}
                    </span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span className="sm:hidden">ZIP ({filteredItems.length})</span>
                    <span className="hidden sm:inline">Download ZIP ({filteredItems.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {hasSubfolders && (
          <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 pb-2.5 sm:px-6">
            <button
              type="button"
              onClick={() => onSelectedFolderPathChange('__ALL__')}
              className="inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition hover:opacity-90"
              style={
                selectedFolderPath === '__ALL__'
                  ? {
                      borderColor: tokens.accent,
                      backgroundColor: tokens.accentSoftBg,
                      color: tokens.fg
                    }
                  : {
                      borderColor: tokens.border,
                      color: tokens.mutedFg
                    }
              }
            >
              <Folder className="h-3.5 w-3.5" />
              <span>All Folders</span>
            </button>
            {folders.map((folder) => {
              const label = folder.path ? folder.path : 'Root';
              const active = selectedFolderPath === folder.path;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => onSelectedFolderPathChange(folder.path)}
                  className="inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition hover:opacity-90"
                  style={
                    active
                      ? {
                          borderColor: tokens.accent,
                          backgroundColor: tokens.accentSoftBg,
                          color: tokens.fg
                        }
                      : {
                          borderColor: tokens.border,
                          color: tokens.mutedFg
                        }
                  }
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
      <main
        className={
          previewMode
            ? isNoGap
              ? 'w-full p-0'
              : 'mx-auto max-w-6xl px-4 py-5'
            : isNoGap
              ? 'w-full p-0'
              : 'w-full py-6'
        }
        style={
          !previewMode && !isNoGap ? { paddingLeft: gapCss, paddingRight: gapCss } : undefined
        }
      >
        {(zipProgress || zipError) && (
          <div className={isNoGap ? 'mx-auto max-w-6xl px-4 pt-4' : ''}>
            {zipProgress && (
              <div
                role="status"
                className="mb-6 flex items-center justify-between gap-4 rounded-xl border p-4"
                style={{
                  borderColor: tokens.border,
                  backgroundColor: tokens.surface
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    Preparing ZIP ({zipProgress.completed} of {zipProgress.total}):{' '}
                    <span className="opacity-75">{zipProgress.currentFile || 'Starting...'}</span>
                  </p>
                  <div
                    className="mt-2 h-2 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: tokens.surfaceMuted }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        backgroundColor: tokens.accent,
                        width: `${Math.round((zipProgress.completed / zipProgress.total) * 100)}%`
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCancelZip}
                  className="min-h-[36px] rounded-lg border border-red-300 px-3 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            )}

            {zipError && (
              <SupportErrorAlert
                message={zipError}
                context={`ZIP Download /g/${slug}`}
                className="mb-6"
              />
            )}
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed py-14 text-center"
            style={{ borderColor: tokens.border }}
          >
            <ImageIcon className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-3 text-base font-medium">No items match this filter</p>
            <button
              type="button"
              onClick={() => {
                onMediaFilterChange('all');
                onSelectedFolderPathChange('__ALL__');
                onSearchQueryChange?.('');
              }}
              className="mt-4 min-h-[40px] rounded-xl px-4 text-xs font-medium"
              style={activeAccentStyle}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            ref={activeGridRef}
            className={`${gridContainerClass} ${galleryRevealed ? 'uc-slide-reveal' : 'opacity-0'}`}
            style={gridContainerStyle}
          >
            {filteredItems.map((item, idx) => {
              const liked = visitorLikes.has(item.id);
              const count = likeCounts[item.id] || 0;
              const thumbSrc = resolveThumb(
                item.id,
                previewMode ? 600 : layout === 'large' || (layout === 'editorial' && idx % 5 === 0) ? 1200 : 800
              );
              const isEditorialHero = layout === 'editorial' && idx % 5 === 0;
              const aspectRatio =
                layout === 'grid'
                  ? '1 / 1'
                  : isEditorialHero
                    ? '16 / 10'
                    : layout === 'editorial'
                      ? '4 / 5'
                      : `${item.width || 4} / ${item.height || 3}`;

              const cardMotionClass = previewMode ? '' : 'uc-gallery-card ';
              const cardClass =
                layout === 'masonry'
                  ? `${cardMotionClass}masonry-item group relative overflow-hidden`
                  : layout === 'justified'
                    ? `${cardMotionClass}justified-item group relative flex flex-col overflow-hidden`
                    : isEditorialHero
                      ? `${cardMotionClass}col-span-2 group relative overflow-hidden`
                      : `${cardMotionClass}group relative overflow-hidden`;

              const justifiedFlexGrow =
                layout === 'justified'
                  ? {
                      flexGrow: (item.width || 4) / (item.height || 3),
                      flexBasis: isMobilePreview ? '140px' : '200px',
                      ...(previewMode ? { height: isMobilePreview ? '140px' : '170px' } : {})
                    }
                  : undefined;

              const articleStyle: CSSProperties = {
                ...justifiedFlexGrow,
                borderRadius: radiusCss,
                backgroundColor:
                  cardStyle === 'clean'
                    ? tokens.cardBg
                    : cardStyle === 'polaroid'
                      ? '#ffffff'
                      : tokens.surface,
                ...(cardStyle === 'framed' || cardStyle === 'mat'
                  ? { border: `1px solid ${tokens.border}` }
                  : {}),
                ...(cardStyle === 'mat'
                  ? { padding: previewMode ? '8px' : '12px' }
                  : cardStyle === 'polaroid'
                    ? {
                        border: `1px solid ${tokens.border}`,
                        padding: previewMode ? '8px 8px 22px' : '12px 12px 32px',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                        color: '#141311'
                      }
                    : cardStyle === 'shadow'
                      ? {
                          border: `1px solid ${tokens.border}`,
                          boxShadow: '0 14px 32px rgba(15, 23, 42, 0.18)'
                        }
                      : {})
              };

              const mediaWrapperClass =
                layout === 'justified'
                  ? 'relative min-h-0 flex-1 overflow-hidden'
                  : 'relative overflow-hidden';

              return (
                <article
                  key={item.id}
                  data-gallery-card={previewMode ? undefined : 'true'}
                  className={cardClass}
                  style={articleStyle}
                >
                  <div
                    className={`${mediaWrapperClass} ${!gallery.allowDownload ? 'select-none' : ''}`}
                    style={{ borderRadius: innerMediaRadius }}
                    onContextMenu={
                      !previewMode && !gallery.allowDownload
                        ? (e) => e.preventDefault()
                        : undefined
                    }
                  >
                    {item.kind === 'image' ? (
                      <button
                        type="button"
                        onClick={previewMode ? undefined : () => onOpenItem?.(item)}
                        aria-label={`View ${item.name}`}
                        className="block h-full w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                      >
                        <img
                          src={thumbSrc}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          draggable={gallery.allowDownload}
                          style={layout === 'justified' ? undefined : { aspectRatio }}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          previewMode
                            ? undefined
                            : () => (onOpenItem ? onOpenItem(item) : onOpenVideo?.(item))
                        }
                        aria-label={`Play video ${item.name}`}
                        style={layout === 'justified' ? undefined : { aspectRatio }}
                        className="relative block h-full w-full overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                      >
                        <img
                          src={thumbSrc}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          draggable={gallery.allowDownload}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition duration-200 group-hover:bg-black/35">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-lg ring-1 ring-white/40 backdrop-blur-md transition duration-200 group-hover:scale-110">
                            <Play className="ml-0.5 h-5 w-5 fill-current" />
                          </span>
                        </span>
                        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-0.5 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-0">
                          <VideoIcon className="h-3 w-3" />
                          <span>{formatDuration(item.durationMs)}</span>
                        </span>
                      </button>
                    )}

                    {/* Bottom Hover Details Scrim */}
                    {captionMode === 'hover' && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pt-10 pb-2.5 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                        <p className="truncate text-xs font-semibold tracking-tight drop-shadow-xs">
                          {item.name}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-white/80">
                          {item.kind === 'video' && <span>{formatDuration(item.durationMs)}</span>}
                          {item.width > 0 && item.height > 0 && (
                            <span>
                              {item.kind === 'video' ? '· ' : ''}
                              {item.width}×{item.height}
                            </span>
                          )}
                          {item.sizeBytes > 0 && <span>· {formatFileSize(item.sizeBytes)}</span>}
                          {selectedFolderPath === '__ALL__' && item.folderPath && (
                            <span className="truncate opacity-90">· {item.folderPath}</span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Quick Hover/Touch Controls */}
                    {(previewMode ? gallery.allowLikes : true) && (
                      <div
                        className={`pointer-events-none absolute top-2.5 right-2.5 flex items-center gap-1.5 transition duration-200 ${
                          previewMode
                            ? 'opacity-95'
                            : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
                        }`}
                      >
                        {gallery.allowLikes && (
                          <button
                            type="button"
                            aria-label={liked ? `Unlike ${item.name}` : `Like ${item.name}`}
                            aria-pressed={liked}
                            title={liked ? 'Remove from favorites' : 'Add to favorites'}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleLike?.(item.id);
                            }}
                            className={`pointer-events-auto inline-flex min-h-[32px] min-w-[32px] items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold shadow-md ring-1 backdrop-blur-md transition sm:min-h-[36px] sm:min-w-[36px] sm:px-2.5 ${
                              liked
                                ? 'bg-rose-600 text-white ring-rose-400/40 hover:bg-rose-500'
                                : 'bg-black/55 text-white ring-white/15 hover:bg-black/75'
                            }`}
                          >
                            <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${liked ? 'fill-current' : ''}`} />
                            {count > 0 && <span>{count}</span>}
                          </button>
                        )}

                        {!previewMode && gallery.allowDownload && (
                          <a
                            href={mediaFullUrl(slug, item.id, true)}
                            download={item.name}
                            aria-label={`Download ${item.name}`}
                            title="Download original file"
                            onClick={(e) => e.stopPropagation()}
                            className="pointer-events-auto flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full bg-black/55 text-white shadow-md ring-1 ring-white/15 backdrop-blur-md transition hover:bg-black/75"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Polaroid / Always-Visible Editorial Caption Plaque */}
                  {cardStyle === 'polaroid' && captionMode !== 'hidden' ? (
                    <p className="mt-2 truncate text-center text-[11px] font-medium tracking-tight text-[#141311]/80">
                      {item.name}
                    </p>
                  ) : (
                    captionMode === 'below' && (
                    <div
                      className={`shrink-0 ${
                        cardStyle === 'mat'
                          ? 'px-0.5 pt-2 pb-0.5'
                          : 'border-t px-3 py-2'
                      }`}
                      style={
                        cardStyle === 'mat'
                          ? undefined
                          : { borderColor: tokens.border, backgroundColor: tokens.surface }
                      }
                    >
                      <p className="truncate text-xs font-semibold tracking-tight">{item.name}</p>
                      <p
                        className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px]"
                        style={{ color: tokens.mutedFg }}
                      >
                        {item.kind === 'video' && <span>{formatDuration(item.durationMs)}</span>}
                        {item.width > 0 && item.height > 0 && (
                          <span>
                            {item.kind === 'video' ? '· ' : ''}
                            {item.width}×{item.height}
                          </span>
                        )}
                        {selectedFolderPath === '__ALL__' && item.folderPath && (
                          <span className="truncate">· {item.folderPath}</span>
                        )}
                      </p>
                    </div>
                  ))}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      {!previewMode && (
        <footer
          className="border-t py-8 text-center text-xs opacity-80"
          style={{ borderColor: tokens.border }}
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 px-4">
            <button
              type="button"
              onClick={onNavigateHome}
              className="underline underline-offset-2 hover:opacity-100"
            >
              Create your own free gallery with {appName}
            </button>
            <button
              type="button"
              onClick={onOpenDonate}
              className="font-medium underline underline-offset-2 hover:opacity-100"
            >
              Support / Donate
            </button>
            <a
              href={feedbackFormUrl || buildSupportMailto('Feedback & Suggestions')}
              target={feedbackFormUrl ? '_blank' : undefined}
              rel={feedbackFormUrl ? 'noopener noreferrer' : undefined}
              className="underline underline-offset-2 hover:opacity-100"
            >
              Feedback &amp; Suggestions
            </a>
            {reportFormUrl ? (
              <a
                href={reportFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-100"
              >
                <Flag className="h-3 w-3" />
                <span>Report</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={onOpenReport}
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-100"
              >
                <Flag className="h-3 w-3" />
                <span>Report</span>
              </button>
            )}
          </div>
        </footer>
      )}

      {!previewMode && showScrollTop && (
        <button
          type="button"
          aria-label="Scroll back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed right-4 bottom-16 z-30 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition hover:scale-105"
          style={{
            backgroundColor: hexToRgba(tokens.surface, 0.92),
            borderColor: tokens.border,
            color: tokens.fg
          }}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      {!previewMode && (
        <VerseTickerBar
          dark={tokens.isDarkSurface}
          customColors={{
            bg: tokens.surface,
            fg: tokens.fg,
            border: tokens.border
          }}
        />
      )}
    </div>
  );
}
