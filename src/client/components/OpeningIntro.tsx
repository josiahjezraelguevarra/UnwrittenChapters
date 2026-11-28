import { useEffect, useState } from 'react';
import { canUsePreferenceStorage } from '../lib/cookieConsent';

export const INTRO_SEEN_KEY = 'uc_intro_seen';

export function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  if (!canUsePreferenceStorage()) return;
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

interface OpeningIntroProps {
  brandText?: string;
  dark?: boolean;
  onComplete: () => void;
}

type IntroPhase = 'typing' | 'skeleton' | 'done';

export function OpeningIntro({
  brandText = 'UnwrittenChapters',
  dark = false,
  onComplete
}: OpeningIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>(() => (hasSeenIntro() ? 'done' : 'typing'));
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (phase === 'done') {
      markIntroSeen();
      onComplete();
      return;
    }

    if (phase === 'typing') {
      if (charCount < brandText.length) {
        const timer = window.setTimeout(() => {
          setCharCount((c) => c + 1);
        }, 62);
        return () => window.clearTimeout(timer);
      }
      const holdTimer = window.setTimeout(() => {
        setPhase('skeleton');
      }, 340);
      return () => window.clearTimeout(holdTimer);
    }

    if (phase === 'skeleton') {
      const revealTimer = window.setTimeout(() => {
        setPhase('done');
      }, 420);
      return () => window.clearTimeout(revealTimer);
    }
  }, [phase, charCount, brandText.length, onComplete]);

  if (phase === 'done') return null;

  const skelPrimary = dark ? 'bg-[#2a2824]' : 'bg-[#e0d9ce]';
  const skelMuted = dark ? 'bg-[#22201c]' : 'bg-[#e8e3da]';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading UnwrittenChapters"
      className={`fixed inset-0 z-50 ${
        dark ? 'bg-[#12110f] text-[#f4f1ea]' : 'bg-[#f8f6f2] text-[#141311]'
      }`}
    >
      {phase === 'typing' ? (
        <div className="flex h-full flex-col justify-between px-6 py-8 sm:px-10">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium opacity-60">
              Client galleries from Google Drive
            </span>
            <button
              type="button"
              onClick={() => setPhase('done')}
              className={`min-h-[38px] rounded-full border px-3.5 text-[13px] font-medium transition ${
                dark
                  ? 'border-[#f4f1ea]/20 text-[#f4f1ea]/75 hover:border-[#f4f1ea]/45 hover:text-[#f4f1ea]'
                  : 'border-[#141311]/15 text-[#141311]/70 hover:border-[#141311]/40 hover:text-[#141311]'
              }`}
            >
              Skip
            </button>
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <img
              src="/logo.svg"
              alt=""
              className="mx-auto mb-4 h-14 w-14 object-contain sm:h-16 sm:w-16"
            />
            <p className="text-sm font-medium opacity-55">
              Zero-account gallery delivery
            </p>
            <p className="uc-font-serif mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">
              <span>{brandText.slice(0, charCount)}</span>
              <span
                aria-hidden="true"
                className={`uc-cursor-blink ml-1 inline-block h-[0.9em] w-[2px] translate-y-[0.08em] ${
                  dark ? 'bg-[#f4f1ea]' : 'bg-[#141311]'
                }`}
              />
            </p>
            <div
              className={`mx-auto mt-6 h-[1px] w-48 overflow-hidden ${
                dark ? 'bg-[#f4f1ea]/15' : 'bg-[#141311]/15'
              }`}
            >
              <div
                className={`h-full transition-all duration-100 ${
                  dark ? 'bg-[#f4f1ea]' : 'bg-[#141311]'
                }`}
                style={{ width: `${Math.round((charCount / brandText.length) * 100)}%` }}
              />
            </div>
          </div>

          <p className="text-center text-[13px] opacity-50">
            Preparing studio workspace...
          </p>
        </div>
      ) : (
        /* Full-Screen Editorial Skeleton Loading Screen */
        <div className="flex h-full min-h-screen flex-col justify-between overflow-hidden px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between">
            <div>
              {/* Navbar skeleton */}
              <div
                className={`flex items-center justify-between border-b pb-4 ${
                  dark ? 'border-[#f4f1ea]/12' : 'border-[#141311]/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 animate-pulse rounded-lg ${skelPrimary}`} />
                  <div className={`h-5 w-36 animate-pulse rounded ${skelMuted}`} />
                </div>
                <div className="hidden items-center gap-3 sm:flex">
                  <div className={`h-4 w-14 animate-pulse rounded ${skelMuted}`} />
                  <div className={`h-4 w-24 animate-pulse rounded ${skelMuted}`} />
                  <div className={`h-4 w-16 animate-pulse rounded ${skelMuted}`} />
                  <div className={`h-9 w-9 animate-pulse rounded-full ${skelMuted}`} />
                  <div className={`h-9 w-24 animate-pulse rounded-full ${skelPrimary}`} />
                </div>
              </div>

              {/* Split Hero Skeleton */}
              <div className="grid grid-cols-1 items-center gap-10 py-12 lg:grid-cols-12 lg:py-16">
                <div className="space-y-5 lg:col-span-6">
                  <div className={`h-3.5 w-56 animate-pulse rounded ${skelMuted}`} />
                  <div className={`h-11 w-full animate-pulse rounded sm:h-14 ${skelPrimary}`} />
                  <div className={`h-11 w-5/6 animate-pulse rounded sm:h-14 ${skelPrimary}`} />
                  <div className={`h-4 w-full animate-pulse rounded ${skelMuted}`} />
                  <div className={`h-4 w-3/4 animate-pulse rounded ${skelMuted}`} />
                  <div className="flex gap-3 pt-2">
                    <div className={`h-12 w-32 animate-pulse rounded-full ${skelPrimary}`} />
                    <div className={`h-12 w-36 animate-pulse rounded-full ${skelMuted}`} />
                  </div>
                </div>

                <div className="lg:col-span-6">
                  <div
                    className={`h-[340px] w-full animate-pulse rounded-2xl border p-4 sm:h-[380px] ${
                      dark ? 'border-[#f4f1ea]/12 bg-[#1b1a17]' : 'border-[#141311]/10 bg-white/80'
                    }`}
                  >
                    <div className={`h-5 w-40 rounded ${skelMuted}`} />
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className={`aspect-[3/4] rounded-lg ${skelPrimary}`} />
                      <div className={`aspect-[4/3] rounded-lg ${skelMuted}`} />
                      <div className={`aspect-[3/4] rounded-lg ${skelPrimary}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Spec strip skeleton */}
              <div
                className={`grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-3 ${
                  dark ? 'border-[#f4f1ea]/12' : 'border-[#141311]/10'
                }`}
              >
                <div className="space-y-2">
                  <div className={`h-3 w-24 animate-pulse rounded ${skelMuted}`} />
                  <div className={`h-4 w-full animate-pulse rounded ${skelMuted}`} />
                </div>
                <div className="space-y-2">
                  <div className={`h-3 w-32 animate-pulse rounded ${skelMuted}`} />
                  <div className={`h-4 w-5/6 animate-pulse rounded ${skelMuted}`} />
                </div>
                <div className="space-y-2">
                  <div className={`h-3 w-28 animate-pulse rounded ${skelMuted}`} />
                  <div className={`h-4 w-4/5 animate-pulse rounded ${skelMuted}`} />
                </div>
              </div>
            </div>

            {/* Bottom Create Builder Skeleton */}
            <div
              className={`mt-8 rounded-2xl border p-6 ${
                dark
                  ? 'border-[#141311]/15 bg-[#f8f6f2]'
                  : 'border-[#f4f1ea]/15 bg-[#191815]'
              }`}
            >
              <div
                className={`h-4 w-48 animate-pulse rounded ${
                  dark ? 'bg-[#141311]/10' : 'bg-[#f4f1ea]/12'
                }`}
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <div
                  className={`h-11 flex-1 animate-pulse rounded-xl ${
                    dark ? 'bg-[#141311]/10' : 'bg-[#f4f1ea]/12'
                  }`}
                />
                <div
                  className={`h-11 w-36 animate-pulse rounded-xl ${
                    dark ? 'bg-[#141311]/15' : 'bg-[#f4f1ea]/22'
                  }`}
                />
              </div>
            </div>

            {/* Bottom Verse Ticker Skeleton Strip */}
            <div
              className={`mt-4 flex items-center gap-3 border-t pt-3 ${
                dark ? 'border-[#f4f1ea]/10' : 'border-[#141311]/10'
              }`}
            >
              <div className={`h-5 w-14 animate-pulse rounded-full ${skelMuted}`} />
              <div className={`h-3.5 flex-1 animate-pulse rounded ${skelMuted}`} />
              <div className={`h-6 w-6 animate-pulse rounded-full ${skelMuted}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
