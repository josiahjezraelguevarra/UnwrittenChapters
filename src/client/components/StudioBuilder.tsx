import { useState, type FormEvent, type RefObject } from 'react';
import { ArrowRight, Link2, Loader2, Plus, Sparkles, X } from 'lucide-react';
import type { AppPublicConfig } from '../../shared/types';
import {
  ApiError,
  createGallery,
  saveRecentGallery
} from '../lib/api';
import { SupportErrorAlert } from './SupportErrorAlert';
import { TurnstileWidget } from './TurnstileWidget';

interface StudioBuilderProps {
  config: AppPublicConfig;
  builderDark: boolean;
  driveInputRef: RefObject<HTMLInputElement | null>;
  onGalleryCreated: () => void;
  onNavigate: (path: string) => void;
}

export function StudioBuilder({
  config,
  builderDark,
  driveInputRef,
  onGalleryCreated,
  onNavigate
}: StudioBuilderProps) {
  const [driveUrls, setDriveUrls] = useState<string[]>(['']);
  const [allowDownload, setAllowDownload] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const builderMutedText = builderDark ? 'text-[#f4f1ea]/60' : 'text-[#141311]/60';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanedUrls = driveUrls.map((u) => u.trim()).filter(Boolean);
    if (cleanedUrls.length === 0) {
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
        driveUrl: cleanedUrls[0],
        driveUrls: cleanedUrls,
        allowDownload,
        turnstileToken: turnstileToken || undefined
      });

      const hashToken = res.managePath.split('#')[1] || '';

      saveRecentGallery({
        slug: res.slug,
        title: res.gallery.title,
        sharePath: res.sharePath,
        managePath: `/g/${res.slug}/manage`,
        itemCount: res.gallery.itemCount,
        createdAt: res.gallery.createdAt
      });
      onGalleryCreated();

      const targetPath = hashToken
        ? `/g/${res.slug}/manage?created=1#${hashToken}`
        : `${res.managePath}?created=1`;
      onNavigate(targetPath);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not create gallery. Please verify the link and try again.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={`text-sm font-medium ${builderMutedText}`}>
            Gallery builder
          </p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Create a gallery from your Drive link
          </h2>
        </div>
        <p className={`text-[13px] ${builderMutedText}`}>
          Requires folder sharing: <strong className="font-medium">Anyone with the link → Viewer</strong>
        </p>
      </div>

      <div
        className="uc-home-light rounded-2xl border border-[#141311]/15 bg-white p-5 text-[#141311] shadow-sm transition-colors sm:p-7"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="drive-url"
                className="block text-sm font-semibold text-slate-800"
              >
                Public Google Drive Folder Link{driveUrls.length > 1 ? 's' : ''}
              </label>
              {driveUrls.length < 3 && (
                <button
                  type="button"
                  onClick={() => setDriveUrls((prev) => (prev.length < 3 ? [...prev, ''] : prev))}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-950"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add another Drive link (up to 3)</span>
                </button>
              )}
            </div>
            <div className="mt-2 space-y-2.5">
              {driveUrls.map((urlVal, idx) => (
                <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Link2
                      className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      ref={idx === 0 ? driveInputRef : undefined}
                      id={idx === 0 ? 'drive-url' : `drive-url-${idx}`}
                      type="text"
                      required={idx === 0}
                      value={urlVal}
                      onChange={(e) => {
                        const next = [...driveUrls];
                        next[idx] = e.target.value;
                        setDriveUrls(next);
                      }}
                      placeholder={
                        idx === 0
                          ? 'https://drive.google.com/drive/folders/...'
                          : `Extra Drive folder link #${idx + 1} (optional)`
                      }
                      className="uc-input min-h-[48px] py-2.5 pr-3.5 pl-10"
                    />
                  </div>
                  {idx > 0 && (
                    <button
                      type="button"
                      aria-label={`Remove Drive link ${idx + 1}`}
                      onClick={() => setDriveUrls((prev) => prev.filter((_, i) => i !== idx))}
                      className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl border border-stone-300 px-3 text-xs font-medium text-slate-600 hover:bg-stone-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {idx === 0 && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#141311] px-6 py-2.5 text-sm font-semibold text-[#f8f6f2] transition hover:bg-[#2a2824] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Scanning Drive...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Gallery</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50/75 px-3.5 py-2.5">
            <div>
              <p className="text-xs font-semibold text-slate-800">Allow client downloads</p>
              <p className="text-[11px] text-slate-500">
                Enable single-file downloads &amp; ZIP export (turn off for view-only proofing)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={allowDownload}
              aria-label="Allow client downloads"
              onClick={() => setAllowDownload((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                allowDownload ? 'bg-[#141311]' : 'bg-stone-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  allowDownload ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <p className="flex items-center gap-2 text-xs text-[#141311]/60">
            <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span>
              Next step: we&apos;ll scan your folder and open the gallery manager so you can
              customize colors, layout, branding, password &amp; expiration with a live preview of
              your actual photos.
            </span>
          </p>

          {config.turnstileSiteKey && (
            <TurnstileWidget
              siteKey={config.turnstileSiteKey}
              onToken={setTurnstileToken}
              theme="light"
            />
          )}

          {error && <SupportErrorAlert message={error} context="Gallery Creation" />}
        </form>
      </div>
    </div>
  );
}
