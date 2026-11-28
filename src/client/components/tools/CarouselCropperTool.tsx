import { useEffect, useState, type ChangeEvent } from 'react';
import { Columns, Download, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import {
  canvasToBlob,
  exportBlobs,
  loadImageFromFile,
  replaceFileExt
} from '../../lib/canvasTools';

type AspectPreset = '3:4' | '4:5' | '1:1' | '9:16' | 'carousel';

const PRESETS: Array<{ id: AspectPreset; label: string; ratio: number }> = [
  { id: '3:4', label: '3:4 Tall', ratio: 3 / 4 },
  { id: '4:5', label: '4:5 Portrait', ratio: 4 / 5 },
  { id: '1:1', label: '1:1 Square', ratio: 1 },
  { id: '9:16', label: '9:16 Story', ratio: 9 / 16 },
  { id: 'carousel', label: 'Carousel Split', ratio: 4 / 5 }
];

export function CarouselCropperTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<AspectPreset>('4:5');
  const [slideCount, setSlideCount] = useState(3);
  const [offsetPct, setOffsetPct] = useState(50);
  const [previewUrl, setPreviewUrl] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] || null;
    setFile(picked);
  };

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    let cancelled = false;
    (async () => {
      const loaded = await loadImageFromFile(file);
      try {
        const iw = loaded.img.naturalWidth;
        const ih = loaded.img.naturalHeight;
        const targetRatio =
          preset === 'carousel'
            ? (4 / 5) * slideCount
            : PRESETS.find((p) => p.id === preset)?.ratio || 4 / 5;

        let cropW = iw;
        let cropH = Math.round(iw / targetRatio);
        if (cropH > ih) {
          cropH = ih;
          cropW = Math.round(ih * targetRatio);
        }
        const maxX = Math.max(0, iw - cropW);
        const maxY = Math.max(0, ih - cropH);
        const sx = Math.round((maxX * offsetPct) / 100);
        const sy = Math.round((maxY * offsetPct) / 100);

        const previewScale = Math.min(1, 900 / Math.max(cropW, cropH));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(cropW * previewScale));
        canvas.height = Math.max(1, Math.round(cropH * previewScale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(loaded.img, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);

        if (preset === 'carousel' && slideCount > 1) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          for (let i = 1; i < slideCount; i++) {
            const x = Math.round((canvas.width / slideCount) * i);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
          }
        }
        if (!cancelled) setPreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
      } finally {
        loaded.revoke();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, preset, slideCount, offsetPct]);

  const handleExport = async () => {
    if (!file) return;
    setExporting(true);
    const loaded = await loadImageFromFile(file);
    try {
      const iw = loaded.img.naturalWidth;
      const ih = loaded.img.naturalHeight;
      const targetRatio =
        preset === 'carousel'
          ? (4 / 5) * slideCount
          : PRESETS.find((p) => p.id === preset)?.ratio || 4 / 5;

      let cropW = iw;
      let cropH = Math.round(iw / targetRatio);
      if (cropH > ih) {
        cropH = ih;
        cropW = Math.round(ih * targetRatio);
      }
      const sx = Math.round((Math.max(0, iw - cropW) * offsetPct) / 100);
      const sy = Math.round((Math.max(0, ih - cropH) * offsetPct) / 100);

      const slices = preset === 'carousel' ? slideCount : 1;
      const sliceW = Math.floor(cropW / slices);
      const out: Array<{ name: string; blob: Blob }> = [];

      for (let i = 0; i < slices; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = sliceW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable.');
        ctx.drawImage(
          loaded.img,
          sx + i * sliceW,
          sy,
          sliceW,
          cropH,
          0,
          0,
          sliceW,
          cropH
        );
        const blob = await canvasToBlob(canvas, 'image/jpeg', 0.94);
        const suffix = slices > 1 ? `-slide-${i + 1}` : `-${preset.replace(':', 'x')}`;
        out.push({ name: replaceFileExt(file.name, 'jpg', suffix), blob });
      }

      await exportBlobs(out, `${replaceFileExt(file.name, 'zip', '-carousel')}`, slices > 1);
    } finally {
      loaded.revoke();
      setExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 lg:col-span-5">
        <div className="flex items-center gap-2">
          <Columns className="h-4 w-4 text-slate-800" />
          <h2 className="text-base font-bold text-slate-900">Social Crop &amp; Carousel Splitter</h2>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-4 py-6 text-center transition hover:bg-stone-100">
          <Upload className="h-5 w-5 text-slate-600" />
          <span className="mt-2 text-xs font-semibold text-slate-800">
            {file ? file.name : 'Choose a photo to crop or split'}
          </span>
          <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
        </label>

        <div>
          <span className="block text-xs font-medium text-slate-700">Format</span>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`min-h-[36px] rounded-lg border px-2 text-xs font-medium transition ${
                  preset === p.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-stone-300 bg-white text-slate-700 hover:bg-stone-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'carousel' && (
          <div>
            <label htmlFor="car-slides" className="block text-xs font-medium text-slate-700">
              Carousel Slides ({slideCount} × 4:5 portrait)
            </label>
            <input
              id="car-slides"
              type="range"
              min={2}
              max={5}
              step={1}
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="mt-2 w-full accent-slate-900"
            />
          </div>
        )}

        <div>
          <label htmlFor="car-offset" className="block text-xs font-medium text-slate-700">
            Crop Pan Position ({offsetPct}%)
          </label>
          <input
            id="car-offset"
            type="range"
            min={0}
            max={100}
            step={1}
            value={offsetPct}
            onChange={(e) => setOffsetPct(Number(e.target.value))}
            className="mt-2 w-full accent-slate-900"
          />
        </div>

        <button
          type="button"
          disabled={!file || exporting}
          onClick={() => void handleExport()}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>
                {preset === 'carousel'
                  ? `Export ${slideCount} Slides (.zip)`
                  : 'Download Cropped Photo (.jpg)'}
              </span>
            </>
          )}
        </button>
      </div>

      <div className="flex min-h-[340px] items-center justify-center rounded-2xl border border-stone-200 bg-stone-100/70 p-4 lg:col-span-7">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Crop preview"
            className="max-h-[460px] w-auto rounded-xl border border-stone-200 object-contain shadow-sm"
          />
        ) : (
          <div className="text-center text-slate-400">
            <ImageIcon className="mx-auto h-10 w-10 opacity-50" />
            <p className="mt-2 text-xs">Upload a photo to preview crop or carousel slices</p>
          </div>
        )}
      </div>
    </div>
  );
}
