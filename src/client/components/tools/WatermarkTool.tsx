import { useEffect, useState, type ChangeEvent } from 'react';
import { Download, Image as ImageIcon, Loader2, Stamp, Upload } from 'lucide-react';
import {
  canvasToBlob,
  exportBlobs,
  loadImageFromFile,
  outputMimeAndExt,
  replaceFileExt
} from '../../lib/canvasTools';

type Placement = 'br' | 'bl' | 'tr' | 'tl' | 'center' | 'tiled';

const MAX_FILES = 40;

const PLACEMENT_OPTIONS: Array<{ id: Placement; label: string }> = [
  { id: 'br', label: 'Bottom Right' },
  { id: 'bl', label: 'Bottom Left' },
  { id: 'tr', label: 'Top Right' },
  { id: 'tl', label: 'Top Left' },
  { id: 'center', label: 'Center' },
  { id: 'tiled', label: 'Tiled Grid' }
];

function paintWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: {
    text: string;
    logoImg: HTMLImageElement | null;
    placement: Placement;
    opacity: number;
    scalePct: number;
    color: string;
  }
) {
  ctx.save();
  ctx.globalAlpha = options.opacity;
  const pad = Math.max(24, Math.round(Math.min(width, height) * 0.04));

  if (options.logoImg) {
    const targetW = Math.max(48, Math.round(width * (options.scalePct / 100)));
    const ratio = options.logoImg.naturalHeight / Math.max(1, options.logoImg.naturalWidth);
    const targetH = Math.round(targetW * ratio);

    if (options.placement === 'tiled') {
      const stepX = Math.max(targetW * 1.8, 160);
      const stepY = Math.max(targetH * 2.2, 160);
      for (let y = pad; y < height; y += stepY) {
        for (let x = pad; x < width; x += stepX) {
          ctx.drawImage(options.logoImg, x, y, targetW, targetH);
        }
      }
    } else {
      let x = width - targetW - pad;
      let y = height - targetH - pad;
      if (options.placement === 'bl') x = pad;
      else if (options.placement === 'tr') y = pad;
      else if (options.placement === 'tl') {
        x = pad;
        y = pad;
      } else if (options.placement === 'center') {
        x = (width - targetW) / 2;
        y = (height - targetH) / 2;
      }
      ctx.drawImage(options.logoImg, x, y, targetW, targetH);
    }
    ctx.restore();
    return;
  }

  const label = options.text.trim() || '© Studio Proof';
  const fontSize = Math.max(16, Math.round((Math.min(width, height) * options.scalePct) / 220));
  ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`;
  ctx.fillStyle = options.color;
  ctx.shadowColor = options.color === '#ffffff' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)';
  ctx.shadowBlur = Math.max(4, Math.round(fontSize * 0.25));

  if (options.placement === 'tiled') {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textW = Math.max(120, ctx.measureText(label).width);
    const stepX = textW + fontSize * 3;
    const stepY = fontSize * 5;
    for (let y = fontSize * 2; y < height; y += stepY) {
      for (let x = textW / 2; x < width; x += stepX) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 10);
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
  } else {
    let x = width - pad;
    let y = height - pad;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    if (options.placement === 'bl') {
      x = pad;
      ctx.textAlign = 'left';
    } else if (options.placement === 'tr') {
      y = pad;
      ctx.textBaseline = 'top';
    } else if (options.placement === 'tl') {
      x = pad;
      y = pad;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
    } else if (options.placement === 'center') {
      x = width / 2;
      y = height / 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }
    ctx.fillText(label, x, y);
  }
  ctx.restore();
}

export function WatermarkTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState('© UnwrittenChapters');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [placement, setPlacement] = useState<Placement>('br');
  const [opacity, setOpacity] = useState(0.75);
  const [scalePct, setScalePct] = useState(14);
  const [color, setColor] = useState('#ffffff');
  const [previewUrl, setPreviewUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const handleSelectFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (picked.length > MAX_FILES) {
      setError(`Selected ${picked.length} images — capped at first ${MAX_FILES}.`);
    } else {
      setError('');
    }
    setFiles(picked.slice(0, MAX_FILES));
  };

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrl('');
      return;
    }
    let cancelled = false;
    (async () => {
      const first = await loadImageFromFile(files[0]);
      const logo = logoFile ? await loadImageFromFile(logoFile) : null;
      try {
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(first.img.naturalWidth, first.img.naturalHeight));
        const w = Math.max(1, Math.round(first.img.naturalWidth * scale));
        const h = Math.max(1, Math.round(first.img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(first.img, 0, 0, w, h);
        paintWatermark(ctx, w, h, {
          text,
          logoImg: logo?.img ?? null,
          placement,
          opacity,
          scalePct,
          color
        });
        if (!cancelled) setPreviewUrl(canvas.toDataURL('image/jpeg', 0.88));
      } finally {
        first.revoke();
        logo?.revoke();
      }
    })().catch(() => {
      if (!cancelled) setPreviewUrl('');
    });

    return () => {
      cancelled = true;
    };
  }, [files, text, logoFile, placement, opacity, scalePct, color]);

  const handleExport = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError('');
    const logo = logoFile ? await loadImageFromFile(logoFile).catch(() => null) : null;
    try {
      const results: Array<{ name: string; blob: Blob }> = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(`Watermarking ${i + 1} / ${files.length}...`);
        const loaded = await loadImageFromFile(f);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = loaded.img.naturalWidth;
          canvas.height = loaded.img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas unavailable.');
          ctx.drawImage(loaded.img, 0, 0);
          paintWatermark(ctx, canvas.width, canvas.height, {
            text,
            logoImg: logo?.img ?? null,
            placement,
            opacity,
            scalePct,
            color
          });
          const { mime, ext } = outputMimeAndExt(f.type);
          const blob = await canvasToBlob(canvas, mime, 0.92);
          results.push({ name: replaceFileExt(f.name, ext, '-watermarked'), blob });
        } finally {
          loaded.revoke();
        }
      }
      await exportBlobs(results, 'watermarked-photos.zip');
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch watermark failed.');
      setProgress('');
    } finally {
      logo?.revoke();
      setProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 lg:col-span-5">
        <div className="flex items-center gap-2">
          <Stamp className="h-4 w-4 text-slate-800" />
          <h2 className="text-base font-bold text-slate-900">Batch Watermark (Up to 40 Photos)</h2>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-4 py-6 text-center transition hover:bg-stone-100">
          <Upload className="h-5 w-5 text-slate-600" />
          <span className="mt-2 text-xs font-semibold text-slate-800">
            {files.length > 0 ? `${files.length} photo(s) selected` : 'Choose photos to watermark'}
          </span>
          <span className="mt-0.5 text-[11px] text-slate-500">Processed 100% locally on your device</span>
          <input type="file" accept="image/*" multiple onChange={handleSelectFiles} className="sr-only" />
        </label>

        <div>
          <label htmlFor="wm-text" className="block text-xs font-medium text-slate-700">
            Watermark Text (used when no PNG logo is selected)
          </label>
          <input
            id="wm-text"
            type="text"
            maxLength={60}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="uc-input mt-1 text-xs"
          />
        </div>

        <div>
          <label htmlFor="wm-logo" className="block text-xs font-medium text-slate-700">
            Optional PNG Logo Overlay
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="wm-logo"
              type="file"
              accept="image/png,image/webp,image/svg+xml"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-200 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-800"
            />
            {logoFile && (
              <button
                type="button"
                onClick={() => setLogoFile(null)}
                className="shrink-0 text-xs font-medium text-red-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-700">Placement</span>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {PLACEMENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPlacement(opt.id)}
                className={`min-h-[34px] rounded-lg border px-2 text-xs font-medium transition ${
                  placement === opt.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-stone-300 bg-white text-slate-700 hover:bg-stone-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="wm-opacity" className="block text-xs font-medium text-slate-700">
              Opacity ({Math.round(opacity * 100)}%)
            </label>
            <input
              id="wm-opacity"
              type="range"
              min={0.15}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="mt-2 w-full accent-slate-900"
            />
          </div>
          <div>
            <label htmlFor="wm-scale" className="block text-xs font-medium text-slate-700">
              Size ({scalePct}%)
            </label>
            <input
              id="wm-scale"
              type="range"
              min={6}
              max={35}
              step={1}
              value={scalePct}
              onChange={(e) => setScalePct(Number(e.target.value))}
              className="mt-2 w-full accent-slate-900"
            />
          </div>
        </div>

        {!logoFile && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-700">Text Ink:</span>
            {[
              ['#ffffff', 'White'],
              ['#141311', 'Dark Ink']
            ].map(([hex, label]) => (
              <button
                key={hex}
                type="button"
                onClick={() => setColor(hex)}
                className={`min-h-[32px] rounded-lg border px-3 text-xs font-medium ${
                  color === hex ? 'border-slate-900 bg-slate-900 text-white' : 'border-stone-300 bg-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-xs font-medium text-red-600">{error}</p>}

        <button
          type="button"
          disabled={files.length === 0 || processing}
          onClick={() => void handleExport()}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{progress || 'Processing...'}</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>{files.length > 1 ? `Download ZIP (${files.length})` : 'Download Watermarked'}</span>
            </>
          )}
        </button>
      </div>

      <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-100/70 p-4 lg:col-span-7">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Watermarked preview"
            className="max-h-[460px] w-auto rounded-xl border border-stone-200 object-contain shadow-sm"
          />
        ) : (
          <div className="text-center text-slate-400">
            <ImageIcon className="mx-auto h-10 w-10 opacity-50" />
            <p className="mt-2 text-xs">Select photos to preview watermark placement</p>
          </div>
        )}
      </div>
    </div>
  );
}
