import type {
  GalleryCaptionMode,
  GalleryCardRadius,
  GalleryCardStyle,
  GalleryGridGap,
  GalleryHeroStyle
} from '../../shared/customization';

function MiniMountainArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 44" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="ucMiniSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6cfc2" />
          <stop offset="100%" stopColor="#ede7dc" />
        </linearGradient>
      </defs>
      <rect width="64" height="44" fill="url(#ucMiniSky)" />
      <circle cx="48" cy="13" r="4.5" fill="#fffaf0" opacity="0.9" />
      <path d="M0 32 L18 18 L34 29 L48 16 L64 28 L64 44 L0 44 Z" fill="#8b8173" />
      <path d="M0 36 L24 23 L42 35 L64 27 L64 44 L0 44 Z" fill="#5b5349" />
    </svg>
  );
}

export function HeroStyleIllustration({ mode }: { mode: GalleryHeroStyle }) {
  if (mode === 'fullscreen') {
    return (
      <div className="relative flex h-14 w-full flex-col items-center justify-center overflow-hidden rounded-md bg-slate-800">
        <MiniMountainArt className="absolute inset-0 h-full w-full opacity-55" />
        <div className="relative z-10 flex flex-col items-center gap-1">
          <span className="h-1 w-6 rounded-full bg-white/75" />
          <span className="h-1.5 w-12 rounded-full bg-white" />
          <span className="mt-1 h-2 w-7 rounded-full border border-white/60 bg-black/30" />
        </div>
      </div>
    );
  }
  if (mode === 'banner') {
    return (
      <div className="relative flex h-14 w-full flex-col justify-end overflow-hidden rounded-md border border-stone-200 bg-[#f8f6f2] p-2">
        <MiniMountainArt className="absolute inset-x-0 top-0 h-8 w-full opacity-35" />
        <div className="relative z-10 space-y-1">
          <span className="block h-1.5 w-11 rounded-full bg-slate-800" />
          <span className="block h-1 w-8 rounded-full bg-slate-400" />
        </div>
      </div>
    );
  }
  if (mode === 'split') {
    return (
      <div className="grid h-14 w-full grid-cols-12 items-center gap-1.5 rounded-md border border-stone-200 bg-[#f8f6f2] p-1.5">
        <div className="col-span-6 space-y-1 pl-0.5">
          <span className="block h-1.5 w-full rounded-full bg-slate-800" />
          <span className="block h-1 w-3/4 rounded-full bg-slate-400" />
        </div>
        <div className="col-span-6 h-full overflow-hidden rounded-sm">
          <MiniMountainArt className="h-full w-full" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-14 w-full flex-col justify-center gap-1 rounded-md border border-stone-200 bg-[#f8f6f2] p-2">
      <span className="h-1 w-5 rounded-full bg-slate-400" />
      <span className="h-2 w-12 rounded-full bg-slate-900" />
      <span className="h-1 w-9 rounded-full bg-slate-400" />
    </div>
  );
}

export function CardFrameIllustration({ mode }: { mode: GalleryCardStyle }) {
  return (
    <div className="flex h-12 w-full items-center justify-center rounded-md bg-stone-200/60 p-1.5">
      {mode === 'clean' && (
        <div className="h-full w-12 overflow-hidden rounded-[3px]">
          <MiniMountainArt className="h-full w-full" />
        </div>
      )}
      {mode === 'framed' && (
        <div className="h-full w-12 overflow-hidden rounded-[3px] border border-slate-400 bg-white">
          <MiniMountainArt className="h-full w-full" />
        </div>
      )}
      {mode === 'mat' && (
        <div className="h-full w-12 overflow-hidden rounded-[3px] border border-stone-300 bg-white p-1">
          <MiniMountainArt className="h-full w-full rounded-[2px]" />
        </div>
      )}
      {mode === 'polaroid' && (
        <div className="flex h-full w-11 flex-col overflow-hidden rounded-[3px] border border-stone-300 bg-white p-1 pb-2 shadow-xs">
          <MiniMountainArt className="h-full w-full rounded-[1px]" />
        </div>
      )}
      {mode === 'shadow' && (
        <div className="h-full w-12 overflow-hidden rounded-[3px] border border-stone-300 bg-white shadow-md">
          <MiniMountainArt className="h-full w-full" />
        </div>
      )}
    </div>
  );
}

export function CaptionModeIllustration({ mode }: { mode: GalleryCaptionMode }) {
  return (
    <div className="flex h-11 w-full items-center justify-center rounded-md bg-stone-200/60 p-1.5">
      <div className="relative flex h-full w-12 flex-col overflow-hidden rounded-[3px] border border-stone-300 bg-white">
        <MiniMountainArt className="min-h-0 w-full flex-1" />
        {mode === 'hover' && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
            <span className="block h-1 w-6 rounded-full bg-white/90" />
          </div>
        )}
        {mode === 'below' && (
          <div className="shrink-0 bg-white px-1 py-0.5">
            <span className="block h-1 w-7 rounded-full bg-slate-700" />
          </div>
        )}
      </div>
    </div>
  );
}

export function SpacingIllustration({ mode }: { mode: GalleryGridGap }) {
  const gapClass =
    mode === 'none'
      ? 'gap-0'
      : mode === 'compact'
        ? 'gap-0.5'
        : mode === 'normal'
          ? 'gap-1'
          : 'gap-2';
  return (
    <div className="flex h-9 w-full items-center justify-center">
      <div className={`grid h-7 w-9 grid-cols-2 ${gapClass}`}>
        <span className="rounded-[1px] bg-slate-500/80" />
        <span className="rounded-[1px] bg-slate-400/80" />
        <span className="rounded-[1px] bg-slate-400/80" />
        <span className="rounded-[1px] bg-slate-500/80" />
      </div>
    </div>
  );
}

export function CornerRadiusIllustration({ mode }: { mode: GalleryCardRadius }) {
  const radiusClass =
    mode === 'sharp' ? 'rounded-none' : mode === 'rounded' ? 'rounded-md' : 'rounded-xl';
  return (
    <div className="flex h-9 w-full items-center justify-center">
      <span className={`h-6 w-10 border-2 border-slate-600 bg-stone-200/70 ${radiusClass}`} />
    </div>
  );
}
