import { Heart, Lock, Play } from 'lucide-react';

interface HeroGalleryMockupProps {
  dark?: boolean;
}

interface SampleFrame {
  id: string;
  aspect: string;
  likes?: number;
  isVideo?: boolean;
  tone: 'arch' | 'horizon' | 'window' | 'ridge' | 'floral' | 'studio';
}

const SAMPLE_FRAMES: SampleFrame[] = [
  { id: '1', aspect: 'aspect-[3/4]', likes: 14, tone: 'arch' },
  { id: '2', aspect: 'aspect-[4/3]', isVideo: true, tone: 'horizon' },
  { id: '3', aspect: 'aspect-[4/5]', likes: 9, tone: 'window' },
  { id: '4', aspect: 'aspect-[3/4]', likes: 6, tone: 'floral' },
  { id: '5', aspect: 'aspect-[4/3]', tone: 'ridge' },
  { id: '6', aspect: 'aspect-[3/4]', likes: 19, tone: 'studio' }
];

function SampleArtwork({ tone }: { tone: SampleFrame['tone'] }) {
  switch (tone) {
    case 'arch':
      return (
        <svg viewBox="0 0 120 160" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="120" height="160" fill="#e6dfd3" />
          <path d="M22 160 V70 A38 38 0 0 1 98 70 V160 Z" fill="#cfc5b4" />
          <path d="M36 160 V76 A24 24 0 0 1 84 76 V160 Z" fill="#f5f1ea" />
          <circle cx="60" cy="72" r="10" fill="#8b7d6b" opacity="0.55" />
          <path d="M0 132 L120 112 L120 160 L0 160 Z" fill="#b7aa96" opacity="0.45" />
        </svg>
      );
    case 'horizon':
      return (
        <svg viewBox="0 0 160 120" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="120" fill="#d9dfe3" />
          <circle cx="116" cy="36" r="14" fill="#f7f5f0" />
          <path d="M0 78 Q45 64 90 76 T160 72 L160 120 L0 120 Z" fill="#8b969e" />
          <path d="M0 94 Q60 86 120 94 T160 92 L160 120 L0 120 Z" fill="#5e6870" />
        </svg>
      );
    case 'window':
      return (
        <svg viewBox="0 0 120 150" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="120" height="150" fill="#dcd5c9" />
          <polygon points="0,35 120,10 120,105 0,130" fill="#f4efe6" opacity="0.85" />
          <rect x="20" y="22" width="36" height="96" fill="#2c2925" opacity="0.16" />
          <rect x="64" y="22" width="36" height="96" fill="#2c2925" opacity="0.16" />
          <circle cx="48" cy="108" r="18" fill="#5c5347" opacity="0.45" />
        </svg>
      );
    case 'ridge':
      return (
        <svg viewBox="0 0 160 120" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="160" height="120" fill="#e8e2d7" />
          <path d="M0 95 L48 48 L88 78 L128 38 L160 72 L160 120 L0 120 Z" fill="#a89f91" />
          <path d="M0 104 L62 66 L112 96 L160 76 L160 120 L0 120 Z" fill="#635c52" />
        </svg>
      );
    case 'floral':
      return (
        <svg viewBox="0 0 120 160" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="120" height="160" fill="#ece7de" />
          <path d="M58 160 Q56 105 64 46" stroke="#47423b" strokeWidth="2.5" fill="none" />
          <ellipse cx="46" cy="86" rx="16" ry="8" transform="rotate(-24 46 86)" fill="#7d7468" />
          <ellipse cx="76" cy="68" rx="15" ry="7.5" transform="rotate(22 76 68)" fill="#918779" />
          <circle cx="64" cy="40" r="14" fill="#c7b8a3" />
          <circle cx="64" cy="40" r="6" fill="#f7f4ee" />
        </svg>
      );
    case 'studio':
      return (
        <svg viewBox="0 0 120 160" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
          <rect width="120" height="160" fill="#23211e" />
          <circle cx="60" cy="64" r="24" fill="#e8e2d6" opacity="0.9" />
          <path d="M24 160 C28 116 42 98 60 98 C78 98 92 116 96 160 Z" fill="#cfc7b8" opacity="0.85" />
        </svg>
      );
  }
}

