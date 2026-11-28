import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  open: boolean;
  itemName: string;
  description: string;
  warningText?: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  dark?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  open,
  itemName,
  description,
  warningText = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  busyLabel = 'Deleting...',
  busy = false,
  dark = false,
  onConfirm,
  onCancel
}: ConfirmDeleteModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        if (!busy) onCancel();
      }}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current && !busy) onCancel();
      }}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={`m-auto w-[min(92vw,27rem)] rounded-2xl border p-0 shadow-2xl ${
        dark
          ? 'border-[#f4f1ea]/15 bg-[#141311] text-[#f4f1ea]'
          : 'border-stone-200 bg-white text-slate-900'
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                dark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h2 id={titleId} className="text-base leading-snug font-bold sm:text-lg">
              Are you sure you want to delete &ldquo;{itemName}&rdquo;?
            </h2>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className={`flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-lg transition disabled:opacity-50 ${
              dark
                ? 'text-[#f4f1ea]/65 hover:bg-[#f4f1ea]/10 hover:text-[#f4f1ea]'
                : 'text-slate-400 hover:bg-stone-100 hover:text-slate-700'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p
          id={descId}
          className={`mt-3 text-sm leading-relaxed ${
            dark ? 'text-[#f4f1ea]/75' : 'text-slate-600'
          }`}
        >
          {description}
        </p>

        <div
          role="alert"
          className={`mt-3.5 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
            dark
              ? 'border-red-500/30 bg-red-500/12 text-red-300'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{warningText}</span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={`min-h-[40px] rounded-xl border px-4 text-sm font-medium transition disabled:opacity-50 ${
              dark
                ? 'border-[#f4f1ea]/20 text-[#f4f1ea] hover:bg-[#f4f1ea]/10'
                : 'border-stone-300 text-slate-700 hover:bg-stone-100'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="min-h-[40px] rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
