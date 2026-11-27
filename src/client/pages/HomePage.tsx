import { useCallback, useRef, useState } from 'react';
import {
  ArrowDownRight,
  Heart,
  Moon,
  Sun,
  Trash2
} from 'lucide-react';
import type {
  AppPublicConfig,
  RecentGalleryEntry
} from '../../shared/types';
import { buildSupportMailto } from '../../shared/contact';
import { HeroGalleryMockup } from '../components/HeroGalleryMockup';
import { OpeningIntro } from '../components/OpeningIntro';
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
  onToggleHomeTheme: () => void;
  onOpenDonate: () => void;
  onNavigate: (path: string) => void;
}

const AUDIENCE_LIST = [
  {
    index: '01',
    title: 'Wedding & Portrait Photographers',
    detail:
      'Deliver curated shoots with client favorite hearts and one-click Lightroom filename exports.'
  },
  {
    index: '02',
    title: 'Event & Campus Documentarians',
    detail:
      'Organize multi-day ceremonies or colloquiums by Drive subfolder without paying per-gigabyte gallery fees.'
  },
  {
    index: '03',
    title: 'Videographers & Creative Studios',
    detail:
      'Stream HD video clips directly from Drive with HTTP Range seeking alongside high-resolution stills.'
  },
  {
    index: '04',
    title: 'Families, Travelers & Archives',
    detail:
      'Turn shared trip folders into clean, password-optional albums anyone can browse and download as a ZIP.'
  }
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Set your Drive folder to public viewer',
    body: 'In Google Drive, right-click the folder you want to share → Share → set General access to "Anyone with the link" as Viewer. Subfolders up to depth 3 are indexed automatically.'
  },
  {
    step: '02',
    title: 'Paste the link & style the gallery',
    body: 'Drop the folder URL into the builder above. Optionally add your studio name, custom slug, typography preset, accent color, photo spacing, password lock, or auto-expiration.'
  },
  {
    step: '03',
    title: 'Send the Share Link & keep your Manage Link',
    body: 'Send /g/<slug> to your clients so they can browse, heart favorites, and batch-download ZIPs. Bookmark your secret Manage Link to edit styling, re-sync Drive, or export favorites.'
  }
];

