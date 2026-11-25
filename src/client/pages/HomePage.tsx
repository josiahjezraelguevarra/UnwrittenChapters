import { useState, type FormEvent } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FolderOpen,
  Heart,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2
} from 'lucide-react';
import type {
  AppPublicConfig,
  GalleryLayout,
  GalleryTheme,
  RecentGalleryEntry
} from '../../shared/types';
import { TurnstileWidget } from '../components/TurnstileWidget';
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
  onOpenDonate: () => void;
  onNavigate: (path: string) => void;
}

export function HomePage({ config, onOpenDonate, onNavigate }: HomePageProps) {
  const [driveUrl, setDriveUrl] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [layout, setLayout] = useState<GalleryLayout>('masonry');
  const [theme, setTheme] = useState<GalleryTheme>('light');
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

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ImageIcon className="h-5 w-5" />
            </span>
            <div>
              <span className="text-base font-bold tracking-tight">{config.appName}</span>
              <span className="ml-2 hidden rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 sm:inline-block">
                Free · No Account Needed
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenDonate}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          >
            <Heart className="h-4 w-4" />
            <span>Donate</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Paste a Google Drive folder link. Get a client gallery in seconds.
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Turn Google Drive folders into clean client galleries
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
            Supports nested subfolders, photos, HD video streaming, client favorites, password
            locks, and batch ZIP downloads—without signing up or re-uploading a single file.
          </p>
        </div>

        <section
          aria-label="Create gallery"
          className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="drive-url"
                className="block text-sm font-semibold text-slate-800"
              >
                Public Google Drive Folder Link
              </label>
              <div className="mt-1.5 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Link2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="drive-url"
                    type="text"
                    required
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="min-h-[44px] w-full rounded-xl border border-stone-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
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
              <p className="mt-2 text-xs text-slate-500">
                In Google Drive, right-click your folder → <strong>Share</strong> → set General
                access to <strong>Anyone with the link (Viewer)</strong>.
              </p>
            </div>

            <div>
              <button
                type="button"
                aria-expanded={showOptions}
                onClick={() => setShowOptions((v) => !v)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-slate-700 transition hover:bg-stone-100"
              >
                {showOptions ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span>Customize branding, layout, password & expiration</span>
              </button>

              {showOptions && (
                <div className="mt-3 grid grid-cols-1 gap-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="gal-title" className="block text-xs font-medium text-slate-700">
                      Gallery Title (optional)
                    </label>
                    <input
                      id="gal-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Defaults to Drive folder name"
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="gal-slug" className="block text-xs font-medium text-slate-700">
                      Custom URL Slug (optional)
                    </label>
                    <input
                      id="gal-slug"
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      placeholder="e.g. clara-wedding-2026"
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="gal-desc" className="block text-xs font-medium text-slate-700">
                      Welcome Note / Description
                    </label>
                    <input
                      id="gal-desc"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Thank you for letting me capture your story!"
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="brand-name" className="block text-xs font-medium text-slate-700">
                      Your Name / Studio
                    </label>
                    <input
                      id="brand-name"
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Studio Lumiere"
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="brand-url" className="block text-xs font-medium text-slate-700">
                      Studio Website (https://...)
                    </label>
                    <input
                      id="brand-url"
                      type="url"
                      value={brandUrl}
                      onChange={(e) => setBrandUrl(e.target.value)}
                      placeholder="https://yourportfolio.com"
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="gal-layout" className="block text-xs font-medium text-slate-700">
                      Layout
                    </label>
                    <select
                      id="gal-layout"
                      value={layout}
                      onChange={(e) => setLayout(e.target.value as GalleryLayout)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    >
                      <option value="masonry">Masonry (Editorial)</option>
                      <option value="justified">Justified Rows</option>
                      <option value="grid">Square Grid</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="gal-theme" className="block text-xs font-medium text-slate-700">
                      Color Theme
                    </label>
                    <select
                      id="gal-theme"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as GalleryTheme)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    >
                      <option value="light">Clean Light</option>
                      <option value="dark">Gallery Dark</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="gal-pass" className="block text-xs font-medium text-slate-700">
                      Password Protection (optional)
                    </label>
                    <input
                      id="gal-pass"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank for open link"
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="gal-expiry" className="block text-xs font-medium text-slate-700">
                      Auto-Expire Link
                    </label>
                    <select
                      id="gal-expiry"
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value)}
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 bg-white px-3 text-sm"
                    >
                      <option value="">Never expire</option>
                      <option value="7">7 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-6 sm:col-span-2">
                    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={allowDownload}
                        onChange={(e) => setAllowDownload(e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 accent-slate-900"
                      />
                      Allow downloads & ZIP export
                    </label>

                    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={allowLikes}
                        onChange={(e) => setAllowLikes(e.target.checked)}
                        className="h-4 w-4 rounded border-stone-300 accent-slate-900"
                      />
                      Allow client favorites / likes
                    </label>
                  </div>
                </div>
              )}
            </div>

            {config.turnstileSiteKey && (
              <TurnstileWidget
                siteKey={config.turnstileSiteKey}
                onToken={setTurnstileToken}
                theme="light"
              />
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}
          </form>

          {created && (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-semibold text-emerald-950">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Gallery Ready ({created.gallery.itemCount} items synced)
                </h2>
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
                <p className="mt-2 text-xs text-amber-800">
                  Note: Folder exceeded 2,000 items, so the first 2,000 media items were indexed.
                </p>
              )}

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-emerald-900 uppercase">
                    Client Share Link
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}${created.sharePath}`}
                      className="min-h-[40px] flex-1 rounded-lg border border-emerald-200 bg-white px-3 text-sm text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => copyFullUrl(created.sharePath, 'share')}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
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
                  <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-emerald-900 uppercase">
                    <KeyRound className="h-3.5 w-3.5" />
                    Secret Manage Link (Bookmark this — no login required)
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}${created.managePath}`}
                      className="min-h-[40px] flex-1 rounded-lg border border-emerald-200 bg-white px-3 text-sm text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => copyFullUrl(created.managePath, 'manage')}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
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
        </section>

        {recent.length > 0 && (
          <section aria-label="My recent galleries" className="mt-10">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              Recent Galleries (Saved on this device)
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recent.map((item) => (
                <div
                  key={item.slug}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      /g/{item.slug} · {item.itemCount} items
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onNavigate(item.sharePath)}
                      className="min-h-[36px] rounded-lg bg-stone-100 px-3 text-xs font-medium text-slate-800 hover:bg-stone-200"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.managePath)}
                      className="min-h-[36px] rounded-lg border border-stone-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-stone-100"
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
                      className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <FolderOpen className="h-5 w-5 text-slate-700" />
            <h3 className="mt-2 text-sm font-semibold">Nested Subfolders</h3>
            <p className="mt-1 text-xs text-slate-600">
              Automatically organizes Drive subfolders into clean gallery tabs & ZIP folders.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <ImageIcon className="h-5 w-5 text-slate-700" />
            <h3 className="mt-2 text-sm font-semibold">Photos & HD Video</h3>
            <p className="mt-1 text-xs text-slate-600">
              Pinch-to-zoom photo lightbox plus direct seekable HD video playback.
            </p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <Heart className="h-5 w-5 text-rose-600" />
            <h3 className="mt-2 text-sm font-semibold">Free & Tip-Supported</h3>
            <p className="mt-1 text-xs text-slate-600">
              Your media stays in Google Drive. If this saves you time, consider leaving a tip.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-4 px-4">
          <span>{config.appName} — Files remain hosted on Google Drive.</span>
          <button
            type="button"
            onClick={onOpenDonate}
            className="font-medium text-rose-600 underline underline-offset-2 hover:text-rose-700"
          >
            Support this free tool
          </button>
        </div>
      </footer>
    </div>
  );
}
