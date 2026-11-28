import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Cookie, X } from 'lucide-react';
import { ToggleField } from './ToggleField';

interface CookieConsentBannerProps {
  open: boolean;
  initialPreferences: boolean;
  canDismiss: boolean;
  hasBottomTicker?: boolean;
  onNavigate?: (path: string) => void;
  onSaveConsent: (preferences: boolean) => void;
  onDismiss: () => void;
}

export function CookieConsentBanner({
  open,
  initialPreferences,
  canDismiss,
  hasBottomTicker = false,
  onNavigate,
  onSaveConsent,
  onDismiss
}: CookieConsentBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [preferences, setPreferences] = useState(initialPreferences);

  useEffect(() => {
    if (open) {
      setPreferences(initialPreferences);
      setExpanded(false);
    }
  }, [open, initialPreferences]);

  if (!open) return null;

  return (
    <aside
      role="region"
      aria-label="Cookie and browser storage permission"
      className={`uc-fade-in fixed right-3 left-3 z-40 sm:right-6 sm:left-auto sm:w-[min(92vw,27rem)] ${
        hasBottomTicker ? 'bottom-14' : 'bottom-4'
      }`}
    >
      <div className="rounded-2xl border border-stone-200 bg-white p-4 text-[#141311] shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#141311]/12 bg-stone-50 text-[#141311]">
              <Cookie className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                Cookie &amp; Storage Permission
              </h2>
              <p className="text-[11px] text-[#141311]/60">
                Zero ad or tracking cookies
              </p>
            </div>
          </div>

          {canDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close cookie preferences"
              className="flex min-h-[34px] min-w-[34px] items-center justify-center rounded-lg text-[#141311]/60 transition hover:bg-[#141311]/8 hover:text-[#141311]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#141311]/72">
          We use essential cookies for password-protected galleries, manage sessions, and spam
          protection, plus optional browser storage for theme mode, recent galleries, and likes.{' '}
          {onNavigate && (
            <>
              Read our{' '}
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/privacy');
                }}
                className="font-medium underline underline-offset-2"
              >
                Data Privacy
              </a>{' '}
              and{' '}
              <a
                href="/terms"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/terms');
                }}
                className="font-medium underline underline-offset-2"
              >
                Terms of Use
              </a>
              .
            </>
          )}
        </p>

        {expanded && (
          <div className="mt-3 space-y-2">
            <ToggleField
              label="Essential Cookies & Security"
              description="Unlock & manage sessions, Turnstile checks, and saving this choice."
              checked
              disabled
              onChange={() => undefined}
            />
            <ToggleField
              label="Preferences & Browser Storage"
              description="Remembers theme mode, intro state, recent galleries, and likes ID."
              checked={preferences}
              onChange={setPreferences}
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-2.5 text-xs font-medium text-[#141311]/70 transition hover:bg-[#141311]/8 hover:text-[#141311]"
          >
            <span>{expanded ? 'Hide details' : 'Customize'}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSaveConsent(false)}
              className="min-h-[38px] rounded-full border border-[#141311]/18 px-3.5 text-xs font-semibold text-[#141311] transition hover:bg-[#141311]/5"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={() => onSaveConsent(expanded ? preferences : true)}
              className="min-h-[38px] rounded-full bg-[#141311] px-4 text-xs font-semibold text-white transition hover:bg-[#2a2824]"
            >
              {expanded ? 'Save Preferences' : 'Accept All'}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