function SampleFrameTile({ frame }: { frame: SampleFrame }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-stone-200 ${frame.aspect}`}>
      <SampleArtwork tone={frame.tone} />
      {frame.likes && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur-xs">
          <Heart className="h-2.5 w-2.5 fill-current" />
          <span>{frame.likes}</span>
        </span>
      )}
      {frame.isVideo && (
        <>
          <span className="absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm">
              <Play className="ml-0.5 h-3 w-3 fill-current" />
            </span>
          </span>
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/65 px-1.5 py-0.5 font-mono text-[8px] text-white">
            0:42
          </span>
        </>
      )}
    </div>
  );
}

export function HeroGalleryMockup({ dark = false }: HeroGalleryMockupProps) {
  const frameBorder = dark ? 'border-[#f4f1ea]/18' : 'border-[#141311]/16';
  const frameSurface = dark ? 'bg-[#191815] text-[#f4f1ea]' : 'bg-white text-[#141311]';
  const chromeSurface = dark ? 'bg-[#1f1d19] border-[#f4f1ea]/12' : 'bg-[#f4f1ea] border-[#141311]/10';
  const pillMuted = dark ? 'bg-[#2a2824] text-[#f4f1ea]/75' : 'bg-stone-100 text-slate-600';
  const pillActive = dark ? 'bg-[#f4f1ea] text-[#141311]' : 'bg-[#141311] text-[#f8f6f2]';

  return (
    <div
      aria-label="Live sample client gallery mockup on laptop and phone"
      className="uc-mockup-container relative mx-auto w-full max-w-[540px] pb-6 sm:pr-6 sm:pb-8"
    >
      {/* Laptop / Desktop Window Frame */}
      <div
        className={`overflow-hidden rounded-2xl border shadow-xl ${frameBorder} ${frameSurface}`}
      >
        {/* Browser Chrome */}
        <div className={`flex items-center justify-between gap-2 border-b px-3.5 py-2.5 ${chromeSurface}`}>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-current opacity-20" />
            <span className="h-2.5 w-2.5 rounded-full bg-current opacity-20" />
            <span className="h-2.5 w-2.5 rounded-full bg-current opacity-20" />
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-[10px] ${
              dark
                ? 'border-[#f4f1ea]/15 bg-[#12110f] text-[#f4f1ea]/75'
                : 'border-[#141311]/12 bg-white text-[#141311]/70'
            }`}
          >
            <Lock className="h-2.5 w-2.5 opacity-60" />
            <span>/g/unwritten-chapters</span>
          </div>
          <span className="text-[11px] font-medium opacity-55">
            Desktop
          </span>
        </div>

        {/* Sample Gallery Header */}
        <div className={`border-b px-4 py-3.5 ${dark ? 'border-[#f4f1ea]/10' : 'border-[#141311]/10'}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] opacity-60">
                Gallery preview
              </p>
              <p className="uc-font-serif mt-0.5 text-lg font-semibold tracking-tight sm:text-xl">
                UnwrittenChapters
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${pillActive}`}>
              Download ZIP
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
            <span className={`rounded-full px-2.5 py-0.5 ${pillActive}`}>All (148)</span>
            <span className={`rounded-full px-2.5 py-0.5 ${pillMuted}`}>Highlights</span>
            <span className={`rounded-full px-2.5 py-0.5 ${pillMuted}`}>Portraits</span>
            <span className={`rounded-full px-2.5 py-0.5 ${pillMuted}`}>Favorites (12)</span>
          </div>
        </div>

        {/* Auto-scrolling Sample Gallery Grid */}
        <div className="relative h-[265px] overflow-hidden px-3 pt-3 sm:h-[300px]">
          <div className="uc-mockup-scroll grid grid-cols-3 gap-2.5">
            {[0, 1].map((loopIdx) => (
              <div key={loopIdx} className="col-span-3 grid grid-cols-3 gap-2.5">
                <div className="space-y-2.5">
                  <SampleFrameTile frame={SAMPLE_FRAMES[0]} />
                  <SampleFrameTile frame={SAMPLE_FRAMES[4]} />
                </div>
                <div className="space-y-2.5">
                  <SampleFrameTile frame={SAMPLE_FRAMES[1]} />
                  <SampleFrameTile frame={SAMPLE_FRAMES[3]} />
                </div>
                <div className="space-y-2.5">
                  <SampleFrameTile frame={SAMPLE_FRAMES[2]} />
                  <SampleFrameTile frame={SAMPLE_FRAMES[5]} />
                </div>
              </div>
            ))}
          </div>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t ${
              dark ? 'from-[#191815] to-transparent' : 'from-white to-transparent'
            }`}
          />
        </div>
      </div>

      {/* Overlapping Mobile Phone Frame */}
      <div
        className={`hidden w-[144px] overflow-hidden rounded-[1.5rem] border-[3px] shadow-2xl sm:absolute sm:right-0 sm:bottom-0 sm:block ${
          dark
            ? 'border-[#3a3731] bg-[#141311] text-[#f4f1ea]'
            : 'border-[#141311] bg-white text-[#141311]'
        }`}
      >
        <div className="flex justify-center py-1.5">
          <span
            className={`h-1 w-8 rounded-full ${
              dark ? 'bg-[#f4f1ea]/25' : 'bg-[#141311]/20'
            }`}
          />
        </div>
        <div className={`border-b px-2.5 pb-2 ${dark ? 'border-[#f4f1ea]/10' : 'border-[#141311]/10'}`}>
          <p className="text-[10px] opacity-55">Mobile</p>
          <p className="uc-font-serif truncate text-xs font-semibold tracking-tight">UnwrittenChapters</p>
        </div>
        <div className="relative h-[165px] overflow-hidden px-2 pt-2">
          <div className="uc-mockup-scroll-slow grid grid-cols-2 gap-1.5">
            {[0, 1].map((loopIdx) => (
              <div key={loopIdx} className="col-span-2 grid grid-cols-2 gap-1.5">
                <SampleFrameTile frame={SAMPLE_FRAMES[0]} />
                <SampleFrameTile frame={SAMPLE_FRAMES[5]} />
                <SampleFrameTile frame={SAMPLE_FRAMES[2]} />
                <SampleFrameTile frame={SAMPLE_FRAMES[3]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