const SYSTEM_LIMITATIONS = [
  {
    label: 'Public Drive Link Required',
    detail:
      'Only folders shared as "Anyone with the link → Viewer" can be scanned. Private folders requiring Google sign-in are not accessible.'
  },
  {
    label: 'Folder & Item Caps',
    detail:
      'Indexes up to 3 nested subfolder levels, 40 subfolders, and 2,000 photo/video items per gallery.'
  },
  {
    label: 'Files Stay on Google Drive',
    detail:
      'We never copy or store your media. Deleting or unsharing files in Google Drive removes access after sync/cache expiry, and media delivery shares free-tier Drive API & Cloudflare limits (20 gallery creations/hour per IP).'
  },
  {
    label: 'No Accounts = No Token Recovery',
    detail:
      'Because there are no logins, your Manage Link (#token) is the sole key to edit or delete a gallery. Bookmark it immediately.'
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

  const [introDone, setIntroDone] = useState(false);
  const handleIntroComplete = useCallback(() => setIntroDone(true), []);

  const driveInputRef = useRef<HTMLInputElement>(null);
  const [recent, setRecent] = useState<RecentGalleryEntry[]>(() => getRecentGalleries());

  const scrollToSection = (id: string, focusInput = false) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (focusInput) {
      window.setTimeout(() => driveInputRef.current?.focus({ preventScroll: true }), 350);
    }
  };

  const borderRule = isDark ? 'border-[#f4f1ea]/12' : 'border-[#141311]/12';
  const dividerRule = isDark ? 'divide-[#f4f1ea]/12 border-[#f4f1ea]/12' : 'divide-[#141311]/12 border-[#141311]/12';
  const mutedText = isDark ? 'text-[#f4f1ea]/55' : 'text-[#141311]/55';
  const bodyText = isDark ? 'text-[#f4f1ea]/75' : 'text-[#141311]/72';
  const navLinkClass = `inline-flex min-h-[40px] items-center rounded-full px-3 text-xs font-medium transition sm:text-sm ${
    isDark
      ? 'text-[#f4f1ea]/75 hover:bg-[#f4f1ea]/10 hover:text-[#f4f1ea]'
      : 'text-[#141311]/75 hover:bg-[#141311]/5 hover:text-[#141311]'
  }`;
  const builderDark = !isDark;
  const builderMutedText = builderDark ? 'text-[#f4f1ea]/55' : 'text-[#141311]/55';

  return (
    <>
      <OpeningIntro brandText={config.appName} dark={isDark} onComplete={handleIntroComplete} />

      <div
        className={`uc-font-sans min-h-screen pb-12 transition-colors ${
          isDark
            ? 'uc-home-dark bg-[#12110f] text-[#f4f1ea]'
            : 'bg-[#f8f6f2] text-[#141311]'
        } ${introDone ? 'uc-fade-in' : 'opacity-0'}`}
      >
        {/* Editorial Navigation */}
        <header
          className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
            isDark
              ? 'border-[#f4f1ea]/12 bg-[#12110f]/92'
              : 'border-[#141311]/12 bg-[#f8f6f2]/92'
          }`}
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <img
                src="/logo.svg"
                alt=""
                className={`h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9 ${
                  isDark ? 'invert' : ''
                }`}
              />
              <span className="uc-font-serif text-lg font-semibold tracking-tight sm:text-xl">
                {config.appName}
              </span>
            </a>

            <nav aria-label="Primary navigation" className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              <a
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('about');
                }}
                className={navLinkClass}
              >
                About
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('how-it-works');
                }}
                className={navLinkClass}
              >
                How It Works
              </a>
              <a
                href="#donate"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('donate');
                }}
                className={`${navLinkClass} gap-1.5`}
              >
                <Heart className="h-3.5 w-3.5" />
                <span>Donate</span>
              </a>

              <button
                type="button"
                onClick={onToggleHomeTheme}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border transition ${
                  isDark
                    ? 'border-[#f4f1ea]/20 text-[#f4f1ea] hover:bg-[#f4f1ea]/10'
                    : 'border-[#141311]/15 text-[#141311] hover:bg-[#141311]/5'
                }`}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('create', true)}
                className={`ml-0.5 inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition sm:text-sm ${
                  isDark
                    ? 'bg-[#f4f1ea] text-[#141311] hover:bg-[#e5e0d5]'
                    : 'bg-[#141311] text-[#f8f6f2] hover:bg-[#2a2824]'
                }`}
              >
                <span>Try Now</span>
              </button>
            </nav>
          </div>
        </header>

        <main id="top">
          {/* Editorial Hero (Title, Marketing Copy, CTA Buttons + Animated Device Mockup) */}
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <section className="py-12 sm:py-20">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-6">
                <p className={`text-sm font-medium ${mutedText}`}>
                  Free hosting · No accounts · Files stay on Drive
                </p>
                <h1 className="mt-4 text-3xl leading-[1.12] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                  Share Google Drive folders as client photo galleries.
                </h1>
                <p className={`mt-6 max-w-[54ch] text-base leading-relaxed sm:text-[1.0625rem] ${bodyText}`}>
                  Skip re-uploading gigabytes or paying monthly gallery subscriptions. Paste any
                  public Google Drive link to publish a branded photo and HD video gallery with
                  client favorites, password locks, and batch ZIP downloads.
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

            <div className={`mt-14 grid grid-cols-1 gap-8 border-t pt-6 sm:grid-cols-3 ${borderRule}`}>
              <div>
                <p className="text-sm font-medium">
                  <span className={`mr-2 tabular-nums ${mutedText}`}>01</span>Zero sign-up
                </p>
                <p className={`mt-1.5 text-[15px] leading-relaxed ${bodyText}`}>
                  No accounts for you or your clients—manage via a private bookmark link.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">
                  <span className={`mr-2 tabular-nums ${mutedText}`}>02</span>Custom presentation
                </p>
                <p className={`mt-1.5 text-[15px] leading-relaxed ${bodyText}`}>
                  Masonry, justified, or square grids with editorial typography &amp; live preview.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">
                  <span className={`mr-2 tabular-nums ${mutedText}`}>03</span>Client selection
                </p>
                <p className={`mt-1.5 text-[15px] leading-relaxed ${bodyText}`}>
                  Clients heart favorite photos and videos or download batch ZIPs, while you export selected filenames.
                </p>
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
                          onClick={() => {
                            removeRecentGallery(item.slug);
                            setRecent(getRecentGalleries());
                          }}
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
                <p className={`text-sm font-medium ${mutedText}`}>
                  About
                </p>
                <h2 className="mt-3 text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                  Built for sending folders without the clutter of Drive.
                </h2>
                <p className={`mt-4 max-w-[54ch] text-[15px] leading-relaxed sm:text-base ${bodyText}`}>
                  Google Drive is great for storing final exports, but sending a raw Drive folder
                  to clients feels unfinished and awkward to browse. {config.appName} turns your
                  existing Drive folder into a finished client gallery—while your files stay right
                  where they already live.
                </p>
                <p className={`mt-3 text-sm leading-relaxed sm:text-base ${bodyText}`}>
                  No sign-ups, no monthly storage subscriptions, and no duplicate uploads.
                </p>
              </div>

              <div className="lg:col-span-7">
                <p className={`text-sm font-medium ${mutedText}`}>
                  Who uses it
                </p>
                <div className={`mt-4 divide-y border-y ${dividerRule}`}>
                  {AUDIENCE_LIST.map((item) => (
                    <div key={item.index} className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-12 sm:gap-4">
                      <span className={`text-sm tabular-nums sm:col-span-2 sm:pt-0.5 ${mutedText}`}>
                        {item.index}
                      </span>
                      <div className="sm:col-span-10">
                        <h3 className="text-base font-medium">{item.title}</h3>
                        <p className={`mt-1 text-sm leading-relaxed ${bodyText}`}>
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))}
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
            <div className={`mt-10 grid grid-cols-1 gap-8 border-t pt-8 md:grid-cols-3 ${borderRule}`}>
              {HOW_IT_WORKS_STEPS.map((item) => (
                <div key={item.step} className="space-y-2.5">
                  <span
                    className={`inline-block border-b pb-1 text-sm font-medium tabular-nums ${
                      isDark ? 'border-[#f4f1ea]' : 'border-[#141311]'
                    }`}
                  >
                    {item.step}
                  </span>
                  <h3 className="text-lg font-medium tracking-[-0.01em]">{item.title}</h3>
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
              <div className={`flex flex-wrap items-baseline justify-between gap-2 border-b pb-4 ${borderRule}`}>
                <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                  Free-tool limitations
                </h3>
                <span className={`text-sm ${mutedText}`}>
                  Transparent specs
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {SYSTEM_LIMITATIONS.map((lim) => (
                  <div key={lim.label}>
                    <h4 className="text-sm font-semibold">{lim.label}</h4>
                    <p className={`mt-1 text-sm leading-relaxed ${bodyText}`}>{lim.detail}</p>
                  </div>
                ))}
              </div>
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
                  There are no subscriptions or paywalls here. If this saved you time or helped you
                  deliver a client shoot cleanly, tips via Maya help keep hosting and maintain this
                  website. Open the Maya QR modal to send a tip.
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
    </>
  );
}
