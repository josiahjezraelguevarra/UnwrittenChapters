import { useCallback, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Heart,
  KeyRound,
  Link2,
  Loader2,
  Moon,
  ShieldCheck,
  Sun,
  Trash2
} from 'lucide-react';
import type {
  AppPublicConfig,
  GalleryCardRadius,
  GalleryFontPreset,
  GalleryGridGap,
  GalleryLayout,
  GalleryTheme,
  RecentGalleryEntry
} from '../../shared/types';
import { sanitizeHexColor } from '../../shared/customization';
import { CustomSelect } from '../components/CustomSelect';
import { DonateQrGrid } from '../components/DonateQrGrid';
import {
  GalleryStyleControls,
  type GalleryStyleValues
} from '../components/GalleryStyleControls';
import { HeroGalleryMockup } from '../components/HeroGalleryMockup';
import { OpeningIntro } from '../components/OpeningIntro';
import { VerseTickerBar } from '../components/VerseTickerBar';
import { SupportErrorAlert } from '../components/SupportErrorAlert';
import { ToggleField } from '../components/ToggleField';
import { TurnstileWidget } from '../components/TurnstileWidget';
import {
  EXPIRY_SELECT_OPTIONS,
  LAYOUT_SELECT_OPTIONS,
  THEME_SELECT_OPTIONS
} from '../config/galleryOptions';
import {
  ApiError,
  createGallery,
  getRecentGalleries,
  removeRecentGallery,
  saveAdminToken,
  saveRecentGallery,
  type CreateGalleryResponse
} from '../lib/api';

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
  const isDark = homeTheme === 'dark';

  const [introDone, setIntroDone] = useState(false);
  const handleIntroComplete = useCallback(() => setIntroDone(true), []);

  const driveInputRef = useRef<HTMLInputElement>(null);

  const [driveUrl, setDriveUrl] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [layout, setLayout] = useState<GalleryLayout>('masonry');
  const [theme, setTheme] = useState<GalleryTheme>('light');
  const [fontPreset, setFontPreset] = useState<GalleryFontPreset>('sans');
  const [accentColor, setAccentColor] = useState('');
  const [gridGap, setGridGap] = useState<GalleryGridGap>('normal');
  const [cardRadius, setCardRadius] = useState<GalleryCardRadius>('rounded');
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowLikes, setAllowLikes] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreateGalleryResponse | null>(null);
  const [copiedField, setCopiedField] = useState<'share' | 'manage' | null>(null);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCreated(null);

    if (!driveUrl.trim()) {
      setError('Please paste a Google Drive folder link.');
      return;
    }

    if (config.turnstileSiteKey && !turnstileToken) {
      setError('Please complete the human verification check below.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createGallery({
        driveUrl: driveUrl.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        brandName: brandName.trim() || undefined,
        brandUrl: brandUrl.trim() || undefined,
        customSlug: customSlug.trim() || undefined,
        layout,
        theme,
        fontPreset,
        accentColor: sanitizeHexColor(accentColor),
        gridGap,
        cardRadius,
        password: password.trim() || undefined,
        expiresInDays: expiresInDays ? Number(expiresInDays) : null,
        allowDownload,
        allowLikes,
        turnstileToken: turnstileToken || undefined
      });

      const hashToken = res.managePath.split('#')[1] || '';
      if (hashToken) {
        saveAdminToken(res.slug, hashToken);
      }

      saveRecentGallery({
        slug: res.slug,
        title: res.gallery.title,
        sharePath: res.sharePath,
        managePath: res.managePath,
        itemCount: res.gallery.itemCount,
        createdAt: res.gallery.createdAt
      });
      setRecent(getRecentGalleries());
      setCreated(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not create gallery. Please verify the link and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyFullUrl = async (path: string, field: 'share' | 'manage') => {
    const full = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(full);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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
  const labelClass = `block text-xs font-medium ${builderDark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`;

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
                src="/logo.png"
                alt=""
                className={`h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9 ${
                  isDark ? 'invert' : ''
                }`}
              />
              <span className="flex items-baseline gap-2.5">
                <span className="uc-font-serif text-lg font-semibold tracking-tight sm:text-xl">
                  {config.appName}
                </span>
                <span className={`uc-font-mono hidden text-[10px] tracking-widest uppercase sm:inline ${mutedText}`}>
                  Drive → Gallery
                </span>
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
                <p className={`uc-font-mono text-xs tracking-[0.18em] uppercase ${mutedText}`}>
                  No Accounts · Free Hosting · Files Stay on Drive
                </p>
                <h1 className="uc-font-serif mt-5 text-4xl leading-[1.06] font-semibold tracking-tight sm:text-5xl lg:text-[3.75rem]">
                  Turn Google Drive folders into calm, client-ready galleries.
                </h1>
                <p className={`mt-6 max-w-xl text-base leading-relaxed sm:text-lg ${bodyText}`}>
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

            <div className={`mt-14 grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-3 ${borderRule}`}>
              <div>
                <p className={`uc-font-mono text-[11px] tracking-widest uppercase ${mutedText}`}>
                  01 / Zero Sign-Up
                </p>
                <p className={`mt-1.5 text-sm ${bodyText}`}>
                  No accounts for you or your clients—manage via a private bookmark link.
                </p>
              </div>
              <div>
                <p className={`uc-font-mono text-[11px] tracking-widest uppercase ${mutedText}`}>
                  02 / Custom Presentation
                </p>
                <p className={`mt-1.5 text-sm ${bodyText}`}>
                  Masonry, justified, or square grids with editorial typography & live preview.
                </p>
              </div>
              <div>
                <p className={`uc-font-mono text-[11px] tracking-widest uppercase ${mutedText}`}>
                  03 / Client Selection
                </p>
                <p className={`mt-1.5 text-sm ${bodyText}`}>
                  Hearted favorites export directly as .txt or .csv for Lightroom filtering.
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
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={`uc-font-mono text-xs tracking-[0.18em] uppercase ${builderMutedText}`}>
                    Studio Builder
                  </p>
                  <h2 className="uc-font-serif mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Create a gallery from your Drive link
                  </h2>
                </div>
                <p className={`text-xs ${builderMutedText}`}>
                  Requires folder sharing: <strong>Anyone with the link → Viewer</strong>
                </p>
              </div>

              <div
                className={`rounded-2xl border p-5 shadow-2xs transition-colors sm:p-7 ${
                  builderDark
                    ? 'border-[#f4f1ea]/15 bg-[#1b1a17] text-[#f4f1ea]'
                    : 'border-[#141311]/15 bg-white text-[#141311]'
                }`}
              >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="drive-url"
                    className={`block text-sm font-semibold ${
                      builderDark ? 'text-[#f4f1ea]' : 'text-slate-800'
                    }`}
                  >
                    Public Google Drive Folder Link
                  </label>
                  <div className="mt-1.5 flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Link2
                        className={`pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 ${
                          builderDark ? 'text-[#f4f1ea]/45' : 'text-slate-400'
                        }`}
                      />
                      <input
                        ref={driveInputRef}
                        id="drive-url"
                        type="text"
                        required
                        value={driveUrl}
                        onChange={(e) => setDriveUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="uc-input min-h-[44px] py-2.5 pr-3.5 pl-10"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        builderDark
                          ? 'bg-[#f4f1ea] text-[#141311] hover:bg-[#e5e0d5]'
                          : 'bg-[#141311] text-[#f8f6f2] hover:bg-[#2a2824]'
                      }`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Scanning Drive...</span>
                        </>
                      ) : (
                        <span>Create Gallery</span>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    aria-expanded={showOptions}
                    onClick={() => setShowOptions((v) => !v)}
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition ${
                      builderDark
                        ? 'text-[#f4f1ea]/85 hover:bg-[#f4f1ea]/10'
                        : 'text-slate-700 hover:bg-stone-100'
                    }`}
                  >
                    {showOptions ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span>Customize branding, layout, password & expiration</span>
                  </button>

                  {showOptions && (
                    <div
                      className={`mt-3 grid grid-cols-1 gap-4 rounded-xl border p-4 sm:grid-cols-2 ${
                        builderDark
                          ? 'border-[#f4f1ea]/12 bg-[#161513]'
                          : 'border-stone-200 bg-stone-50/70'
                      }`}
                    >
                      <div>
                        <label htmlFor="gal-title" className={labelClass}>
                          Gallery Title (optional)
                        </label>
                        <input
                          id="gal-title"
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Defaults to Drive folder name"
                          className="uc-input mt-1"
                        />
                      </div>

                      <div>
                        <label htmlFor="gal-slug" className={labelClass}>
                          Custom URL Slug (optional)
                        </label>
                        <input
                          id="gal-slug"
                          type="text"
                          value={customSlug}
                          onChange={(e) => setCustomSlug(e.target.value)}
                          placeholder="e.g. clara-wedding-2026"
                          className="uc-input mt-1"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="gal-desc" className={labelClass}>
                          Welcome Note / Description
                        </label>
                        <input
                          id="gal-desc"
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Thank you for letting me capture your story!"
                          className="uc-input mt-1"
                        />
                      </div>

                      <div>
                        <label htmlFor="brand-name" className={labelClass}>
                          Your Name / Studio
                        </label>
                        <input
                          id="brand-name"
                          type="text"
                          value={brandName}
                          onChange={(e) => setBrandName(e.target.value)}
                          placeholder="Studio Lumiere"
                          className="uc-input mt-1"
                        />
                      </div>

                      <div>
                        <label htmlFor="brand-url" className={labelClass}>
                          Studio Website (https://...)
                        </label>
                        <input
                          id="brand-url"
                          type="url"
                          value={brandUrl}
                          onChange={(e) => setBrandUrl(e.target.value)}
                          placeholder="https://yourportfolio.com"
                          className="uc-input mt-1"
                        />
                      </div>

                      <CustomSelect
                        id="gal-layout"
                        label="Layout"
                        value={layout}
                        options={LAYOUT_SELECT_OPTIONS}
                        onChange={setLayout}
                        dark={builderDark}
                      />

                      <CustomSelect
                        id="gal-theme"
                        label="Color Theme"
                        value={theme}
                        options={THEME_SELECT_OPTIONS}
                        onChange={setTheme}
                        dark={builderDark}
                      />

                      <div>
                        <label htmlFor="gal-pass" className={labelClass}>
                          Password Protection (optional)
                        </label>
                        <input
                          id="gal-pass"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Leave blank for open link"
                          className="uc-input mt-1"
                        />
                      </div>

                      <CustomSelect
                        id="gal-expiry"
                        label="Auto-Expire Link"
                        value={expiresInDays}
                        options={EXPIRY_SELECT_OPTIONS}
                        onChange={setExpiresInDays}
                        dark={builderDark}
                      />

                      <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
                        <ToggleField
                          label="Allow downloads & ZIP export"
                          description="Visitors can save originals or batch ZIP"
                          checked={allowDownload}
                          onChange={setAllowDownload}
                          dark={builderDark}
                        />

                        <ToggleField
                          label="Allow client favorites / likes"
                          description="Visitors can heart photos for selection"
                          checked={allowLikes}
                          onChange={setAllowLikes}
                          dark={builderDark}
                        />
                      </div>

                      <GalleryStyleControls
                        values={{ theme, fontPreset, accentColor, gridGap, cardRadius }}
                        onChange={(key: keyof GalleryStyleValues, val) => {
                          if (key === 'theme') setTheme(val as GalleryTheme);
                          else if (key === 'fontPreset') setFontPreset(val as GalleryFontPreset);
                          else if (key === 'accentColor') setAccentColor(val as string);
                          else if (key === 'gridGap') setGridGap(val as GalleryGridGap);
                          else if (key === 'cardRadius') setCardRadius(val as GalleryCardRadius);
                        }}
                        previewTitle={title.trim() || undefined}
                        previewBrand={brandName.trim() || undefined}
                        dark={builderDark}
                      />
                    </div>
                  )}
                </div>

                {config.turnstileSiteKey && (
                  <TurnstileWidget
                    siteKey={config.turnstileSiteKey}
                    onToken={setTurnstileToken}
                    theme={builderDark ? 'dark' : 'light'}
                  />
                )}

                {error && <SupportErrorAlert message={error} context="Gallery Creation" />}
              </form>

              {created && (
                <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                      Gallery Ready ({created.gallery.itemCount} items synced)
                    </h3>
                    <button
                      type="button"
                      onClick={() => onNavigate(created.sharePath)}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                    >
                      <span>Open Gallery</span>
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>

                  {created.truncated && (
                    <p className="mt-2 text-xs text-amber-500">
                      Note: Folder exceeded 2,000 items, so the first 2,000 media items were indexed.
                    </p>
                  )}

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold tracking-wide uppercase opacity-80">
                        Client Share Link
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          readOnly
                          value={`${window.location.origin}${created.sharePath}`}
                          className="uc-input flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => copyFullUrl(created.sharePath, 'share')}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
                            builderDark
                              ? 'border-[#f4f1ea]/20 bg-[#1c1b18] text-[#f4f1ea] hover:bg-[#2a2824]'
                              : 'border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100'
                          }`}
                        >
                          {copiedField === 'share' ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase opacity-80">
                        <KeyRound className="h-3.5 w-3.5" />
                        Secret Manage Link (Bookmark this — no login required)
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          readOnly
                          value={`${window.location.origin}${created.managePath}`}
                          className="uc-input flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => copyFullUrl(created.managePath, 'manage')}
                          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
                            builderDark
                              ? 'border-[#f4f1ea]/20 bg-[#1c1b18] text-[#f4f1ea] hover:bg-[#2a2824]'
                              : 'border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100'
                          }`}
                        >
                          {copiedField === 'manage' ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {recent.length > 0 && (
              <div className="mt-8">
                <h3 className={`uc-font-mono text-xs font-semibold tracking-widest uppercase ${builderMutedText}`}>
                  Recent Galleries (Saved on this browser)
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {recent.map((item) => (
                    <div
                      key={item.slug}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-4 shadow-2xs ${
                        builderDark
                          ? 'border-[#f4f1ea]/12 bg-[#1b1a17]'
                          : 'border-[#141311]/12 bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.title}</p>
                        <p className={`uc-font-mono text-xs ${builderMutedText}`}>
                          /g/{item.slug} · {item.itemCount} items
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onNavigate(item.sharePath)}
                          className={`min-h-[36px] rounded-lg px-3 text-xs font-medium transition ${
                            builderDark
                              ? 'bg-[#2a2824] text-[#f4f1ea] hover:bg-[#38352f]'
                              : 'bg-stone-100 text-slate-800 hover:bg-stone-200'
                          }`}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate(item.managePath)}
                          className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-medium transition ${
                            builderDark
                              ? 'border-[#f4f1ea]/20 text-[#f4f1ea]/85 hover:bg-[#f4f1ea]/10'
                              : 'border-stone-200 text-slate-700 hover:bg-stone-100'
                          }`}
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
                <p className={`uc-font-mono text-xs tracking-[0.18em] uppercase ${mutedText}`}>
                  01 · About
                </p>
                <h2 className="uc-font-serif mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                  Built for sending folders without the clutter of Drive.
                </h2>
                <p className={`mt-4 text-sm leading-relaxed sm:text-base ${bodyText}`}>
                  Google Drive is great for storing final exports, but sending a raw Drive folder
                  to clients feels utilitarian and disorganized. {config.appName} wraps your
                  existing Drive folder in a thoughtful, quiet gallery—while your files stay right
                  where they already live.
                </p>
                <p className={`mt-3 text-sm leading-relaxed sm:text-base ${bodyText}`}>
                  No sign-ups, no monthly storage subscriptions, and no duplicate uploads.
                </p>
              </div>

              <div className="lg:col-span-7">
                <p className={`uc-font-mono text-xs tracking-[0.18em] uppercase ${mutedText}`}>
                  Who can use it
                </p>
                <div className={`mt-4 divide-y border-y ${dividerRule}`}>
                  {AUDIENCE_LIST.map((item) => (
                    <div key={item.index} className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-12 sm:gap-4">
                      <span className={`uc-font-mono text-xs sm:col-span-2 sm:pt-0.5 ${mutedText}`}>
                        {item.index}
                      </span>
                      <div className="sm:col-span-10">
                        <h3 className="text-base font-semibold">{item.title}</h3>
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
              <p className={`uc-font-mono text-xs tracking-[0.18em] uppercase ${mutedText}`}>
                02 · How It Works & Limitations
              </p>
              <h2 className="uc-font-serif mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                Three steps to publish—and what to keep in mind.
              </h2>
            </div>

            {/* 3-Step Guide */}
            <div className={`mt-10 grid grid-cols-1 gap-8 border-t pt-8 md:grid-cols-3 ${borderRule}`}>
              {HOW_IT_WORKS_STEPS.map((item) => (
                <div key={item.step} className="space-y-2.5">
                  <span
                    className={`uc-font-mono inline-block border-b pb-1 text-xs font-semibold tracking-widest ${
                      isDark ? 'border-[#f4f1ea]' : 'border-[#141311]'
                    }`}
                  >
                    STEP {item.step}
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
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
                <h3 className="uc-font-serif text-xl font-semibold sm:text-2xl">
                  Free-tool limitations
                </h3>
                <span className={`uc-font-mono text-[11px] tracking-widest uppercase ${mutedText}`}>
                  Transparent Specs
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

          {/* Inline Donation QR Section */}
          <section id="donate" className="scroll-mt-20 py-14 sm:py-20">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <p className={`uc-font-mono text-xs tracking-[0.18em] uppercase ${mutedText}`}>
                  03 · Support This Free Tool
                </p>
                <h2 className="uc-font-serif mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                  Keep {config.appName} free for every creator.
                </h2>
                <p className={`mt-3 text-sm leading-relaxed sm:text-base ${bodyText}`}>
                  There are no subscriptions or paywalls here. If this saved you time or helped you
                  deliver a client shoot cleanly, tips via GoTyme, Maya, GCash, or Ko-fi help
                  keep hosting and API access running. Click any QR code below to enlarge it for
                  scanning.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenDonate}
                className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-full border px-4 text-xs font-semibold transition ${
                  isDark
                    ? 'border-[#f4f1ea]/20 bg-[#1b1a17] text-[#f4f1ea] hover:border-[#f4f1ea]/45'
                    : 'border-[#141311]/20 bg-white text-[#141311] hover:border-[#141311]/45'
                }`}
              >
                <Heart className="h-3.5 w-3.5" />
                <span>Open QR Modal</span>
              </button>
            </div>

            <DonateQrGrid donateUrl={config.donateUrl} variant="page" dark={isDark} />
          </section>
          </div>
        </main>

        <footer className={`border-t py-8 text-xs ${borderRule} ${bodyText}`}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
            <p className={`uc-font-serif flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-[#f4f1ea]' : 'text-[#141311]'}`}>
              <img
                src="/logo.png"
                alt=""
                className={`h-5 w-5 shrink-0 object-contain ${isDark ? 'invert' : ''}`}
              />
              <span>{config.appName}</span>
              <span className={`uc-font-sans text-xs font-normal ${mutedText}`}>
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
