import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { FONT_PRESETS, resolveGalleryThemeTokens } from '../../shared/customization';
import type { PublicGalleryConfig } from '../../shared/types';
import { ApiError, unlockGallery } from '../lib/api';

interface GalleryLockScreenProps {
  slug: string;
  gallery: PublicGalleryConfig;
  onUnlocked: () => Promise<void> | void;
}

export function GalleryLockScreen({ slug, gallery, onUnlocked }: GalleryLockScreenProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  const tokens = resolveGalleryThemeTokens(gallery);
  const fontMeta = FONT_PRESETS[gallery.fontPreset || 'sans'];

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    setUnlocking(true);
    try {
      await unlockGallery(slug, passwordInput);
      setPasswordInput('');
      await onUnlocked();
    } catch (err) {
      setUnlockError(err instanceof ApiError ? err.message : 'Incorrect password.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 transition-colors"
      style={{
        backgroundColor: tokens.bg,
        color: tokens.fg,
        fontFamily: fontMeta.bodyFamily
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-sm"
        style={{
          borderColor: tokens.border,
          backgroundColor: tokens.surface
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              backgroundColor: tokens.accentSoftBg,
              color: tokens.accent
            }}
          >
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold" style={{ fontFamily: fontMeta.headingFamily }}>
              {gallery.title}
            </h1>
            <p className="text-xs" style={{ color: tokens.mutedFg }}>
              {gallery.brandName ? `By ${gallery.brandName} · ` : ''}
              Password required
            </p>
          </div>
        </div>

        <form onSubmit={handleUnlock} className="mt-5 space-y-3">
          <label htmlFor="unlock-pass" className="block text-sm font-medium">
            Enter Gallery Password
          </label>
          <input
            id="unlock-pass"
            type="password"
            required
            autoFocus
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
            className="min-h-[44px] w-full rounded-xl border px-3.5 text-sm focus:outline-none"
            style={{
              borderColor: tokens.border,
              backgroundColor: tokens.bg,
              color: tokens.fg
            }}
          />
          {unlockError && (
            <p role="alert" className="text-sm text-red-500">
              {unlockError}
            </p>
          )}
          <button
            type="submit"
            disabled={unlocking}
            className="min-h-[44px] w-full rounded-xl px-4 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: tokens.accent,
              color: tokens.accentFg,
              borderColor: tokens.accent
            }}
          >
            {unlocking ? 'Unlocking...' : 'Open Gallery'}
          </button>
        </form>
      </div>
    </main>
  );
}
