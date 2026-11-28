import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  BookmarkCheck,
  Camera,
  Cloud,
  Film,
  FolderKanban,
  Folders,
  HardDriveDownload,
  Heart,
  KeyRound,
  Link2,
  Menu,
  Moon,
  Palette,
  RefreshCw,
  Send,
  Sparkles,
  Sun,
  Trash2,
  Wand2,
  X
} from 'lucide-react';
import type {
  AppPublicConfig,
  RecentGalleryEntry
} from '../../shared/types';
import { buildSupportMailto } from '../../shared/contact';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { HeroGalleryMockup } from '../components/HeroGalleryMockup';
import {
  DriveToGalleryIllustration,
  HowItWorksIllustration
} from '../components/HomeIllustrations';
import { OpeningIntro, hasSeenIntro } from '../components/OpeningIntro';
import { StudioBuilder } from '../components/StudioBuilder';
import { VerseTickerBar } from '../components/VerseTickerBar';
import {
  getRecentGalleries,
  removeRecentGallery
} from '../lib/api';
import { usePageSeo } from '../lib/seo';

interface HomePageProps {
  config: AppPublicConfig;
  homeTheme: 'light' | 'dark';
  onToggleHomeTheme: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpenDonate: () => void;
  onNavigate: (path: string) => void;
}

const AUDIENCE_LIST = [
  {
    index: '01',
    icon: Camera,
    title: 'Wedding & Portrait Studios',
    detail:
      'Full-screen cover galleries with favorites, QR print cards, and Lightroom exports.'
  },
  {
    index: '02',
    icon: FolderKanban,
    title: 'Multi-Folder Events',
    detail:
      'Combine up to 3 public Drive folders into one clean, chaptered album.'
  },
  {
    index: '03',
    icon: Film,
    title: 'Photo & Video Creators',
    detail:
      'Dedicated photo studio and HD video views with swipe navigation and download locks.'
  },
  {
    index: '04',
    icon: Wand2,
    title: 'Free Browser Photo Tools',
    detail:
      'Watermark, strip location/camera info, make QR cards, and split carousels on your device.'
  }
];

const HOW_IT_WORKS_STEPS: Array<{
  step: '01' | '02' | '03';
  title: string;
  body: string;
}> = [
  {
    step: '01',
    title: 'Share your Drive folder',
    body: 'Set folder access to "Anyone with the link → Viewer". Subfolders load automatically.'
  },
  {
    step: '02',
    title: 'Paste 1–3 links & style',
    body: 'Drop up to 3 links above, then pick your cover hero, layout, frame, or password.'
  },
  {
    step: '03',
    title: 'Share link or 4×6 QR card',
    body: 'Send the link or print a QR card. Drive updates auto-sync in the background.'
  }
];

const SYSTEM_LIMITATIONS = [
  {
    icon: Link2,
    label: 'Public Drive Link Required',
    detail:
      'Folders must use "Anyone with the link → Viewer". Private sign-in folders cannot be loaded.'
  },
  {
    icon: Folders,
    label: 'Album & Folder Limits',
    detail:
      'Up to 3 Drive links, 3 folder levels deep, 40 subfolders, and 2,000 items per album.'
  },
  {
    icon: RefreshCw,
    label: 'Sync Timing & Busy Hours',
    detail:
      'Auto-sync checks roughly every 6 hours (or via Re-sync). Busy times may briefly pause free traffic.'
  },
  {
    icon: HardDriveDownload,
    label: 'Large ZIPs & Photo Tools',
    detail:
      'ZIP downloads and Photo Tools (40 photos/batch) run on your device—huge folders feel slower on older phones.'
  },
  {
    icon: Cloud,
    label: 'Files Stay on Google Drive',
    detail:
      'We keep zero file copies. Deleting or unsharing in Drive (or link expiry) removes access automatically.'
  },
  {
    icon: BookmarkCheck,
    label: 'No Accounts or Recovery',
    detail:
      'No logins or recovery emails. Bookmark your secret Manage link—it is the sole key to edit or delete.'
  }
];

