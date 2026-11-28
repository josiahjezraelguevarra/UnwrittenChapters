import {
  AlertTriangle,
  ArrowLeft,
  CameraOff,
  Clock,
  Home,
  ImageOff,
  Mail,
  Plus,
  RefreshCw,
  ShieldAlert,
  Wand2
} from 'lucide-react';
import { SUPPORT_EMAIL, buildSupportMailto } from '../../shared/contact';

export type StatusErrorVariant = 'not-found' | 'expired' | 'blocked' | 'error';
export type StatusActionIcon = 'home' | 'create' | 'back' | 'retry' | 'tools';

interface StatusAction {
  label: string;
  onClick: () => void;
  icon?: StatusActionIcon;
}

interface StatusErrorPageProps {
  code?: string;
  variant?: StatusErrorVariant;
  title: string;
  message: string;
  appName?: string;
  dark?: boolean;
  supportContext?: string;
  onNavigateHome?: () => void;
  primaryAction: StatusAction;
  secondaryAction?: StatusAction;
}

function renderActionIcon(icon?: StatusActionIcon) {
  switch (icon) {
    case 'home':
      return <Home className="h-4 w-4" />;
    case 'create':
      return <Plus className="h-4 w-4" />;
    case 'back':
      return <ArrowLeft className="h-4 w-4" />;
    case 'retry':
      return <RefreshCw className="h-4 w-4" />;
    case 'tools':
      return <Wand2 className="h-4 w-4" />;
    default:
      return null;
  }
}

