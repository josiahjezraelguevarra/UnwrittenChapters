import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  Columns2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Heart,
  KeyRound,
  LayoutGrid,
  Lock,
  Maximize,
  Maximize2,
  Minimize2,
  Monitor,
  Palette,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Rows3,
  Save,
  ShieldCheck,
  Smartphone,
  Square,
  Trash2,
  X
} from 'lucide-react';
import type {
  GalleryCaptionMode,
  GalleryCardRadius,
  GalleryCardStyle,
  GalleryFontPreset,
  GalleryGridGap,
  GalleryHeroStyle,
  GalleryLayout,
  GalleryTheme,
  PublicGalleryConfig
} from '../../shared/types';
import { sanitizeHexColor, type GalleryPalettePreset } from '../../shared/customization';
import { SUPPORT_EMAIL, buildSupportMailto } from '../../shared/contact';
import { CustomSelect, type CustomSelectOption } from '../components/CustomSelect';
import {
  GalleryStyleControls,
  type GalleryStyleValues
} from '../components/GalleryStyleControls';
import { GallerySurface, type MediaFilter } from '../components/GallerySurface';
import { QrShareModal } from '../components/QrShareModal';
import { SupportErrorAlert } from '../components/SupportErrorAlert';
import { ToggleField } from '../components/ToggleField';
import {
  EXPIRY_SELECT_OPTIONS,
  LAYOUT_SELECT_OPTIONS,
  THEME_SELECT_OPTIONS
} from '../config/galleryOptions';
import {
  ApiError,
  deleteGallery,
  exchangeManageSession,
  fetchManageGallery,
  mediaThumbUrl,
  removeRecentGallery,
  rotateManageToken,
  syncGalleryDrive,
  updateManageGallery,
  type ManageGalleryResponse
} from '../lib/api';
import { usePageSeo } from '../lib/seo';

