import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Heart,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  Trash2
} from 'lucide-react';
import type { GalleryLayout, GalleryTheme } from '../../shared/types';
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

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadManage = useCallback(
    async (token: string) => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetchManageGallery(slug, token);
        saveAdminToken(slug, token);
        setData(res);
        setTitle(res.gallery.title);
        setDescription(res.gallery.description);
        setBrandName(res.gallery.brandName);
        setBrandUrl(res.gallery.brandUrl);
        setLayout(res.gallery.layout);
        setTheme(res.gallery.theme);
        setCoverFileId(res.gallery.coverFileId || '');
        setAllowDownload(res.gallery.allowDownload);
        setAllowLikes(res.gallery.allowLikes);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load gallery settings.');
      } finally {
        setLoading(false);
      }
    },
    [slug]
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

  const likedItems = useMemo(() => {
    if (!data) return [];
    return data.items
      .filter((item) => (data.likeCounts[item.id] || 0) > 0)
      .sort((a, b) => (data.likeCounts[b.id] || 0) - (data.likeCounts[a.id] || 0));
  }, [data]);

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
      setNewPassword('');
      setClearPassword(false);
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
                `"${item.name.replace(/"/g, '""')}","${item.folderPath.replace(/"/g, '""')}",${
                  data?.likeCounts[item.id] || 0
                },${item.kind}`
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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              aria-label="Back to home"
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-stone-200 hover:bg-stone-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
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

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        {toast && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
          >
            {toast}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {/* Settings Form */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-2xs">
          <h2 className="text-base font-semibold">Gallery Settings</h2>
          <form onSubmit={handleSave} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="m-title" className="block text-xs font-medium text-slate-700">
                Title
              </label>
              <input
                id="m-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 px-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="m-brand" className="block text-xs font-medium text-slate-700">
                Brand Name
              </label>
              <input
                id="m-brand"
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 px-3 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="m-desc" className="block text-xs font-medium text-slate-700">
                Description
              </label>
              <input
                id="m-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 px-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="m-url" className="block text-xs font-medium text-slate-700">
                Brand Website URL
              </label>
              <input
                id="m-url"
                type="url"
                value={brandUrl}
                onChange={(e) => setBrandUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 px-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="m-layout" className="block text-xs font-medium text-slate-700">
                  Layout
                </label>
                <select
                  id="m-layout"
                  value={layout}
                  onChange={(e) => setLayout(e.target.value as GalleryLayout)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 px-3 text-sm"
                >
                  <option value="masonry">Masonry</option>
                  <option value="justified">Justified</option>
                  <option value="grid">Grid</option>
                </select>
              </div>
              <div>
                <label htmlFor="m-theme" className="block text-xs font-medium text-slate-700">
                  Theme
                </label>
                <select
                  id="m-theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as GalleryTheme)}
                  className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 px-3 text-sm"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            <div>
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
                className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 px-3 text-sm disabled:bg-stone-100"
              />
              {data.gallery.hasPassword && (
                <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={clearPassword}
                    onChange={(e) => setClearPassword(e.target.checked)}
                  />
                  Remove password protection
                </label>
              )}
            </div>

            <div>
              <label htmlFor="m-cover" className="block text-xs font-medium text-slate-700">
                Cover Image
              </label>
              <select
                id="m-cover"
                value={coverFileId}
                onChange={(e) => setCoverFileId(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-stone-300 px-3 text-sm"
              >
                {data.items.slice(0, 100).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.folderPath ? `${item.folderPath}/${item.name}` : item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-6 sm:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
                Allow downloads
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowLikes}
                  onChange={(e) => setAllowLikes(e.target.checked)}
                  className="h-4 w-4 accent-slate-900"
                />
                Allow client favorites
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-red-200 px-3.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Gallery</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </section>

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
                <div key={item.id} className="overflow-hidden rounded-lg border border-stone-200">
                  <img
                    src={mediaThumbUrl(slug, item.id, 400)}
                    alt={item.name}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="shrink-0 font-semibold text-rose-600">
                      ♥ {data.likeCounts[item.id]}
                    </span>
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
