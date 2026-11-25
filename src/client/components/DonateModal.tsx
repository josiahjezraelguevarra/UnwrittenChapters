import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Heart, QrCode, X } from 'lucide-react';
import { DONATE_QR_OPTIONS } from '../config/donate';

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
  appName: string;
  donateUrl: string;
}

export function DonateModal({ open, onClose, appName, donateUrl }: DonateModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  const availableQrs = DONATE_QR_OPTIONS.filter((opt) => !failedImages[opt.id]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="donate-modal-title"
      className="m-auto w-[min(92vw,34rem)] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <h2 id="donate-modal-title" className="text-lg font-semibold">
                Support {appName}
              </h2>
              <p className="text-sm text-slate-500">
                100% free, no accounts, kept alive by community tips.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close donation dialog"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {availableQrs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {availableQrs.map((qr) => (
                <div
                  key={qr.id}
                  className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"
                >
                  <img
                    src={qr.imagePath}
                    alt={`${qr.label} donation QR code`}
                    className="h-44 w-44 rounded-lg bg-white object-contain p-2 shadow-sm"
                    onError={() =>
                      setFailedImages((prev) => ({
                        ...prev,
                        [qr.id]: true
                      }))
                    }
                  />
                  <p className="mt-2.5 text-sm font-semibold text-slate-900">{qr.label}</p>
                  {qr.hint && <p className="text-xs text-slate-500">{qr.hint}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <QrCode className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-800">
                Donation QR codes will appear here soon
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Owner tip: Drop your QR images into <code>public/qr/</code> (e.g.{' '}
                <code>gcash.png</code>, <code>maya.png</code>) and they will display here
                automatically.
              </p>
            </div>
          )}

          {donateUrl && (
            <a
              href={donateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <span>Open Donation Page</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </dialog>
  );
}
