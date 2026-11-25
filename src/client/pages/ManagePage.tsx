import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Heart,
  KeyRound,
  LayoutGrid,
  Loader2,
  Lock,
  Monitor,
  Palette,
  RefreshCw,
  RotateCcw,
  Rows3,
  Save,
  Smartphone,
  Square,
  Trash2
} from 'lucide-react';
import type {
  GalleryCardRadius,
  GalleryFontPreset,
  GalleryGridGap,
  GalleryLayout,
  GalleryTheme,
  PublicGalleryConfig
} from '../../shared/types';
import { sanitizeHexColor } from '../../shared/customization';
import { SUPPORT_EMAIL, buildSupportMailto } from '../../shared/contact';
import { CustomSelect, type CustomSelectOption } from '../components/CustomSelect';
import {
  GalleryStyleControls,
  type GalleryStyleValues
} from '../components/GalleryStyleControls';
import { GallerySurface, type MediaFilter } from '../components/GallerySurface';
import { SupportErrorAlert } from '../components/SupportErrorAlert';
import { ToggleField } from '../components/ToggleField';
import { LAYOUT_SELECT_OPTIONS, THEME_SELECT_OPTIONS } from '../config/galleryOptions';
import {
  ApiError,
  deleteGallery,
  fetchManageGallery,
  loadAdminToken,
  mediaThumbUrl,
  removeRecentGallery,
  saveAdminToken,
  syncGalleryDrive,
  updateManageGallery,
  type ManageGalleryResponse
} from '../lib/api';

interface ManagePageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export function ManagePage({ slug, onNavigate }: ManagePageProps) {
  const initialHashToken = window.location.hash.replace(/^#/, '').trim();
  const [adminToken, setAdminToken] = useState<string>(() => {
    if (initialHashToken) {
      saveAdminToken(slug, initialHashToken);
      return initialHashToken;
    }
    return loadAdminToken(slug);
  });
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    // Scrub secret manage token from URL bar & history after reading
    if (window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  const [data, setData] = useState<ManageGalleryResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(adminToken));
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandUrl, setBrandUrl] = useState('');
  const [layout, setLayout] = useState<GalleryLayout>('masonry');
  const [theme, setTheme] = useState<GalleryTheme>('light');
  const [fontPreset, setFontPreset] = useState<GalleryFontPreset>('sans');
  const [accentColor, setAccentColor] = useState('');
  const [gridGap, setGridGap] = useState<GalleryGridGap>('normal');
  const [cardRadius, setCardRadius] = useState<GalleryCardRadius>('rounded');
  const [coverFileId, setCoverFileId] = useState<string>('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [allowLikes, setAllowLikes] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  const [previewFilter, setPreviewFilter] = useState<MediaFilter>('all');
  const [previewFolderPath, setPreviewFolderPath] = useState<string>('__ALL__');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'details' | 'design' | 'access'>('details');

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
    setGridGap(g.gridGap || 'normal');
    setCardRadius(g.cardRadius || 'rounded');
    setCoverFileId(g.coverFileId || '');
    setAllowDownload(g.allowDownload);
    setAllowLikes(g.allowLikes);
    setNewPassword('');
    setClearPassword(false);
  }, []);

  const loadManage = useCallback(
    async (token: string) => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetchManageGallery(slug, token);
        saveAdminToken(slug, token);
        setData(res);
        applyGalleryToForm(res.gallery);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load gallery settings.');
      } finally {
        setLoading(false);
      }
    },
    [slug, applyGalleryToForm]
  );

  useEffect(() => {
    if (adminToken) loadManage(adminToken);
  }, [adminToken, loadManage]);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (confirmDeleteOpen && !dialog.open) dialog.showModal();
    else if (!confirmDeleteOpen && dialog.open) dialog.close();
  }, [confirmDeleteOpen]);

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
      gridGap,
      cardRadius,
      coverFileId: coverFileId || data.gallery.coverFileId,
      allowDownload,
      allowLikes
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
    gridGap,
    cardRadius,
    coverFileId,
    allowDownload,
    allowLikes
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
      gridGap !== (g.gridGap || 'normal') ||
      cardRadius !== (g.cardRadius || 'rounded') ||
      (coverFileId || '') !== (g.coverFileId || '') ||
      allowDownload !== g.allowDownload ||
      allowLikes !== g.allowLikes ||
      Boolean(newPassword.trim()) ||
      clearPassword
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
    gridGap,
    cardRadius,
    coverFileId,
    allowDownload,
    allowLikes,
    newPassword,
    clearPassword
  ]);

  const resetDraft = () => {
    if (!data) return;
    applyGalleryToForm(data.gallery);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSaving(true);
    setError('');
    try {
      const res = await updateManageGallery(slug, adminToken, {
        title,
        description,
        brandName,
        brandUrl,
        layout,
        theme,
        fontPreset,
        accentColor: sanitizeHexColor(accentColor),
        gridGap,
        cardRadius,
        coverFileId: coverFileId || undefined,
        allowDownload,
        allowLikes,
        ...(clearPassword
          ? { clearPassword: true }
          : newPassword.trim()
            ? { password: newPassword.trim() }
            : {})
      });
      setData((prev) => (prev ? { ...prev, gallery: res.gallery } : prev));
      applyGalleryToForm(res.gallery);
      showToast('Gallery settings saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!adminToken) return;
    setSyncing(true);
    setError('');
    try {
      const res = await syncGalleryDrive(slug, adminToken);
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
    if (!adminToken) return;
    setDeleting(true);
    try {
      await deleteGallery(slug, adminToken);
      removeRecentGallery(slug);
      onNavigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete gallery.');
      setDeleting(false);
      setConfirmDeleteOpen(false);
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

  if (!adminToken) {
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
            onSubmit={(e) => {
              e.preventDefault();
              const clean = tokenInput.includes('#')
                ? tokenInput.split('#')[1].trim()
                : tokenInput.trim();
              if (clean) setAdminToken(clean);
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
            <button
              type="submit"
              className="min-h-[44px] w-full rounded-xl bg-slate-900 text-sm font-semibold text-white"
            >
              Open Manager
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
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
            <img src="/logo.png" alt="" className="hidden h-7 w-7 shrink-0 object-contain sm:block" />
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
              <span>{copiedShare ? 'Copied Link' : 'Copy Share Link'}</span>
            </button>
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
                    values={{ theme, fontPreset, accentColor, gridGap, cardRadius }}
                    onChange={(key: keyof GalleryStyleValues, val) => {
                      if (key === 'theme') setTheme(val as GalleryTheme);
                      else if (key === 'fontPreset') setFontPreset(val as GalleryFontPreset);
                      else if (key === 'accentColor') setAccentColor(val as string);
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
                      value={newPassword}
                      disabled={clearPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
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
            className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs xl:sticky xl:top-6 xl:col-span-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-100/80 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-700" />
                <span className="text-xs font-semibold text-slate-800">Live Preview</span>
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
                      ['grid', Square, 'Grid']
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
              </div>
            </div>

            <div className="max-h-[78vh] overflow-y-auto bg-stone-200/60">
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
              <div className="flex gap-2">
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
    </div>
  );
}
