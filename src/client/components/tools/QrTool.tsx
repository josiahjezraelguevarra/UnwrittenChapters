import { useEffect, useState } from 'react';
import { Download, Printer, QrCode } from 'lucide-react';
import {
  downloadSvgMarkup,
  generateQrPngDataUrl,
  generateQrSvg,
  renderShareCardPngDataUrl,
  triggerFileDownload
} from '../../lib/qrCard';

export function QrTool() {
  const [url, setUrl] = useState('https://unwrittenchapters.website');
  const [title, setTitle] = useState('Summer Wedding Gallery');
  const [brandName, setBrandName] = useState('Studio Lumiere');
  const [passwordHint, setPasswordHint] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [previewUrl, setPreviewUrl] = useState('');

  const cleanUrl = url.trim() || 'https://unwrittenchapters.website';

  useEffect(() => {
    let active = true;
    renderShareCardPngDataUrl({
      url: cleanUrl,
      title: title.trim() || 'Photo Gallery',
      brandName: brandName.trim() || undefined,
      passwordHint: passwordHint.trim() || undefined,
      theme
    })
      .then((res) => {
        if (active) setPreviewUrl(res);
      })
      .catch(() => {
        if (active) setPreviewUrl('');
      });
    return () => {
      active = false;
    };
  }, [cleanUrl, title, brandName, passwordHint, theme]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 lg:col-span-5">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-slate-800" />
          <h2 className="text-base font-bold text-slate-900">QR Code &amp; 4×6 Print Card</h2>
        </div>

        <div>
          <label htmlFor="tool-qr-url" className="block text-xs font-medium text-slate-700">
            Destination URL
          </label>
          <input
            id="tool-qr-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="uc-input mt-1 text-xs"
          />
        </div>

        <div>
          <label htmlFor="tool-qr-title" className="block text-xs font-medium text-slate-700">
            Card Title
          </label>
          <input
            id="tool-qr-title"
            type="text"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="uc-input mt-1 text-xs"
          />
        </div>

        <div>
          <label htmlFor="tool-qr-brand" className="block text-xs font-medium text-slate-700">
            Studio / Host Name
          </label>
          <input
            id="tool-qr-brand"
            type="text"
            maxLength={40}
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="uc-input mt-1 text-xs"
          />
        </div>

        <div>
          <label htmlFor="tool-qr-note" className="block text-xs font-medium text-slate-700">
            Optional Password / Table Note
          </label>
          <input
            id="tool-qr-note"
            type="text"
            maxLength={44}
            value={passwordHint}
            onChange={(e) => setPasswordHint(e.target.value)}
            placeholder="Optional hint or passphrase"
            className="uc-input mt-1 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['light', 'Warm Ivory'],
              ['dark', 'Dark Slate']
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              className={`min-h-[38px] rounded-xl border text-xs font-semibold ${
                theme === mode
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-stone-300 bg-white text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            disabled={!previewUrl}
            onClick={() => triggerFileDownload(previewUrl, 'gallery-4x6-card.png')}
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Download 4×6 Print Card (.png)</span>
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={async () =>
                triggerFileDownload(await generateQrPngDataUrl(cleanUrl), 'gallery-qr.png')
              }
              className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-slate-700 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>QR .png</span>
            </button>
            <button
              type="button"
              onClick={async () =>
                downloadSvgMarkup(await generateQrSvg(cleanUrl), 'gallery-qr.svg')
              }
              className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-slate-700 hover:bg-stone-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>QR .svg</span>
            </button>
            <button
              type="button"
              disabled={!previewUrl}
              onClick={() => {
                if (!previewUrl) return;
                const win = window.open('', '_blank', 'width=720,height=960');
                if (!win) return;
                const doc = win.document;
                doc.title = 'Share Card';
                const img = doc.createElement('img');
                img.src = previewUrl;
                img.style.maxWidth = '4in';
                img.onload = () => win.print();
                doc.body.appendChild(img);
              }}
              className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-slate-700 hover:bg-stone-50 disabled:opacity-50"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-100/70 p-6 lg:col-span-7">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="4x6 printable QR card preview"
            className="aspect-[2/3] w-full max-w-[270px] rounded-xl border border-stone-200 bg-white object-contain shadow-md"
          />
        )}
      </div>
    </div>
  );
}
