import { useState, type FormEvent, type RefObject } from 'react';
import { ArrowRight, Link2, Loader2, Sparkles } from 'lucide-react';
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
  const [driveUrl, setDriveUrl] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const builderMutedText = builderDark ? 'text-[#f4f1ea]/60' : 'text-[#141311]/60';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

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
            <label
              htmlFor="drive-url"
              className="block text-sm font-semibold text-slate-800"
            >
              Public Google Drive Folder Link
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Link2
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={driveInputRef}
                  id="drive-url"
                  type="text"
                  required
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="uc-input min-h-[48px] py-2.5 pr-3.5 pl-10"
                />
              </div>
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
            </div>
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