export function HomePage({
  config,
  homeTheme,
  onToggleHomeTheme,
  onOpenDonate,
  onNavigate
}: HomePageProps) {
  usePageSeo({
    title: `${config.appName} — Free Google Drive Client Photo Galleries`,
    description:
      'Turn any public Google Drive folder into a client-ready photo and video gallery. Free hosting, no accounts, password locks, favorites & ZIPs.',
    ogDescription:
      'Turn public Google Drive folders into free client photo galleries with password locks, favorites & ZIP downloads.',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    canonicalPath: '/'
  });

  const isDark = homeTheme === 'dark';

  const [introDone, setIntroDone] = useState(() => hasSeenIntro());
  const handleIntroComplete = useCallback(() => setIntroDone(true), []);

  const driveInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recent, setRecent] = useState<RecentGalleryEntry[]>(() => getRecentGalleries());
  const [pendingDeleteGallery, setPendingDeleteGallery] = useState<RecentGalleryEntry | null>(null);

  const scrollToSection = (id: string, focusInput = false) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (focusInput) {
      window.setTimeout(() => driveInputRef.current?.focus({ preventScroll: true }), 350);
    }
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [mobileMenuOpen]);

  const borderRule = isDark ? 'border-[#f4f1ea]/12' : 'border-[#141311]/12';
  const dividerRule = isDark ? 'divide-[#f4f1ea]/12 border-[#f4f1ea]/12' : 'divide-[#141311]/12 border-[#141311]/12';
  const mutedText = isDark ? 'text-[#f4f1ea]/55' : 'text-[#141311]/55';
  const bodyText = isDark ? 'text-[#f4f1ea]/75' : 'text-[#141311]/72';
  const navLinkClass = `inline-flex min-h-[40px] items-center rounded-full px-3 text-sm font-medium transition ${
    isDark
      ? 'text-[#f4f1ea]/75 hover:bg-[#f4f1ea]/10 hover:text-[#f4f1ea]'
      : 'text-[#141311]/75 hover:bg-[#141311]/5 hover:text-[#141311]'
  }`;
  const mobileNavLinkClass = `flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition ${
    isDark
      ? 'text-[#f4f1ea]/85 hover:bg-[#f4f1ea]/10 hover:text-[#f4f1ea]'
      : 'text-[#141311]/85 hover:bg-[#141311]/5 hover:text-[#141311]'
  }`;
  const iconButtonClass = `flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border transition active:scale-95 ${
    isDark
      ? 'border-[#f4f1ea]/20 text-[#f4f1ea] hover:bg-[#f4f1ea]/10'
      : 'border-[#141311]/15 text-[#141311] hover:bg-[#141311]/5'
  }`;
  const navItems: Array<{
    label: string;
    href: string;
    icon?: typeof Heart;
    onSelect: () => void;
  }> = [
    {
      label: 'About',
      href: '#about',
      onSelect: () => scrollToSection('about')
    },
    {
      label: 'How It Works',
      href: '#how-it-works',
      onSelect: () => scrollToSection('how-it-works')
    },
    {
      label: 'Photo Tools',
      href: '/tools',
      onSelect: () => onNavigate('/tools')
    },
    {
      label: 'Donate',
      href: '#donate',
      icon: Heart,
      onSelect: () => scrollToSection('donate')
    }
  ];
  const builderDark = !isDark;
  const builderMutedText = builderDark ? 'text-[#f4f1ea]/55' : 'text-[#141311]/55';

  return (
    <>
      <OpeningIntro brandText={config.appName} dark={isDark} onComplete={handleIntroComplete} />

      <div
        className={`uc-font-sans min-h-screen pb-20 transition-colors ${
          isDark
            ? 'uc-home-dark bg-[#12110f] text-[#f4f1ea]'
            : 'bg-[#f8f6f2] text-[#141311]'
        } ${introDone ? 'uc-fade-in' : 'opacity-0'}`}
      >
        {/* Editorial Navigation */}
        <header
          ref={headerRef}
          className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
            isDark
              ? 'border-[#f4f1ea]/12 bg-[#12110f]/92'
              : 'border-[#141311]/12 bg-[#f8f6f2]/92'
          }`}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3.5 sm:gap-3 sm:px-6">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex min-w-0 items-center gap-2 sm:gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <img
                src="/logo.svg"
                alt=""
                className={`h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9 ${
                  isDark ? 'invert' : ''
                }`}
              />
              <span className="uc-font-serif truncate text-base font-semibold tracking-tight sm:text-xl">
                {config.appName}
              </span>
            </a>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        item.onSelect();
                      }}
                      className={`${navLinkClass} ${Icon ? 'gap-1.5' : ''}`}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </nav>

              <button
                type="button"
                onClick={(e) => onToggleHomeTheme(e)}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                className={iconButtonClass}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToSection('create', true);
                }}
                className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  isDark
                    ? 'bg-[#f4f1ea] text-[#141311] hover:bg-[#e5e0d5]'
                    : 'bg-[#141311] text-[#f8f6f2] hover:bg-[#2a2824]'
                }`}
              >
                <span>Try Now</span>
              </button>

              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-expanded={mobileMenuOpen}
                aria-controls="home-mobile-menu"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className={`${iconButtonClass} md:hidden`}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav
              id="home-mobile-menu"
              aria-label="Mobile navigation"
              className={`border-t px-4 py-3 md:hidden ${borderRule}`}
            >
              <div className="mx-auto flex max-w-6xl flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        setMobileMenuOpen(false);
                        item.onSelect();
                      }}
                      className={mobileNavLinkClass}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </nav>
          )}
        </header>

        <main id="top">
          {/* Editorial Hero (Title, Marketing Copy, CTA Buttons + Animated Device Mockup) */}
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <section className="py-12 sm:py-20">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-6">
                <p className={`text-sm font-medium ${mutedText}`}>
                  Free · No sign-up · Up to 3 Drive folders per album
                </p>
                <h1 className="mt-4 text-3xl leading-[1.12] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  Turn Google Drive folders into client-ready galleries.
                </h1>
                <p className={`mt-5 max-w-[50ch] text-base leading-relaxed sm:text-[1.0625rem] ${bodyText}`}>
                  Skip re-uploading or monthly fees. Combine up to 3 public Drive folders into a
                  full-screen gallery with favorites, QR print cards, and ZIP downloads.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToSection('create', true)}
                    className={`inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 text-sm font-semibold transition ${
                      isDark
                        ? 'bg-[#f4f1ea] text-[#141311] hover:bg-[#e5e0d5]'
                        : 'bg-[#141311] text-[#f8f6f2] hover:bg-[#2a2824]'
                    }`}
                  >
                    <span>Try Now</span>
                    <ArrowDownRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#how-it-works"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('how-it-works');
                    }}
                    className={`inline-flex min-h-[48px] items-center rounded-full border px-6 text-sm font-medium transition ${
                      isDark
                        ? 'border-[#f4f1ea]/25 text-[#f4f1ea] hover:border-[#f4f1ea]/50 hover:bg-[#f4f1ea]/10'
                        : 'border-[#141311]/20 text-[#141311] hover:border-[#141311]/50 hover:bg-[#141311]/5'
                    }`}
                  >
                    Read How It Works
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6">
                <HeroGalleryMockup dark={isDark} />
              </div>
            </div>

            <div className={`mt-14 grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-3 ${borderRule}`}>
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    isDark
                      ? 'border-[#f4f1ea]/15 bg-[#1b1a17] text-[#f4f1ea]'
                      : 'border-[#141311]/12 bg-white text-[#141311]'
                  }`}
                >
                  <KeyRound className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Zero sign-up</p>
                  <p className={`mt-1 text-sm leading-relaxed ${bodyText}`}>
                    Share a gallery link with clients and keep your Manage key private.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    isDark
                      ? 'border-[#f4f1ea]/15 bg-[#1b1a17] text-[#f4f1ea]'
                      : 'border-[#141311]/12 bg-white text-[#141311]'
                  }`}
                >
                  <Palette className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Studio styling</p>
                  <p className={`mt-1 text-sm leading-relaxed ${bodyText}`}>
                    Full-screen cover hero, 5 layouts, Polaroid &amp; mat frames, and live preview.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    isDark
                      ? 'border-[#f4f1ea]/15 bg-[#1b1a17] text-[#f4f1ea]'
                      : 'border-[#141311]/12 bg-white text-[#141311]'
                  }`}
                >
                  <Send className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Smart delivery</p>
                  <p className={`mt-1 text-sm leading-relaxed ${bodyText}`}>
                    Photo &amp; HD video views, QR print cards, favorites, and ZIP export.
                  </p>
                </div>
              </div>
            </div>
            </section>
          </div>

          {/* Create Gallery Workspace — Full-bleed opposite theme section */}
          <section
            id="create"
            aria-label="Create gallery"
            className={`scroll-mt-20 border-y py-14 transition-colors sm:py-16 ${
              builderDark
                ? 'uc-home-dark border-[#f4f1ea]/12 bg-[#12110f] text-[#f4f1ea]'
                : 'uc-home-light border-[#141311]/12 bg-[#f8f6f2] text-[#141311]'
            }`}
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <StudioBuilder
                config={config}
                builderDark={builderDark}
                driveInputRef={driveInputRef}
                onGalleryCreated={() => setRecent(getRecentGalleries())}
                onNavigate={onNavigate}
              />

              {recent.length > 0 && (
              <div className="mt-8">
                <h3 className={`text-sm font-medium ${builderMutedText}`}>
                  Recent galleries saved in this browser
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {recent.map((item) => (
                    <div
                      key={item.slug}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[#141311]/12 bg-white p-4 text-[#141311] shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="text-[13px] tabular-nums text-[#141311]/60">
                          /g/{item.slug} · {item.itemCount} items
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onNavigate(item.sharePath)}
                          className="min-h-[36px] rounded-lg bg-stone-100 px-3 text-xs font-medium text-slate-800 transition hover:bg-stone-200"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate(item.managePath)}
                          className="min-h-[36px] rounded-lg border border-stone-200 px-2.5 text-xs font-medium text-slate-700 transition hover:bg-stone-100"
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${item.title} from recent list`}
                          onClick={() => setPendingDeleteGallery(item)}
                          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </section>

          <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* About Section (What this is for + Who can use it) */}
          <section
            id="about"
            className={`scroll-mt-20 border-b py-14 sm:py-20 ${borderRule}`}
          >
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <p className={`inline-flex items-center gap-1.5 text-sm font-medium ${mutedText}`}>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>About</span>
                </p>
                <h2 className="mt-3 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                  Give Drive folders a finished gallery experience.
                </h2>
                <p className={`mt-4 max-w-[46ch] text-[15px] leading-relaxed sm:text-base ${bodyText}`}>
                  Raw Drive links feel unfinished to clients. {config.appName} wraps your folders in
                  a clean, custom gallery while files stay safely in Google Drive.
                </p>
                <DriveToGalleryIllustration dark={isDark} />
              </div>

              <div className="lg:col-span-7">
                <p className={`text-sm font-medium ${mutedText}`}>
                  Who uses it
                </p>
                <div className={`mt-4 divide-y border-y ${dividerRule}`}>
                  {AUDIENCE_LIST.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.index} className="flex items-start gap-3.5 py-4">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                            isDark
                              ? 'border-[#f4f1ea]/15 bg-[#1b1a17] text-[#f4f1ea]'
                              : 'border-[#141311]/12 bg-white text-[#141311]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-medium">{item.title}</h3>
                          <p className={`mt-1 text-sm leading-relaxed ${bodyText}`}>
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* How It Works & Limitations */}
          <section
            id="how-it-works"
            className={`scroll-mt-20 border-b py-14 sm:py-20 ${borderRule}`}
          >
            <div className="max-w-2xl">
              <p className={`text-sm font-medium ${mutedText}`}>
                How it works &amp; limitations
              </p>
              <h2 className="mt-3 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                Three steps to publish—and what to keep in mind.
              </h2>
            </div>

            {/* 3-Step Guide */}
            <div className={`mt-10 grid grid-cols-1 gap-6 border-t pt-8 md:grid-cols-3 ${borderRule}`}>
              {HOW_IT_WORKS_STEPS.map((item) => (
                <div key={item.step} className="space-y-3">
                  <HowItWorksIllustration step={item.step} dark={isDark} />
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-semibold tabular-nums ${
                        isDark ? 'border-[#f4f1ea]/25 text-[#f4f1ea]' : 'border-[#141311]/20 text-[#141311]'
                      }`}
                    >
                      {item.step}
                    </span>
                    <h3 className="text-base font-semibold tracking-[-0.01em]">{item.title}</h3>
                  </div>
                  <p className={`text-sm leading-relaxed ${bodyText}`}>{item.body}</p>
                </div>
              ))}
            </div>

            {/* Honest Limitations */}
            <div
              className={`mt-12 rounded-2xl border p-6 sm:p-8 ${
                isDark
                  ? 'border-[#f4f1ea]/15 bg-[#1b1a17]'
                  : 'border-[#141311]/15 bg-[#f1ede5]'
              }`}
            >
              <div className={`border-b pb-4 ${borderRule}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    Free-tool limitations
                  </h3>
                  <span className={`text-sm ${mutedText}`}>
                    Good to know
                  </span>
                </div>
                <p className={`mt-1.5 text-sm leading-relaxed ${bodyText}`}>
                  Everything here runs on free tools so it stays free for every creator—which means a few practical limits apply.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {SYSTEM_LIMITATIONS.map((lim) => {
                  const Icon = lim.icon;
                  return (
                    <div key={lim.label} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                          isDark
                            ? 'border-[#f4f1ea]/15 bg-[#252320] text-[#f4f1ea]'
                            : 'border-[#141311]/12 bg-white text-[#141311]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold">{lim.label}</h4>
                        <p className={`mt-1 text-xs leading-relaxed sm:text-sm ${bodyText}`}>
                          {lim.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Standout Disclaimer Callout */}
            <div
              role="note"
              aria-label="Free tool disclaimer"
              className={`mt-5 flex flex-col justify-between gap-4 rounded-2xl border-2 p-5 sm:flex-row sm:items-center sm:p-6 ${
                isDark
                  ? 'border-amber-400/35 bg-amber-500/10 text-[#f4f1ea]'
                  : 'border-amber-700/25 bg-amber-50/90 text-[#141311]'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    isDark
                      ? 'border-amber-400/30 bg-amber-400/15 text-amber-300'
                      : 'border-amber-700/20 bg-amber-600/12 text-amber-800'
                  }`}
                >
                  <AlertCircle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${
                        isDark
                          ? 'bg-amber-400/20 text-amber-200'
                          : 'bg-amber-700/12 text-amber-900'
                      }`}
                    >
                      Disclaimer
                    </span>
                    <h4 className="text-sm font-semibold sm:text-base">
                      100% Free — Capacity &amp; Features Are Limited
                    </h4>
                  </div>
                  <p className={`mt-1.5 max-w-[68ch] text-sm leading-relaxed ${bodyText}`}>
                    Since {config.appName} has no subscriptions or paid tiers, album size and daily
                    traffic are capped. Want higher limits and new features? Support the project
                    with a voluntary donation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenDonate}
                className={`inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-xs font-semibold shadow-2xs transition sm:text-sm ${
                  isDark
                    ? 'bg-[#f4f1ea] text-[#141311] hover:bg-[#e5e0d5]'
                    : 'bg-[#141311] text-[#f8f6f2] hover:bg-[#2a2824]'
                }`}
              >
                <Heart className="h-4 w-4" />
                <span>Donate to expand</span>
              </button>
            </div>
          </section>

          {/* Support / Donation Section */}
          <section id="donate" className="scroll-mt-20 py-14 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-xl">
                <p className={`text-sm font-medium ${mutedText}`}>
                  Support this free tool
                </p>
                <h2 className="mt-3 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                  Keep {config.appName} free for every creator.
                </h2>
                <p className={`mt-3 text-sm leading-relaxed sm:text-base ${bodyText}`}>
                  No subscriptions or paywalls. If this helped you deliver a shoot or save on
                  storage fees, tips via Maya help keep hosting free.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenDonate}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 text-sm font-semibold transition ${
                  isDark
                    ? 'border-[#f4f1ea]/20 bg-[#1b1a17] text-[#f4f1ea] hover:border-[#f4f1ea]/45'
                    : 'border-[#141311]/20 bg-white text-[#141311] hover:border-[#141311]/45'
                }`}
              >
                <Heart className="h-4 w-4" />
                <span>Donate via Maya</span>
              </button>
            </div>
          </section>
          </div>
        </main>

        <footer className={`border-t py-8 text-[13px] ${borderRule} ${bodyText}`}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
            <p className={`uc-font-serif flex items-center gap-2 text-sm font-semibold tracking-tight ${isDark ? 'text-[#f4f1ea]' : 'text-[#141311]'}`}>
              <img
                src="/logo.svg"
                alt=""
                className={`h-5 w-5 shrink-0 object-contain ${isDark ? 'invert' : ''}`}
              />
              <span>{config.appName}</span>
              <span className={`uc-font-sans text-[13px] font-normal tracking-normal ${mutedText}`}>
                — Files remain hosted on Google Drive.
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a href="#about" className="hover:opacity-100">
                About
              </a>
              <a href="#how-it-works" className="hover:opacity-100">
                How It Works
              </a>
              <a
                href="/tools"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/tools');
                }}
                className="hover:opacity-100"
              >
                Free Photo Tools
              </a>
              <a href="#donate" className="hover:opacity-100">
                Donate
              </a>
              <a
                href={config.feedbackFormUrl || buildSupportMailto('Feedback & Suggestions')}
                target={config.feedbackFormUrl ? '_blank' : undefined}
                rel={config.feedbackFormUrl ? 'noopener noreferrer' : undefined}
                className="hover:opacity-100"
              >
                Feedback &amp; Suggestions
              </a>
              <button
                type="button"
                onClick={() => scrollToSection('create', true)}
                className={`font-semibold underline underline-offset-2 ${
                  isDark ? 'text-[#f4f1ea]' : 'text-[#141311]'
                }`}
              >
                Try Now
              </button>
            </div>
          </div>
        </footer>

        <VerseTickerBar dark={isDark} />
      </div>

      <ConfirmDeleteModal
        open={Boolean(pendingDeleteGallery)}
        itemName={pendingDeleteGallery?.title || pendingDeleteGallery?.slug || 'this gallery'}
        description={
          pendingDeleteGallery
            ? `This removes /g/${pendingDeleteGallery.slug} from your recent galleries list in this browser. Make sure you have your secret Manage link bookmarked if you need to edit it later.`
            : ''
        }
        warningText="Warning: This action cannot be undone."
        confirmLabel="Delete"
        dark={isDark}
        onCancel={() => setPendingDeleteGallery(null)}
        onConfirm={() => {
          if (!pendingDeleteGallery) return;
          removeRecentGallery(pendingDeleteGallery.slug);
          setRecent(getRecentGalleries());
          setPendingDeleteGallery(null);
        }}
      />
    </>
  );
}
