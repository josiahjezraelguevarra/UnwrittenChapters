import { ArrowLeft, Cookie, FileText, Mail, ShieldCheck } from 'lucide-react';
import { SUPPORT_EMAIL, buildSupportMailto } from '../../shared/contact';
import type { AppPublicConfig } from '../../shared/types';
import { usePageSeo } from '../lib/seo';

export type LegalDocKind = 'privacy' | 'terms';

interface LegalPageProps {
  kind: LegalDocKind;
  config: AppPublicConfig;
  dark?: boolean;
  onNavigate: (path: string) => void;
  onOpenCookieSettings?: () => void;
}

const LAST_UPDATED = 'November 28, 2026';

export function LegalPage({
  kind,
  config,
  dark = false,
  onNavigate,
  onOpenCookieSettings
}: LegalPageProps) {
  const isPrivacy = kind === 'privacy';

  usePageSeo({
    title: isPrivacy
      ? `Data Privacy Policy — ${config.appName}`
      : `Terms of Use — ${config.appName}`,
    description: isPrivacy
      ? `How ${config.appName} handles Google Drive gallery metadata, essential cookies, browser storage, and zero-account privacy.`
      : `Terms of Use for creating and viewing Google Drive galleries and using browser photo tools on ${config.appName}.`,
    robots: 'index, follow',
    canonicalPath: isPrivacy ? '/privacy' : '/terms'
  });

  const borderRule = dark ? 'border-[#f4f1ea]/12' : 'border-[#141311]/12';
  const cardSurface = dark
    ? 'border-[#f4f1ea]/12 bg-[#181714]'
    : 'border-[#141311]/12 bg-white';
  const mutedText = dark ? 'text-[#f4f1ea]/60' : 'text-[#141311]/60';
  const bodyText = dark ? 'text-[#f4f1ea]/80' : 'text-[#141311]/78';
  const sectionHeadingClass = `uc-font-serif text-lg font-semibold tracking-tight sm:text-xl ${
    dark ? 'text-[#f4f1ea]' : 'text-[#141311]'
  }`;

  return (
    <div
      className={`uc-font-sans min-h-screen pb-16 transition-colors ${
        dark ? 'bg-[#12110f] text-[#f4f1ea]' : 'bg-[#f8f6f2] text-[#141311]'
      }`}
    >
      <header
        className={`sticky top-0 z-20 border-b backdrop-blur-md transition-colors ${
          dark
            ? 'border-[#f4f1ea]/12 bg-[#12110f]/92'
            : 'border-[#141311]/12 bg-[#f8f6f2]/92'
        }`}
      >
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="flex min-w-0 items-center gap-2 sm:gap-2.5"
            >
              <img
                src="/logo.svg"
                alt=""
                className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8"
              />
              <span className="uc-font-serif truncate text-base font-semibold tracking-tight sm:text-lg">
                {config.appName}
              </span>
            </a>
          </div>

          <nav aria-label="Legal documents" className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition ${
                dark
                  ? 'border-[#f4f1ea]/18 bg-[#1b1a17] text-[#f4f1ea] hover:bg-[#24221e]'
                  : 'border-[#141311]/15 bg-white text-[#141311] hover:bg-stone-100'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Home</span>
            </button>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/privacy');
              }}
              aria-current={isPrivacy ? 'page' : undefined}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ${
                isPrivacy
                  ? dark
                    ? 'bg-[#f4f1ea] text-[#141311]'
                    : 'bg-[#141311] text-[#f8f6f2]'
                  : dark
                    ? 'text-[#f4f1ea]/75 hover:bg-[#f4f1ea]/10'
                    : 'text-[#141311]/75 hover:bg-[#141311]/5'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Data Privacy</span>
            </a>
            <a
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/terms');
              }}
              aria-current={!isPrivacy ? 'page' : undefined}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ${
                !isPrivacy
                  ? dark
                    ? 'bg-[#f4f1ea] text-[#141311]'
                    : 'bg-[#141311] text-[#f8f6f2]'
                  : dark
                    ? 'text-[#f4f1ea]/75 hover:bg-[#f4f1ea]/10'
                    : 'text-[#141311]/75 hover:bg-[#141311]/5'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Terms of Use</span>
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className={`border-b pb-6 ${borderRule}`}>
          <p className={`uc-font-serif text-sm font-semibold tracking-tight ${mutedText}`}>
            {config.appName}
          </p>
          <h1 className="uc-font-serif mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">
            {isPrivacy ? 'Data Privacy Policy' : 'Terms of Use'}
          </h1>
          <p className={`mt-2 text-xs ${mutedText}`}>Last updated: {LAST_UPDATED}</p>
        </div>

        {isPrivacy ? (
          <div className={`mt-8 space-y-6 text-sm leading-relaxed ${bodyText}`}>
            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>1. Zero-Account Privacy Model</h2>
              <p className="mt-2">
                <span className="uc-font-serif font-semibold">{config.appName}</span> does not
                require user accounts, sign-ups, emails, or passwords to create or view galleries.
                You control access to each gallery through its shared link, optional gallery
                password, and secret Manage link.
              </p>
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>2. Your Photos &amp; Videos Stay on Google Drive</h2>
              <p className="mt-2">
                We do not permanently copy, store, or re-host your image or video files. When you
                connect public Google Drive folders (&ldquo;Anyone with the link &rarr;
                Viewer&rdquo;), <span className="uc-font-serif font-semibold">{config.appName}</span>{' '}
                stores folder references and synced item metadata (file IDs, filenames, MIME types,
                dimensions/duration, and folder paths) so galleries load quickly and cleanly. Media
                bytes are streamed on demand from Google Drive. Unsharing or deleting a file in
                Google Drive removes access automatically.
              </p>
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>3. Information We Store</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Gallery configuration:</strong> Title, optional description, studio/brand
                  name and link, visual layout/theme settings, connected Drive folder IDs, optional
                  expiration date, hashed gallery password (when enabled), and a cryptographic hash
                  of your secret Manage link token.
                </li>
                <li>
                  <strong>Client favorites:</strong> Aggregate like counts and an anonymous visitor
                  identifier so clients can heart and filter their favorite photos.
                </li>
                <li>
                  <strong>Abuse &amp; moderation reports:</strong> Reason, optional details, and
                  gallery slug submitted through the Report Gallery dialog.
                </li>
              </ul>
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>4. Cookies &amp; Browser Storage</h2>
              <p className="mt-2">
                We use <strong>zero advertising or cross-site tracking cookies</strong>. We only use:
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Essential Cookies &amp; Security:</strong> Signed <code>HttpOnly</code>{' '}
                  session cookies for password-unlocked galleries and Manage sessions, Cloudflare
                  Turnstile spam protection (when configured), and your cookie consent choice.
                </li>
                <li>
                  <strong>Optional Browser Storage (<code>localStorage</code>):</strong> Stores your
                  light/dark theme choice, intro animation flag, recent galleries list (secret Manage
                  tokens are never stored in <code>localStorage</code>), and anonymous favorites
                  visitor ID.
                </li>
              </ul>
              {onOpenCookieSettings && (
                <button
                  type="button"
                  onClick={onOpenCookieSettings}
                  className={`mt-4 inline-flex min-h-[38px] items-center gap-2 rounded-full border px-4 text-xs font-semibold transition ${
                    dark
                      ? 'border-[#f4f1ea]/20 hover:bg-[#f4f1ea]/10'
                      : 'border-[#141311]/18 hover:bg-stone-100'
                  }`}
                >
                  <Cookie className="h-3.5 w-3.5" />
                  <span>Manage Cookie Settings</span>
                </button>
              )}
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>5. Browser-Side Photo Tools</h2>
              <p className="mt-2">
                Utilities under <strong>Photo Tools</strong> (Batch Watermark, QR &amp; 4&times;6
                Print Card, EXIF Stripper, and Social Crop &amp; Split) run 100% locally inside your
                browser using Canvas APIs. Files selected in Photo Tools are never uploaded to our
                servers.
              </p>
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>6. Deletion &amp; Contact</h2>
              <p className="mt-2">
                You can permanently delete any gallery (its link, configuration, and likes) at any
                time from its Manage page, or set an automatic expiration. For privacy inquiries or
                takedown requests, email{' '}
                <a
                  href={buildSupportMailto('Data Privacy Inquiry')}
                  className="font-semibold underline underline-offset-2"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>
        ) : (
          <div className={`mt-8 space-y-6 text-sm leading-relaxed ${bodyText}`}>
            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>1. Acceptance of Terms</h2>
              <p className="mt-2">
                By accessing <span className="uc-font-serif font-semibold">{config.appName}</span>,
                creating or viewing a gallery, or using our browser Photo Tools, you agree to these
                Terms of Use. If you do not agree, please discontinue use of the service.
              </p>
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>2. Service Scope &amp; Limitations</h2>
              <p className="mt-2">
                <span className="uc-font-serif font-semibold">{config.appName}</span> is a free
                client-gallery presentation layer for publicly shared Google Drive folders, provided
                on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. Galleries are
                subject to technical limits (such as up to 3 Drive folder links, 3 folder levels, 40
                subfolders, and 2,000 items per gallery), periodic background sync intervals, and
                Google Drive API or hosting availability.
              </p>
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>3. Content Ownership &amp; Responsibility</h2>
              <p className="mt-2">
                You retain full ownership and responsibility for all photos, videos, titles, and
                links you connect to{' '}
                <span className="uc-font-serif font-semibold">{config.appName}</span>. By creating
                a gallery, you confirm that you have the necessary rights and permissions to share
                the linked Google Drive content with your intended viewers.
              </p>
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>4. Acceptable Use</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>
                  Do not share unlawful, infringing, abusive, sexually explicit non-consensual, or
                  harmful content.
                </li>
                <li>
                  Do not attempt to bypass gallery password locks, Turnstile verification, rate
                  limits, or creator download restrictions.
                </li>
                <li>
                  Do not use automated scraping, bulk abuse, or denial-of-service traffic against
                  gallery or media proxy endpoints.
                </li>
              </ul>
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>5. Secret Manage Links &amp; No Recovery</h2>
              <p className="mt-2">
                Because <span className="uc-font-serif font-semibold">{config.appName}</span> uses
                zero accounts, your secret Manage link is the sole credential to edit, rotate
                access, or delete a gallery. We cannot recover lost Manage links. You are
                responsible for bookmarking and safeguarding your Manage link and rotating it if it
                is ever exposed.
              </p>
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>6. Moderation &amp; Disclaimer</h2>
              <p className="mt-2">
                We reserve the right to block or remove galleries that violate these Terms or receive
                verified abuse reports. To the fullest extent permitted by law,{' '}
                <span className="uc-font-serif font-semibold">{config.appName}</span> is provided
                without warranties of any kind and is not liable for Google Drive service
                interruptions, lost Manage links, or any indirect or consequential damages.
              </p>
            </section>

            <section className={`rounded-2xl border p-5 sm:p-6 ${cardSurface}`}>
              <h2 className={sectionHeadingClass}>7. Contact</h2>
              <p className="mt-2">
                Questions about these Terms or reports regarding a gallery can be directed to{' '}
                <a
                  href={buildSupportMailto('Terms of Use Inquiry')}
                  className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>{SUPPORT_EMAIL}</span>
                </a>
                .
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
