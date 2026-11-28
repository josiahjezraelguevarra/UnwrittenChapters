import { useState, type ChangeEvent } from 'react';
import { Download, Loader2, ShieldCheck, Upload } from 'lucide-react';
import {
  canvasToBlob,
  exportBlobs,
  loadImageFromFile,
  outputMimeAndExt,
  replaceFileExt
} from '../../lib/canvasTools';

const MAX_FILES = 40;

export function ExifStripperTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    setFiles(picked.slice(0, MAX_FILES));
    setSummary([]);
    setError(picked.length > MAX_FILES ? `Capped at first ${MAX_FILES} images.` : '');
  };

  const handleStripAndDownload = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError('');
    try {
      const cleaned: Array<{ name: string; blob: Blob }> = [];
      const logs: string[] = [];

      for (const file of files) {
        const loaded = await loadImageFromFile(file);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = loaded.img.naturalWidth;
          canvas.height = loaded.img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context unavailable.');
          // Re-drawing onto Canvas strips EXIF, GPS coordinates, camera serials, and XMP tags
          ctx.drawImage(loaded.img, 0, 0);
          const { mime, ext } = outputMimeAndExt(file.type);
          const blob = await canvasToBlob(canvas, mime, 0.94);
          const outName = replaceFileExt(file.name, ext, '-clean');
          cleaned.push({ name: outName, blob });
          logs.push(
            `${outName} (${Math.round(file.size / 1024)} KB → ${Math.round(blob.size / 1024)} KB, EXIF/GPS removed)`
          );
        } finally {
          loaded.revoke();
        }
      }

      setSummary(logs);
      await exportBlobs(cleaned, 'clean-no-exif-photos.zip');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to strip metadata.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <div>
          <h2 className="text-base font-bold text-slate-900">EXIF &amp; GPS Privacy Stripper</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Re-encodes your photos locally in-browser so GPS location, camera model, timestamps, and
            serial numbers are completely removed before sharing online.
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-4 py-8 text-center transition hover:bg-stone-100">
        <Upload className="h-6 w-6 text-slate-600" />
        <span className="mt-2 text-xs font-semibold text-slate-800">
          {files.length > 0 ? `${files.length} image(s) ready to clean` : 'Select up to 40 photos'}
        </span>
        <span className="mt-0.5 text-[11px] text-slate-500">Zero files ever leave your browser</span>
        <input type="file" accept="image/*" multiple onChange={handleSelect} className="sr-only" />
      </label>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <button
        type="button"
        disabled={files.length === 0 || processing}
        onClick={() => void handleStripAndDownload()}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Stripping Metadata...</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>
              {files.length > 1 ? `Strip EXIF & Download ZIP (${files.length})` : 'Strip EXIF & Download'}
            </span>
          </>
        )}
      </button>

      {summary.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-slate-700">
          {summary.map((line, i) => (
            <li key={i} className="truncate font-mono text-[11px]">
              ✓ {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
