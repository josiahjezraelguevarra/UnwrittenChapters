import { useEffect, useRef } from 'react';
import { Heart, X } from 'lucide-react';
import { DonateQrGrid } from './DonateQrGrid';

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
  appName: string;
  donateUrl: string;
  dark?: boolean;
}

export function DonateModal({
  open,
  onClose,
  appName,
  donateUrl,
  dark = false
}: DonateModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="donate-modal-title"
      className={`m-auto max-h-[90vh] w-[min(92vw,26rem)] overflow-y-auto rounded-2xl border p-0 shadow-2xl ${
        dark
          ? 'border-[#f4f1ea]/15 bg-[#141311] text-[#f4f1ea]'
          : 'border-slate-200 bg-white text-slate-900'
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                dark ? 'bg-[#f4f1ea] text-[#141311]' : 'bg-[#141311] text-[#f8f6f2]'
              }`}
            >
              <Heart className="h-4 w-4" />
            </span>
            <div>
              <h2 id="donate-modal-title" className="text-lg font-semibold">
                Support {appName}
              </h2>
              <p className={`text-xs ${dark ? 'text-[#f4f1ea]/65' : 'text-slate-500'}`}>
                Scan with Maya to leave a tip.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close donation dialog"
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
              dark
                ? 'text-[#f4f1ea]/70 hover:bg-[#f4f1ea]/10 hover:text-[#f4f1ea] focus-visible:outline-[#f4f1ea]'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-900'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6">
          <DonateQrGrid donateUrl={donateUrl} variant="modal" dark={dark} />
        </div>
      </div>
    </dialog>
  );
}
