import { downloadZip } from 'client-zip';
import { triggerFileDownload } from './qrCard';

export interface LoadedImage {
  img: HTMLImageElement;
  revoke: () => void;
}

export function loadImageFromFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, revoke: () => URL.revokeObjectURL(url) });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not decode image: ${file.name}`));
    };
    img.src = url;
  });
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode image from canvas.'));
      },
      mimeType,
      quality
    );
  });
}

export function outputMimeAndExt(inputMime: string): { mime: string; ext: string } {
  if (inputMime === 'image/png') return { mime: 'image/png', ext: 'png' };
  if (inputMime === 'image/webp') return { mime: 'image/webp', ext: 'webp' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

export function replaceFileExt(filename: string, newExt: string, suffix = ''): string {
  const dot = filename.lastIndexOf('.');
  const base = dot > 0 ? filename.slice(0, dot) : filename;
  return `${base}${suffix}.${newExt}`;
}

export async function exportBlobs(
  entries: Array<{ name: string; blob: Blob }>,
  zipFilename: string,
  forceZip = false
): Promise<void> {
  if (entries.length === 0) return;

  if (entries.length === 1 && !forceZip) {
    const url = URL.createObjectURL(entries[0].blob);
    triggerFileDownload(url, entries[0].name);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }

  const zipBlob = await downloadZip(
    entries.map((e) => ({ name: e.name, input: e.blob }))
  ).blob();
  const url = URL.createObjectURL(zipBlob);
  triggerFileDownload(url, zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
