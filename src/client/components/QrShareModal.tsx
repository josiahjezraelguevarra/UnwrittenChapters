import { useEffect, useRef, useState } from 'react';
import { Download, Printer, QrCode, X } from 'lucide-react';
import {
  downloadSvgMarkup,
  generateQrPngDataUrl,
  generateQrSvg,
  renderShareCardPngDataUrl,
  triggerFileDownload
} from '../lib/qrCard';

interface QrShareModalProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  slug: string;
  title: string;
  brandName?: string;
  hasPassword?: boolean;
}

export function QrShareModal({
  open,
  onClose,
  shareUrl,
  slug,
  title,
  brandName,
  hasPassword
}: QrShareModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [cardTheme, setCardTheme] = useState<'light' | 'dark'>('light');
  const [passwordHint, setPasswordHint] = useState('');
  const [cardPreviewUrl, setCardPreviewUrl] = useState('');
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setRendering(true);
    renderShareCardPngDataUrl({
      url: shareUrl,
      title,
      brandName,
      passwordHint: passwordHint.trim() || undefined,
      theme: cardTheme
    })
      .then((dataUrl) => {
        if (active) setCardPreviewUrl(dataUrl);
      })
      .catch(() => {
        if (active) setCardPreviewUrl('');
      })
      .finally(() => {
        if (active) setRendering(false);
      });
    return () => {
      active = false;
    };
  }, [open, shareUrl, title, brandName, passwordHint, cardTheme]);

  const handleDownloadQrPng = async () => {
    const png = await generateQrPngDataUrl(shareUrl, { width: 1024 });
    triggerFileDownload(png, `${slug}-qr.png`);
  };

  const handleDownloadQrSvg = async () => {
    const svg = await generateQrSvg(shareUrl);
    downloadSvgMarkup(svg, `${slug}-qr.svg`);
  };

  const handleDownloadCard = () => {
    if (!cardPreviewUrl) return;
    triggerFileDownload(cardPreviewUrl, `${slug}-4x6-card.png`);
  };

  const handlePrintCard = () => {
    if (!cardPreviewUrl) return;
    const win = window.open('', '_blank', 'width=720,height=960');
    if (!win) return;
    const doc = win.document;
    doc.title = `${title || slug} Share Card`;
    const style = doc.createElement('style');
    style.textContent =
      '@page{size:4in 6in;margin:0}body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{width:100%;max-width:4in;height:auto;display:block}';
    doc.head.appendChild(style);
    const img = doc.createElement('img');
    img.src = cardPreviewUrl;
    img.alt = 'Gallery Share Card';
    img.onload = () => win.print();
    doc.body.appendChild(img);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="qr-share-modal-title"
      className="m-auto w-[min(94vw,44rem)] rounded-2xl border border-stone-200 bg-white p-0 text-slate-900 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <QrCode className="h-5 w-5 text-slate-800" />
          <div>
            <h2 id="qr-share-modal-title" className="text-base font-bold">
              QR Code &amp; 4×6 Share Card
            </h2>
            <p className="text-xs text-slate-500">
              Generated locally in your browser — download or print for event tables.
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close QR share dialog"
          onClick={onClose}
          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-500 hover:bg-stone-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-12">
        <div className="flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-stone-100/70 p-4 sm:col-span-6">
          {cardPreviewUrl ? (
            <img
              src={cardPreviewUrl}
              alt="4 by 6 printable gallery share card preview"
              className="aspect-[2/3] w-full max-w-[230px] rounded-xl border border-stone-200 bg-white object-contain shadow-md"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full max-w-[230px] items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white text-xs text-slate-400">
              {rendering ? 'Rendering card...' : 'Preview unavailable'}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-4 sm:col-span-6">
          <div className="space-y-4">
            <div>
              <span className="block text-xs font-medium text-slate-700">Card Style</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(
                  [
                    ['light', 'Warm Ivory'],
                    ['dark', 'Dark Slate']
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCardTheme(mode)}
                    className={`min-h-[38px] rounded-xl border px-3 text-xs font-semibold transition ${
                      cardTheme === mode
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-stone-300 bg-white text-slate-700 hover:bg-stone-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="qr-pw-hint" className="block text-xs font-medium text-slate-700">
                Optional Password / Note on Card
              </label>
              <input
                id="qr-pw-hint"
                type="text"
                maxLength={44}
                value={passwordHint}
                onChange={(e) => setPasswordHint(e.target.value)}
                placeholder={
                  hasPassword
                    ? 'Type gallery password to print on card'
                    : 'e.g. Table card or Wi-Fi note'
                }
                className="uc-input mt-1 text-xs"
              />
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-[11px] font-medium text-slate-500 uppercase">Target Link</p>
              <p className="mt-0.5 truncate font-mono text-xs text-slate-800">{shareUrl}</p>
            </div>
          </div>

          <div className="space-y-2 border-t border-stone-200 pt-4">
            <button
              type="button"
              disabled={!cardPreviewUrl || rendering}
              onClick={handleDownloadCard}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>Download Printable 4×6 Card (.png)</span>
            </button>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleDownloadQrPng}
                className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-stone-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-stone-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>QR .png</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadQrSvg}
                className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-stone-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-stone-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>QR .svg</span>
              </button>
              <button
                type="button"
                disabled={!cardPreviewUrl || rendering}
                onClick={handlePrintCard}
                className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-stone-300 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-stone-50 disabled:opacity-50"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
