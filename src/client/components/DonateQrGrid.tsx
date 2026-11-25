import { useEffect, useRef, useState } from 'react';
import { ExternalLink, QrCode, X, ZoomIn } from 'lucide-react';
import { DONATE_QR_OPTIONS, type DonateQrOption } from '../config/donate';

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
  const [enlargedQr, setEnlargedQr] = useState<DonateQrOption | null>(null);
  const zoomDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = zoomDialogRef.current;
    if (!el) return;
    if (enlargedQr && !el.open) el.showModal();
    else if (!enlargedQr && el.open) el.close();
  }, [enlargedQr]);

  const availableQrs = DONATE_QR_OPTIONS.filter((opt) => !failedImages[opt.id]);

  const gridClass =
    variant === 'page'
      ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid grid-cols-1 gap-5 sm:grid-cols-2';

  return (
    <div className="space-y-5">
      {availableQrs.length > 0 ? (
        <div className={gridClass}>
          {availableQrs.map((qr, idx) => (
            <button
              key={qr.id}
              type="button"
              onClick={() => setEnlargedQr(qr)}
              aria-label={`Enlarge ${qr.label} QR code`}
              className={`group flex flex-col items-center rounded-2xl border p-5 text-center shadow-2xs transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                dark
                  ? 'border-[#f4f1ea]/15 bg-[#1b1a17] text-[#f4f1ea] hover:border-[#f4f1ea]/35 focus-visible:outline-[#f4f1ea]'
                  : 'border-[#141311]/12 bg-white text-[#141311] hover:border-[#141311]/30 focus-visible:outline-[#141311]'
              }`}
            >
              <div className="mb-3 flex w-full items-center justify-between gap-2">
                <span
                  className={`font-mono text-[11px] tracking-widest uppercase ${
                    dark ? 'text-[#f4f1ea]/55' : 'text-[#141311]/50'
                  }`}
                >
                  {variant === 'page' ? `0${idx + 1} · ${qr.label}` : qr.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                    dark
                      ? 'bg-[#f4f1ea]/10 text-[#f4f1ea]/80 group-hover:bg-[#f4f1ea]/20'
                      : 'bg-stone-100 text-slate-600 group-hover:bg-stone-200'
                  }`}
                >
                  <ZoomIn className="h-3 w-3" />
                  <span>Enlarge</span>
                </span>
              </div>

              <div className="rounded-xl border border-stone-200/90 bg-white p-2.5 shadow-2xs transition duration-200 group-hover:scale-[1.02]">
                <img
                  src={qr.imagePath}
                  alt={`${qr.label} donation QR code`}
                  className={
                    variant === 'modal'
                      ? 'h-52 w-52 object-contain sm:h-56 sm:w-56'
                      : 'h-48 w-48 object-contain sm:h-52 sm:w-52'
                  }
                  onError={() =>
                    setFailedImages((prev) => ({
                      ...prev,
                      [qr.id]: true
                    }))
                  }
                />
              </div>
              <p className="mt-3 text-sm font-semibold tracking-tight">{qr.label}</p>
              {qr.hint && (
                <p className={`mt-0.5 text-xs ${dark ? 'text-[#f4f1ea]/60' : 'text-[#141311]/60'}`}>
                  {qr.hint}
                </p>
              )}
            </button>
          ))}
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
          <p className="mt-2 text-sm font-medium">Donation QR codes will appear here soon</p>
          <p className="mt-1 text-xs opacity-65">
            Drop QR images into <code>public/qr/</code> (e.g. <code>gotyme.png</code>,{' '}
            <code>maya.png</code>, <code>gcash.png</code>) and they will display automatically.
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

      {/* Enlarged QR Code Dialog */}
      <dialog
        ref={zoomDialogRef}
        onClose={(e) => {
          e.stopPropagation();
          setEnlargedQr(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.target === zoomDialogRef.current) setEnlargedQr(null);
        }}
        aria-labelledby="enlarged-qr-title"
        className={`m-auto w-[min(94vw,30rem)] rounded-2xl border p-6 shadow-2xl ${
          dark
            ? 'border-[#f4f1ea]/15 bg-[#1b1a17] text-[#f4f1ea]'
            : 'border-stone-200 bg-white text-slate-900'
        }`}
      >
        {enlargedQr && (
          <div className="flex flex-col items-center text-center">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="text-left">
                <h3 id="enlarged-qr-title" className="text-lg font-semibold">
                  {enlargedQr.label}
                </h3>
                {enlargedQr.hint && (
                  <p className={`text-xs ${dark ? 'text-[#f4f1ea]/65' : 'text-slate-500'}`}>
                    {enlargedQr.hint}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close enlarged QR code"
                onClick={() => setEnlargedQr(null)}
                className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg transition ${
                  dark
                    ? 'text-[#f4f1ea]/70 hover:bg-[#f4f1ea]/10 hover:text-[#f4f1ea]'
                    : 'text-slate-500 hover:bg-stone-100 hover:text-slate-900'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <img
                src={enlargedQr.imagePath}
                alt={`${enlargedQr.label} enlarged QR code`}
                className="h-[min(72vw,20rem)] w-[min(72vw,20rem)] object-contain"
              />
            </div>

            <p className={`mt-4 text-xs ${dark ? 'text-[#f4f1ea]/60' : 'text-slate-500'}`}>
              Point your banking or e-wallet camera at the code above to scan.
            </p>
          </div>
        )}
      </dialog>
    </div>
  );
}
