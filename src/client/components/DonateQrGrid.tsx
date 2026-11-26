import { useState } from 'react';
import { ExternalLink, QrCode } from 'lucide-react';
import { DONATE_QR_OPTIONS } from '../config/donate';

interface DonateQrGridProps {
  donateUrl?: string;
  variant?: 'modal' | 'page';
  dark?: boolean;
}

export function DonateQrGrid({
  donateUrl = '',
  variant = 'modal',
  dark = false
}: DonateQrGridProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const availableQrs = DONATE_QR_OPTIONS.filter((opt) => !failedImages[opt.id]);
  const primaryQr = availableQrs[0] ?? null;

  return (
    <div className={variant === 'modal' ? 'space-y-4 text-center' : 'space-y-5'}>
      {primaryQr ? (
        <div
          className={`flex flex-col items-center rounded-2xl border p-5 text-center shadow-2xs ${
            variant === 'page' ? 'max-w-sm' : 'w-full'
          } ${
            dark
              ? 'border-[#f4f1ea]/15 bg-[#1b1a17] text-[#f4f1ea]'
              : 'border-[#141311]/12 bg-white text-[#141311]'
          }`}
        >
          <span
            className={`mb-3 font-mono text-[11px] tracking-widest uppercase ${
              dark ? 'text-[#f4f1ea]/55' : 'text-[#141311]/50'
            }`}
          >
            {primaryQr.label} QR
          </span>

          <div className="rounded-xl border border-stone-200/90 bg-white p-3 shadow-2xs">
            <img
              src={primaryQr.imagePath}
              alt={`${primaryQr.label} donation QR code`}
              className={
                variant === 'modal'
                  ? 'h-60 w-60 object-contain sm:h-64 sm:w-64'
                  : 'h-52 w-52 object-contain sm:h-56 sm:w-56'
              }
              onError={() =>
                setFailedImages((prev) => ({
                  ...prev,
                  [primaryQr.id]: true
                }))
              }
            />
          </div>

          <p className="mt-3 text-sm font-semibold tracking-tight">{primaryQr.label}</p>
          {primaryQr.hint && (
            <p className={`mt-0.5 text-xs ${dark ? 'text-[#f4f1ea]/60' : 'text-[#141311]/60'}`}>
              {primaryQr.hint}
            </p>
          )}
        </div>
      ) : (
        <div
          className={`rounded-xl border border-dashed p-6 text-center ${
            dark
              ? 'border-[#f4f1ea]/20 bg-[#1b1a17] text-[#f4f1ea]'
              : 'border-[#141311]/20 bg-[#f8f6f2] text-[#141311]'
          }`}
        >
          <QrCode className="mx-auto h-8 w-8 opacity-45" />
          <p className="mt-2 text-sm font-medium">Maya QR code unavailable</p>
          <p className="mt-1 text-xs opacity-65">
            Place <code>public/qr/maya.png</code> to display the Maya QR code.
          </p>
        </div>
      )}

      {donateUrl && (
        <a
          href={donateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition sm:w-auto ${
            dark
              ? 'bg-[#f4f1ea] text-[#141311] hover:bg-[#e5e0d5]'
              : 'bg-[#141311] text-[#f8f6f2] hover:bg-[#2a2824]'
          }`}
        >
          <span>Open Online Tip Page</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}
