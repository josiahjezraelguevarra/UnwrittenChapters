import { downloadZip } from 'client-zip';
import type { MediaItem } from '../../shared/types';
import { mediaFullUrl } from './api';

export interface ZipProgress {
  completed: number;
  total: number;
  currentFile: string;
}

function deduplicateEntryPath(rawPath: string, seen: Set<string>): string {
  if (!seen.has(rawPath)) {
    seen.add(rawPath);
    return rawPath;
  }
  const dotIdx = rawPath.lastIndexOf('.');
  const base = dotIdx > 0 ? rawPath.slice(0, dotIdx) : rawPath;
  const ext = dotIdx > 0 ? rawPath.slice(dotIdx) : '';
  let counter = 2;
  while (seen.has(`${base} (${counter})${ext}`)) {
    counter += 1;
  }
  const unique = `${base} (${counter})${ext}`;
  seen.add(unique);
  return unique;
}

export async function downloadItemsAsZip(
  slug: string,
  zipFilename: string,
  items: MediaItem[],
  onProgress: (progress: ZipProgress) => void,
  signal: AbortSignal
): Promise<void> {
  if (items.length === 0) return;

  const seenPaths = new Set<string>();
  const concurrency = 4;
  let nextIndex = 0;
  let completed = 0;

  async function* generateZipEntries() {
    const inFlight = new Map<number, Promise<{ path: string; res: Response }>>();

    const enqueue = () => {
      while (inFlight.size < concurrency && nextIndex < items.length) {
        const idx = nextIndex++;
        const item = items[idx];
        const rawPath = item.folderPath ? `${item.folderPath}/${item.name}` : item.name;
        const entryPath = deduplicateEntryPath(rawPath, seenPaths);

        const task = fetch(mediaFullUrl(slug, item.id, true), { signal }).then((res) => {
          if (!res.ok || !res.body) {
            throw new Error(`Failed to fetch ${item.name} (${res.status})`);
          }
          return { path: entryPath, res };
        });
        inFlight.set(idx, task);
      }
    };

    enqueue();

    for (let i = 0; i < items.length; i++) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const task = inFlight.get(i);
      if (!task) continue;
      const { path, res } = await task;
      inFlight.delete(i);
      completed += 1;
      onProgress({
        completed,
        total: items.length,
        currentFile: items[i].name
      });
      enqueue();
      yield {
        name: path,
        input: res
      };
    }
  }

  const blob = await downloadZip(generateZipEntries()).blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