export function StatusErrorPage({
  code = '404',
  variant = 'not-found',
  title,
  message,
  appName = 'UnwrittenChapters',
  dark = false,
  supportContext,
  onNavigateHome,
  primaryAction,
  secondaryAction
}: StatusErrorPageProps) {
  const CenterIcon =
    variant === 'expired'
      ? Clock
      : variant === 'blocked'
        ? ShieldAlert
        : variant === 'error'
          ? AlertTriangle
          : code === '404'
            ? ImageOff
            : CameraOff;

  const badgeTone =
    variant === 'blocked' || variant === 'error'
      ? dark
        ? 'border-amber-400/30 bg-amber-500/15 text-amber-300'
        : 'border-amber-300/70 bg-amber-50 text-amber-700'
      : variant === 'expired'
        ? dark
          ? 'border-orange-400/30 bg-orange-500/15 text-orange-300'
          : 'border-orange-200 bg-orange-50 text-orange-700'
        : dark
          ? 'border-[#f4f1ea]/18 bg-[#f4f1ea]/10 text-[#f4f1ea]'
          : 'border-[#141311]/15 bg-white text-[#141311]';

  const cardSurface = dark
    ? 'border-[#f4f1ea]/14 bg-[#191815] text-[#f4f1ea]'
    : 'border-[#141311]/12 bg-white text-[#141311]';
  const sideCardSurface = dark
    ? 'border-[#f4f1ea]/10 bg-[#211f1b]'
    : 'border-[#141311]/10 bg-[#f1ede5]';

  return (
    <div
      className={`uc-font-sans flex min-h-screen flex-col transition-colors ${
        dark ? 'bg-[#12110f] text-[#f4f1ea]' : 'bg-[#f8f6f2] text-[#141311]'
      }`}
    >
      {onNavigateHome && (
        <header
          className={`border-b ${
            dark ? 'border-[#f4f1ea]/12 bg-[#12110f]/90' : 'border-[#141311]/10 bg-[#f8f6f2]/90'
          }`}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="flex items-center gap-2.5"
            >
              <img src="/logo.svg" alt="" className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8" />
              <span className="uc-font-serif text-lg font-semibold tracking-tight sm:text-xl">
                {appName}
              </span>
            </a>
          </div>
        </header>
      )}

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${
            dark ? 'bg-[#f4f1ea]/[0.04]' : 'bg-amber-900/[0.05]'
          }`}
        />

        <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
          {/* Animated Editorial Photo Frame Stack */}
          <div
            aria-hidden="true"
            className="uc-stagger-1 relative mb-7 flex h-40 w-56 items-center justify-center"
          >
            {/* Left tilted background frame */}
            <div
              className={`uc-float-slow absolute top-4 left-3 h-28 w-24 rounded-2xl border p-2 shadow-sm ${sideCardSurface}`}
            >
              <div
                className={`h-16 w-full rounded-lg ${
                  dark ? 'bg-[#f4f1ea]/8' : 'bg-[#141311]/6'
                }`}
              />
              <div
                className={`mt-2 h-1.5 w-12 rounded-full ${
                  dark ? 'bg-[#f4f1ea]/15' : 'bg-[#141311]/12'
                }`}
              />
            </div>

            {/* Right tilted background frame */}
            <div
              className={`uc-float-delayed absolute top-4 right-3 h-28 w-24 rounded-2xl border p-2 shadow-sm ${sideCardSurface}`}
            >
              <div
                className={`h-16 w-full rounded-lg ${
                  dark ? 'bg-[#f4f1ea]/8' : 'bg-[#141311]/6'
                }`}
              />
              <div
                className={`mt-2 h-1.5 w-10 rounded-full ${
                  dark ? 'bg-[#f4f1ea]/15' : 'bg-[#141311]/12'
                }`}
              />
            </div>

            {/* Center foreground viewfinder frame */}
            <div
              className={`relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-2xl border p-3 shadow-xl ${cardSurface}`}
            >
              <span
                className={`uc-pulse-ring absolute inset-2 rounded-xl border border-dashed ${
                  dark ? 'border-[#f4f1ea]/15' : 'border-[#141311]/15'
                }`}
              />
              <span
                className={`relative flex h-12 w-12 items-center justify-center rounded-xl border ${badgeTone}`}
              >
                <CenterIcon className="h-5 w-5" />
              </span>
              <span className="uc-font-mono relative mt-2 text-[11px] font-semibold tracking-widest uppercase opacity-65">
                {code}
              </span>
            </div>
          </div>

          <div className="uc-stagger-2 space-y-2.5">
            <h1 className="uc-font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p
              className={`mx-auto max-w-[42ch] text-sm leading-relaxed sm:text-base ${
                dark ? 'text-[#f4f1ea]/72' : 'text-[#141311]/68'
              }`}
            >
              {message}
            </p>
          </div>

          <div className="uc-stagger-3 mt-7 flex flex-wrap items-center justify-center gap-3">
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 text-sm font-medium transition active:scale-[0.98] ${
                  dark
                    ? 'border-[#f4f1ea]/22 bg-[#1b1a17] text-[#f4f1ea] hover:bg-[#252320]'
                    : 'border-[#141311]/18 bg-white text-[#141311] hover:bg-stone-100'
                }`}
              >
                {renderActionIcon(secondaryAction.icon)}
                <span>{secondaryAction.label}</span>
              </button>
            )}
            <button
              type="button"
              onClick={primaryAction.onClick}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-6 text-sm font-semibold shadow-sm transition active:scale-[0.98] ${
                dark
                  ? 'bg-[#f4f1ea] text-[#141311] hover:bg-[#e5e0d5]'
                  : 'bg-[#141311] text-[#f8f6f2] hover:bg-[#2a2824]'
              }`}
            >
              {renderActionIcon(primaryAction.icon)}
              <span>{primaryAction.label}</span>
            </button>
          </div>

          {supportContext && (
            <div
              className={`uc-stagger-3 mt-7 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs ${
                dark
                  ? 'border-[#f4f1ea]/12 bg-[#191815] text-[#f4f1ea]/65'
                  : 'border-[#141311]/10 bg-white/80 text-[#141311]/65'
              }`}
            >
              <Mail className="h-3.5 w-3.5 shrink-0 opacity-75" />
              <span>Experiencing a problem? Contact</span>
              <a
                href={buildSupportMailto(supportContext)}
                className={`font-semibold underline underline-offset-2 ${
                  dark ? 'text-[#f4f1ea]' : 'text-[#141311]'
                }`}
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