interface ManagePageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export function ManagePage({ slug, onNavigate }: ManagePageProps) {
  const initialHashToken = window.location.hash.replace(/^#/, '').trim();
  const initialCreated =
    new URLSearchParams(window.location.search).get('created') === '1';

  // Kept in memory only for the current view — never written to localStorage
  const [sessionManageToken, setSessionManageToken] = useState<string>(initialHashToken);
  const [authRequired, setAuthRequired] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [justCreated, setJustCreated] = useState(initialCreated);
  const [rotatingToken, setRotatingToken] = useState(false);

  useEffect(() => {
    // Scrub secret manage token & created flag from URL bar & history after reading
    if (window.location.hash || window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const [data, setData] = useState<ManageGalleryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [title, setTitle] = useState('');

  usePageSeo({
    title: title ? `Manage ${title} — UnwrittenChapters` : 'Manage Gallery — UnwrittenChapters',
    description: 'Manage gallery settings, theme customization, password lock, and client favorites.',
    robots: 'noindex, nofollow',
    canonicalPath: null
  });
  const [description, setDescription] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [layout, setLayout] = useState<GalleryLayout>('masonry');
  const [theme, setTheme] = useState<GalleryTheme>('light');
  const [fontPreset, setFontPreset] = useState<GalleryFontPreset>('sans');
  const [accentColor, setAccentColor] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [surfaceColor, setSurfaceColor] = useState('');
  const [textColor, setTextColor] = useState('');
  const [heroStyle, setHeroStyle] = useState<GalleryHeroStyle>('fullscreen');
  const [cardStyle, setCardStyle] = useState<GalleryCardStyle>('clean');
  const [captionMode, setCaptionMode] = useState<GalleryCaptionMode>('hover');
  const [gridGap, setGridGap] = useState<GalleryGridGap>('normal');
  const [cardRadius, setCardRadius] = useState<GalleryCardRadius>('rounded');
  const [coverFileId, setCoverFileId] = useState<string>('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowLikes, setAllowLikes] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [driveSources, setDriveSources] = useState<string[]>([]);
  const [savedDriveSources, setSavedDriveSources] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [expiryAction, setExpiryAction] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedManage, setCopiedManage] = useState(false);
  const [copiedLightroom, setCopiedLightroom] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const [previewFilter, setPreviewFilter] = useState<MediaFilter>('all');
  const [previewFolderPath, setPreviewFolderPath] = useState<string>('__ALL__');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'design' | 'access'>('design');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const applyGalleryToForm = useCallback((g: PublicGalleryConfig) => {
    setTitle(g.title);
    setDescription(g.description);
    setBrandName(g.brandName);
    setBrandUrl(g.brandUrl);
    setLayout(g.layout);
    setTheme(g.theme);
    setFontPreset(g.fontPreset || 'sans');
    setAccentColor(g.accentColor || '');
    setBackgroundColor(g.backgroundColor || '');
    setSurfaceColor(g.surfaceColor || '');
    setTextColor(g.textColor || '');
    setHeroStyle(g.heroStyle || 'banner');
    setCardStyle(g.cardStyle || 'clean');
    setCaptionMode(g.captionMode || 'hover');
    setGridGap(g.gridGap || 'normal');
    setCardRadius(g.cardRadius || 'rounded');
    setCoverFileId(g.coverFileId || '');
    setAllowDownload(g.allowDownload);
    setAllowLikes(g.allowLikes);
    setAutoSync(g.autoSync !== false);
    setNewPassword('');
    setClearPassword(false);
    setExpiryAction('');
  }, []);

  const loadManage = useCallback(
    async (hashTokenToExchange?: string) => {
      setLoading(true);
      setError('');
      setAuthError('');
      try {
        if (hashTokenToExchange) {
          await exchangeManageSession(slug, hashTokenToExchange);
        }
        const res = await fetchManageGallery(slug);
        setAuthRequired(false);
        setData(res);
        applyGalleryToForm(res.gallery);
        const sources = res.driveSources || [];
        setDriveSources(sources);
        setSavedDriveSources(sources);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setAuthRequired(true);
          setData(null);
        } else {
          setError(err instanceof ApiError ? err.message : 'Unable to load gallery settings.');
        }
      } finally {
        setLoading(false);
      }
    },
    [slug, applyGalleryToForm]
  );

  useEffect(() => {
    void loadManage(initialHashToken && !initialCreated ? initialHashToken : undefined);
    // Run once per slug mount using the initial URL hash if present
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (confirmDeleteOpen && !dialog.open) dialog.showModal();
    else if (!confirmDeleteOpen && dialog.open) dialog.close();
  }, [confirmDeleteOpen]);

  useEffect(() => {
    if (!previewFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewFullscreen]);

  const manageExpiryOptions: CustomSelectOption<string>[] = useMemo(() => {
    const currentLabel = data?.gallery.expiresAt
      ? `Keep current (expires ${new Date(data.gallery.expiresAt).toLocaleDateString()})`
      : 'Keep current (never expires)';
    return [
      { value: '', label: currentLabel, description: 'Leave expiration unchanged' },
      ...EXPIRY_SELECT_OPTIONS.map((opt) =>
        opt.value === '' ? { ...opt, value: 'never' } : opt
      )
    ];
  }, [data?.gallery.expiresAt]);

  const coverSelectOptions: CustomSelectOption<string>[] = useMemo(() => {
    if (!data) return [];
    return data.items.slice(0, 100).map((item) => ({
      value: item.id,
      label: item.name,
      description: item.folderPath || 'Root folder',
      thumbUrl: mediaThumbUrl(slug, item.id, 120)
    }));
  }, [data, slug]);

  const likedItems = useMemo(() => {
    if (!data) return [];
    return data.items
      .filter((item) => (data.likeCounts[item.id] || 0) > 0)
      .sort((a, b) => (data.likeCounts[b.id] || 0) - (data.likeCounts[a.id] || 0));
  }, [data]);

  const previewLikedSet = useMemo(() => {
    if (!data) return new Set<string>();
    return new Set(
      Object.entries(data.likeCounts)
        .filter(([, cnt]) => cnt > 0)
        .map(([id]) => id)
    );
  }, [data]);

  const previewFilteredItems = useMemo(() => {
    if (!data) return [];
    return data.items
      .filter((item) => {
        if (previewFolderPath !== '__ALL__' && item.folderPath !== previewFolderPath) {
          return false;
        }
        if (previewFilter === 'image' && item.kind !== 'image') return false;
        if (previewFilter === 'video' && item.kind !== 'video') return false;
        if (previewFilter === 'favorites' && !previewLikedSet.has(item.id)) return false;
        return true;
      })
      .slice(0, 30);
  }, [data, previewFolderPath, previewFilter, previewLikedSet]);

  const previewGallery: PublicGalleryConfig | null = useMemo(() => {
    if (!data) return null;
    return {
      ...data.gallery,
      title: title.trim() || data.gallery.title,
      description: description.trim(),
      brandName: brandName.trim(),
      brandUrl: brandUrl.trim(),
      layout,
      theme,
      fontPreset,
      accentColor: sanitizeHexColor(accentColor),
      backgroundColor: sanitizeHexColor(backgroundColor),
      surfaceColor: sanitizeHexColor(surfaceColor),
      textColor: sanitizeHexColor(textColor),
      heroStyle,
      cardStyle,
      captionMode,
      gridGap,
      cardRadius,
      coverFileId: coverFileId || data.gallery.coverFileId,
      allowDownload,
      allowLikes,
      autoSync
    };
  }, [
    data,
    title,
    description,
    brandName,
    brandUrl,
    layout,
    theme,
    fontPreset,
    accentColor,
    backgroundColor,
    surfaceColor,
    textColor,
    heroStyle,
    cardStyle,
    captionMode,
    gridGap,
    cardRadius,
    coverFileId,
    allowDownload,
    allowLikes,
    autoSync
  ]);

  const hasUnsavedChanges = useMemo(() => {
    if (!data) return false;
    const g = data.gallery;
    return (
      title !== g.title ||
      description !== g.description ||
      brandName !== g.brandName ||
      brandUrl !== g.brandUrl ||
      layout !== g.layout ||
      theme !== g.theme ||
      fontPreset !== (g.fontPreset || 'sans') ||
      sanitizeHexColor(accentColor) !== (g.accentColor || '') ||
      sanitizeHexColor(backgroundColor) !== (g.backgroundColor || '') ||
      sanitizeHexColor(surfaceColor) !== (g.surfaceColor || '') ||
      sanitizeHexColor(textColor) !== (g.textColor || '') ||
      heroStyle !== (g.heroStyle || 'banner') ||
      cardStyle !== (g.cardStyle || 'clean') ||
      captionMode !== (g.captionMode || 'hover') ||
      gridGap !== (g.gridGap || 'normal') ||
      cardRadius !== (g.cardRadius || 'rounded') ||
      (coverFileId || '') !== (g.coverFileId || '') ||
      allowDownload !== g.allowDownload ||
      allowLikes !== g.allowLikes ||
      autoSync !== (g.autoSync !== false) ||
      driveSources.map((s) => s.trim()).filter(Boolean).join('|') !== savedDriveSources.join('|') ||
      Boolean(newPassword.trim()) ||
      clearPassword ||
      expiryAction !== ''
    );
  }, [
    data,
    title,
    description,
    brandName,
    brandUrl,
    layout,
    theme,
    fontPreset,
    accentColor,
    backgroundColor,
    surfaceColor,
    textColor,
    heroStyle,
    cardStyle,
    captionMode,
    gridGap,
    cardRadius,
    coverFileId,
    allowDownload,
    allowLikes,
    autoSync,
    driveSources,
    savedDriveSources,
    newPassword,
    clearPassword,
    expiryAction
  ]);

  const resetDraft = () => {
    if (!data) return;
    applyGalleryToForm(data.gallery);
    setDriveSources(savedDriveSources);
  };

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setError('');
    const cleanedSources = driveSources.map((s) => s.trim()).filter(Boolean);
    const sourcesChanged = cleanedSources.join('|') !== savedDriveSources.join('|');
    try {
      const res = await updateManageGallery(slug, {
        title,
        description,
        brandName,
        brandUrl,
        layout,
        theme,
        fontPreset,
        accentColor: sanitizeHexColor(accentColor),
        backgroundColor: sanitizeHexColor(backgroundColor),
        surfaceColor: sanitizeHexColor(surfaceColor),
        textColor: sanitizeHexColor(textColor),
        heroStyle,
        cardStyle,
        captionMode,
        gridGap,
        cardRadius,
        coverFileId: coverFileId || undefined,
        allowDownload,
        allowLikes,
        autoSync,
        ...(sourcesChanged && cleanedSources.length > 0 ? { driveUrls: cleanedSources } : {}),
        ...(expiryAction === 'never'
          ? { expiresInDays: null }
          : expiryAction
            ? { expiresInDays: Number(expiryAction) }
            : {}),
        ...(clearPassword
          ? { clearPassword: true }
          : newPassword.trim()
            ? { password: newPassword.trim() }
            : {})
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              gallery: res.gallery,
              ...(res.items ? { items: res.items } : {}),
              ...(res.folders ? { folders: res.folders } : {})
            }
          : prev
      );
      if (res.driveSources) {
        setDriveSources(res.driveSources);
        setSavedDriveSources(res.driveSources);
      }
      applyGalleryToForm(res.gallery);
      showToast(sourcesChanged ? 'Saved & synced updated Drive folders.' : 'Gallery settings saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      const res = await syncGalleryDrive(slug);
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: res.items,
              folders: res.folders,
              gallery: { ...prev.gallery, itemCount: res.itemCount, syncedAt: res.syncedAt }
            }
          : prev
      );
      showToast(`Synced ${res.itemCount} items from Google Drive.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteGallery(slug);
      removeRecentGallery(slug);
      onNavigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete gallery.');
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  const handleRotateManageLink = async () => {
    setRotatingToken(true);
    setError('');
    try {
      const res = await rotateManageToken(slug);
      const newToken = res.managePath.split('#')[1] || '';
      if (newToken) {
        setSessionManageToken(newToken);
      }
      setJustCreated(true);
      showToast('Generated a new Secret Manage Link. Previous links are now revoked.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not rotate manage link.');
    } finally {
      setRotatingToken(false);
    }
  };

  const escapeCsvCell = (raw: string): string => {
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const exportFavorites = (format: 'txt' | 'csv') => {
    if (likedItems.length === 0) return;
    const content =
      format === 'txt'
        ? likedItems
            .map((item) => (item.folderPath ? `${item.folderPath}/${item.name}` : item.name))
            .join('\n')
        : [
            'filename,folder,likes,kind',
            ...likedItems.map(
              (item) =>
                `${escapeCsvCell(item.name)},${escapeCsvCell(item.folderPath)},${
                  data?.likeCounts[item.id] || 0
                },${escapeCsvCell(item.kind)}`
            )
          ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-favorites.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (authRequired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-5 w-5 text-slate-700" />
            <h1 className="text-lg font-bold text-slate-900">Manage Token Required</h1>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Paste the secret manage token from your original Manage Link to edit{' '}
            <code>/g/{slug}</code>.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const clean = tokenInput.includes('#')
                ? tokenInput.split('#')[1].trim()
                : tokenInput.trim();
              if (!clean) return;
              setAuthenticating(true);
              setAuthError('');
              try {
                await exchangeManageSession(slug, clean);
                setSessionManageToken(clean);
                setTokenInput('');
                setAuthRequired(false);
                await loadManage();
              } catch (err) {
                setAuthError(
                  err instanceof ApiError ? err.message : 'Invalid manage token.'
                );
              } finally {
                setAuthenticating(false);
              }
            }}
            className="mt-4 space-y-3"
          >
            <input
              type="password"
              required
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste token or full manage URL"
              className="min-h-[44px] w-full rounded-xl border border-stone-300 px-3 text-sm"
            />
            {authError && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={authenticating}
              className="min-h-[44px] w-full rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-50"
            >
              {authenticating ? 'Verifying...' : 'Open Manager'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-stone-200" />
              <div className="space-y-1.5">
                <div className="h-5 w-48 animate-pulse rounded bg-stone-200" />
                <div className="h-3.5 w-64 animate-pulse rounded bg-stone-200/80" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-28 animate-pulse rounded-xl bg-stone-200" />
              <div className="h-10 w-32 animate-pulse rounded-xl bg-stone-200" />
              <div className="h-10 w-28 animate-pulse rounded-xl bg-stone-200" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
            <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 xl:col-span-5">
              <div className="h-6 w-40 animate-pulse rounded bg-stone-200" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-stone-200/70" />
                ))}
              </div>
              <div className="h-32 w-full animate-pulse rounded-xl bg-stone-100" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white xl:col-span-7">
              <div className="h-12 border-b border-stone-200 bg-stone-100/80" />
              <div className="space-y-4 p-6">
                <div className="h-36 animate-pulse rounded-xl bg-stone-200/80" />
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-stone-200/80" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 text-center">
        <p className="text-base font-medium text-red-700">{error || 'Unauthorized.'}</p>
        <p className="mt-2 max-w-md text-xs text-slate-600">
          API or hosting trouble? Contact{' '}
          <a
            href={buildSupportMailto(`Manage /g/${slug}`)}
            className="font-semibold text-slate-900 underline underline-offset-2"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="mt-4 min-h-[40px] rounded-xl bg-slate-900 px-4 text-sm font-medium text-white"
        >
          Back Home
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              aria-label="Back to home"
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-stone-200 hover:bg-stone-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <img src="/logo.svg" alt="" className="hidden h-7 w-7 shrink-0 object-contain sm:block" />
            <div>
              <h1 className="text-lg font-bold">Manage: {data.gallery.title}</h1>
              <p className="text-xs text-slate-500">
                {data.gallery.itemCount} items · {data.gallery.viewCount} views · Last synced{' '}
                {new Date(data.gallery.syncedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 text-xs font-semibold hover:bg-stone-100 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Drive'}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/g/${slug}`);
                setCopiedShare(true);
                setTimeout(() => setCopiedShare(false), 2000);
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 text-xs font-semibold hover:bg-stone-100"
            >
              {copiedShare ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedShare ? 'Copied Share' : 'Copy Share Link'}</span>
            </button>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 text-xs font-semibold hover:bg-stone-100"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>QR &amp; Card</span>
            </button>
            {sessionManageToken && (
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}/g/${slug}/manage#${sessionManageToken}`
                  );
                  setCopiedManage(true);
                  setTimeout(() => setCopiedManage(false), 2000);
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 text-xs font-semibold hover:bg-stone-100"
              >
                {copiedManage ? <Check className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
                <span>{copiedManage ? 'Copied Manage' : 'Copy Manage Link'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate(`/g/${slug}`)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <span>View Gallery</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {justCreated && (
          <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50/90 p-5 text-emerald-950 shadow-2xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <h2 className="text-sm font-bold">
                    Gallery Ready ({data.gallery.itemCount} items synced from Drive)
                  </h2>
                  <p className="mt-0.5 text-xs text-emerald-900/80">
                    Customize your gallery colors, typography, layout, and privacy below. Because
                    there are no logins, bookmark or copy your <strong>Secret Manage Link</strong>{' '}
                    to return later.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss new gallery banner"
                onClick={() => setJustCreated(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-800/70 hover:bg-emerald-200/60 hover:text-emerald-950"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  aria-label="Client Share Link"
                  value={`${window.location.origin}/g/${slug}`}
                  className="uc-input flex-1 bg-white text-xs"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${window.location.origin}/g/${slug}`);
                    setCopiedShare(true);
                    setTimeout(() => setCopiedShare(false), 2000);
                  }}
                  className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                >
                  {copiedShare ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedShare ? 'Copied' : 'Copy Share'}</span>
                </button>
              </div>
              {sessionManageToken && (
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    aria-label="Secret Manage Link"
                    value={`${window.location.origin}/g/${slug}/manage#${sessionManageToken}`}
                    className="uc-input flex-1 bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}/g/${slug}/manage#${sessionManageToken}`
                      );
                      setCopiedManage(true);
                      setTimeout(() => setCopiedManage(false), 2000);
                    }}
                    className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                  >
                    {copiedManage ? <Check className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
                    <span>{copiedManage ? 'Copied' : 'Copy Manage'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {toast && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
          >
            {toast}
          </div>
        )}
        {error && <SupportErrorAlert message={error} context={`Manage /g/${slug}`} />}

        {/* Customize + Live Preview Workspace */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          {/* Settings Form */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs sm:p-6 xl:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Customize Gallery</h2>
                <p className="text-xs text-slate-500">
                  Changes preview live on the right before saving.
                </p>
              </div>
              {hasUnsavedChanges && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Unsaved changes
                </span>
              )}
            </div>

            {/* Clean 3-Tab Switcher */}
            <div
              role="tablist"
              aria-label="Gallery customization sections"
              className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1"
            >
              {(
                [
                  ['details', 'Details', FileText],
                  ['design', 'Design', Palette],
                  ['access', 'Access', Lock]
                ] as const
              ).map(([tabId, label, Icon]) => {
                const selected = activeTab === tabId;
                return (
                  <button
                    key={tabId}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tabId)}
                    className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition ${
                      selected
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-5">
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="m-title" className="block text-xs font-medium text-slate-700">
                      Gallery Title
                    </label>
                    <input
                      id="m-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="uc-input mt-1"
                    />
                  </div>

                  <div>
                    <label htmlFor="m-desc" className="block text-xs font-medium text-slate-700">
                      Welcome Note / Description
                    </label>
                    <textarea
                      id="m-desc"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add a welcome note for your clients..."
                      className="uc-input mt-1 min-h-[68px] py-2"
                    />
                  </div>

                  <CustomSelect
                    id="m-cover"
                    label="Cover Image"
                    value={coverFileId}
                    options={coverSelectOptions}
                    onChange={setCoverFileId}
                    placeholder="Select cover photo"
                  />

                  <div className="space-y-4 border-t border-stone-200/80 pt-4">
                    <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                      Studio Branding
                    </p>
                    <div>
                      <label htmlFor="m-brand" className="block text-xs font-medium text-slate-700">
                        Brand / Studio Name
                      </label>
                      <input
                        id="m-brand"
                        type="text"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. Studio Lumiere"
                        className="uc-input mt-1"
                      />
                    </div>

                    <div>
                      <label htmlFor="m-url" className="block text-xs font-medium text-slate-700">
                        Website URL
                      </label>
                      <input
                        id="m-url"
                        type="url"
                        value={brandUrl}
                        onChange={(e) => setBrandUrl(e.target.value)}
                        placeholder="https://yourportfolio.com"
                        className="uc-input mt-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5 border-t border-stone-200/80 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                        Linked Drive Folders ({driveSources.length}/3)
                      </p>
                      {driveSources.length < 3 && (
                        <button
                          type="button"
                          onClick={() => setDriveSources((prev) => [...prev, ''])}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Link</span>
                        </button>
                      )}
                    </div>
                    {driveSources.map((src, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          required={idx === 0}
                          aria-label={`Google Drive folder link ${idx + 1}`}
                          value={src}
                          onChange={(e) => {
                            const next = [...driveSources];
                            next[idx] = e.target.value;
                            setDriveSources(next);
                          }}
                          placeholder="https://drive.google.com/drive/folders/..."
                          className="uc-input flex-1 text-xs"
                        />
                        {driveSources.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove Drive link ${idx + 1}`}
                            onClick={() =>
                              setDriveSources((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-stone-300 text-slate-600 hover:bg-stone-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'design' && (
                <div className="space-y-4">
                  <CustomSelect
                    id="m-layout"
                    label="Photo Layout"
                    value={layout}
                    options={LAYOUT_SELECT_OPTIONS}
                    onChange={setLayout}
                  />

                  <CustomSelect
                    id="m-theme"
                    label="Gallery Color Theme"
                    value={theme}
                    options={THEME_SELECT_OPTIONS}
                    onChange={setTheme}
                  />

                  <GalleryStyleControls
                    values={{
                      theme,
                      fontPreset,
                      accentColor,
                      backgroundColor,
                      surfaceColor,
                      textColor,
                      heroStyle,
                      cardStyle,
                      captionMode,
                      gridGap,
                      cardRadius
                    }}
                    onApplyPalette={(palette: GalleryPalettePreset) => {
                      setTheme(palette.theme);
                      setBackgroundColor(palette.backgroundColor);
                      setSurfaceColor(palette.surfaceColor);
                      setTextColor(palette.textColor);
                      setAccentColor(palette.accentColor);
                    }}
                    onChange={(key: keyof GalleryStyleValues, val) => {
                      if (key === 'theme') setTheme(val as GalleryTheme);
                      else if (key === 'fontPreset') setFontPreset(val as GalleryFontPreset);
                      else if (key === 'accentColor') setAccentColor(val as string);
                      else if (key === 'backgroundColor') setBackgroundColor(val as string);
                      else if (key === 'surfaceColor') setSurfaceColor(val as string);
                      else if (key === 'textColor') setTextColor(val as string);
                      else if (key === 'heroStyle') setHeroStyle(val as GalleryHeroStyle);
                      else if (key === 'cardStyle') setCardStyle(val as GalleryCardStyle);
                      else if (key === 'captionMode') setCaptionMode(val as GalleryCaptionMode);
                      else if (key === 'gridGap') setGridGap(val as GalleryGridGap);
                      else if (key === 'cardRadius') setCardRadius(val as GalleryCardRadius);
                    }}
                    previewTitle={title}
                    previewBrand={brandName}
                    showMiniPreview={false}
                    compact
                  />
                </div>
              )}

              {activeTab === 'access' && (
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                      Client Permissions
                    </p>
                    <ToggleField
                      label="Allow downloads"
                      description="Enable single downloads & batch ZIP export"
                      checked={allowDownload}
                      onChange={setAllowDownload}
                    />
                    <ToggleField
                      label="Allow client favorites"
                      description="Let visitors heart photos for Lightroom selection"
                      checked={allowLikes}
                      onChange={setAllowLikes}
                    />
                    <ToggleField
                      label="Auto-sync Drive changes"
                      description="Refresh newly added or removed Drive files in the background every 6 hours"
                      checked={autoSync}
                      onChange={setAutoSync}
                    />
                  </div>

                  <div className="space-y-3 border-t border-stone-200/80 pt-4">
                    <label htmlFor="m-pass" className="block text-xs font-medium text-slate-700">
                      {data.gallery.hasPassword
                        ? 'Replace Password (currently protected)'
                        : 'Set Password (currently public)'}
                    </label>
                    <input
                      id="m-pass"
                      type="password"
                      minLength={6}
                      maxLength={128}
                      value={newPassword}
                      disabled={clearPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="6–128 chars (leave blank to keep)"
                      className="uc-input"
                    />
                    {data.gallery.hasPassword && (
                      <ToggleField
                        label="Remove password protection"
                        description="Anyone with the share link can open without a password"
                        checked={clearPassword}
                        onChange={setClearPassword}
                      />
                    )}
                  </div>

                  <div className="border-t border-stone-200/80 pt-4">
                    <CustomSelect
                      id="m-expiry"
                      label="Auto-Expire Link"
                      value={expiryAction}
                      options={manageExpiryOptions}
                      onChange={setExpiryAction}
                    />
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                    <p className="text-xs font-semibold text-slate-900">Secret Manage Link</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                      Generate a new Secret Manage Link if you shared or lost the previous one.
                      Older links and sessions will stop working immediately.
                    </p>
                    <button
                      type="button"
                      disabled={rotatingToken}
                      onClick={handleRotateManageLink}
                      className="mt-3 inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 text-xs font-semibold text-slate-800 transition hover:bg-stone-100 disabled:opacity-50"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>{rotatingToken ? 'Rotating...' : 'Rotate Manage Link'}</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-red-200/80 bg-red-50/40 p-4">
                    <p className="text-xs font-semibold text-red-900">Danger Zone</p>
                    <p className="mt-0.5 text-xs text-red-800/80">
                      Removes this gallery link & likes. Your Google Drive files stay untouched.
                    </p>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="mt-3 inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Gallery</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 pt-4">
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={resetDraft}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-stone-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 sm:flex-initial"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </section>

        {/* Live Gallery Preview */}
        {previewGallery && (
          <section
            aria-label="Live gallery preview"
            className={
              previewFullscreen
                ? 'fixed inset-0 z-50 flex flex-col bg-stone-100'
                : 'overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs xl:sticky xl:top-6 xl:col-span-7'
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-100/95 px-4 py-2.5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-700" />
                <span className="text-xs font-semibold text-slate-800">
                  {previewFullscreen ? 'Full-Screen Live Preview' : 'Live Preview'}
                </span>
                <span className="hidden text-xs text-slate-500 sm:inline">
                  · /g/{slug}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Preview Layout Switcher (syncs with form Layout) */}
                <div
                  role="group"
                  aria-label="Preview layout mode"
                  className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5"
                >
                  {(
                    [
                      ['masonry', LayoutGrid, 'Masonry'],
                      ['justified', Rows3, 'Justified'],
                      ['grid', Square, 'Grid'],
                      ['large', Maximize, 'Large'],
                      ['editorial', Columns2, 'Editorial']
                    ] as const
                  ).map(([mode, Icon, label]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-label={`Preview ${label} layout`}
                      aria-pressed={layout === mode}
                      onClick={() => setLayout(mode)}
                      className={`inline-flex min-h-[30px] items-center gap-1 rounded-md px-2 text-xs font-medium transition ${
                        layout === mode
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Desktop / Mobile Preview Viewport Toggle */}
                <div
                  role="group"
                  aria-label="Preview device size"
                  className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5"
                >
                  <button
                    type="button"
                    aria-label="Desktop preview"
                    aria-pressed={previewViewport === 'desktop'}
                    onClick={() => setPreviewViewport('desktop')}
                    className={`flex min-h-[30px] min-w-[30px] items-center justify-center rounded-md transition ${
                      previewViewport === 'desktop'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mobile preview"
                    aria-pressed={previewViewport === 'mobile'}
                    onClick={() => setPreviewViewport('mobile')}
                    className={`flex min-h-[30px] min-w-[30px] items-center justify-center rounded-md transition ${
                      previewViewport === 'mobile'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>

                {previewFullscreen && hasUnsavedChanges && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                )}

                <button
                  type="button"
                  aria-label={previewFullscreen ? 'Exit full screen preview' : 'Expand preview full screen'}
                  title={previewFullscreen ? 'Exit full screen (Esc)' : 'Full screen preview'}
                  onClick={() => setPreviewFullscreen((v) => !v)}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-stone-100"
                >
                  {previewFullscreen ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Exit Full Screen</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Full Screen</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div
              className={`overflow-y-auto bg-stone-200/60 ${
                previewFullscreen ? 'flex-1' : 'max-h-[78vh]'
              }`}
            >
              <div
                className={
                  previewViewport === 'mobile'
                    ? 'mx-auto my-4 max-w-[390px] overflow-hidden rounded-2xl border border-stone-300 shadow-lg'
                    : 'w-full'
                }
              >
                <GallerySurface
                  slug={slug}
                  appName="UnwrittenChapters"
                  gallery={previewGallery}
                  items={data.items}
                  folders={data.folders}
                  likeCounts={data.likeCounts}
                  visitorLikes={previewLikedSet}
                  layout={layout}
                  onLayoutChange={setLayout}
                  mediaFilter={previewFilter}
                  onMediaFilterChange={setPreviewFilter}
                  selectedFolderPath={previewFolderPath}
                  onSelectedFolderPathChange={setPreviewFolderPath}
                  filteredItems={previewFilteredItems}
                  previewMode
                  previewViewport={previewViewport}
                />
              </div>
              {data.items.length > previewFilteredItems.length && (
                <p className="border-t border-stone-200 bg-white px-4 py-2 text-center text-xs text-slate-500">
                  Previewing first {previewFilteredItems.length} of {data.items.length} items. Click{' '}
                  <strong>Save Changes</strong> then <strong>View Gallery</strong> to see the full
                  gallery.
                </p>
              )}
            </div>
          </section>
        )}
        </div>

        {/* Client Favorites Export */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Heart className="h-4 w-4 text-rose-500" />
                Client Favorites ({likedItems.length})
              </h2>
              <p className="text-xs text-slate-500">
                Export filenames selected by your clients for Lightroom or Capture One filtering.
              </p>
            </div>
            {likedItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      likedItems.map((item) => item.name).join(', ')
                    );
                    setCopiedLightroom(true);
                    setTimeout(() => setCopiedLightroom(false), 2000);
                  }}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-xs font-medium hover:bg-stone-100"
                >
                  {copiedLightroom ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedLightroom ? 'Copied Filenames' : 'Copy for Lightroom'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportFavorites('txt')}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-xs font-medium hover:bg-stone-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export .txt</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportFavorites('csv')}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-xs font-medium hover:bg-stone-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export .csv</span>
                </button>
              </div>
            )}
          </div>

          {likedItems.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No favorites yet. Once clients click the heart icon on photos, their picks will appear
              here.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {likedItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={mediaThumbUrl(slug, item.id, 400)}
                      alt={item.name}
                      className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-rose-600/95 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                      <Heart className="h-3 w-3 fill-current" />
                      <span>{data.likeCounts[item.id]}</span>
                    </span>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-2.5 pt-6 pb-2 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <p className="truncate text-[11px] font-medium">{item.name}</p>
                      {item.folderPath && (
                        <p className="truncate text-[10px] text-white/75">{item.folderPath}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <dialog
        ref={deleteDialogRef}
        onClose={() => setConfirmDeleteOpen(false)}
        aria-labelledby="delete-dialog-title"
        className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl"
      >
        <h2 id="delete-dialog-title" className="text-lg font-bold text-slate-900">
          Delete this gallery?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          This removes the gallery link and likes from {slug}. Your original files inside Google
          Drive are never touched.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(false)}
            className="min-h-[40px] rounded-xl border border-stone-300 px-4 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="min-h-[40px] rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </dialog>

      <QrShareModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        shareUrl={`${window.location.origin}/g/${slug}`}
        slug={slug}
        title={title || data.gallery.title}
        brandName={brandName}
        hasPassword={data.gallery.hasPassword}
      />
    </div>
  );
}
