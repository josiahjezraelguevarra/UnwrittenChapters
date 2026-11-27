import { describe, expect, it } from 'vitest';
import {
  buildThumbnailSizedUrl,
  DriveError,
  extractDriveFolderId,
  fetchDriveFolderTree,
  fetchMultiDriveFolderTrees
} from '../src/server/drive';

describe('extractDriveFolderId', () => {
  it('parses standard sharing URLs, mobile URLs, open?id URLs, and raw IDs', () => {
    expect(
      extractDriveFolderId('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz?usp=sharing')
    ).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz');

    expect(
      extractDriveFolderId('https://drive.google.com/drive/u/1/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz')
    ).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz');

    expect(
      extractDriveFolderId('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz')
    ).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz');

    expect(extractDriveFolderId('1AbCdEfGhIjKlMnOpQrStUvWxYz')).toBe(
      '1AbCdEfGhIjKlMnOpQrStUvWxYz'
    );
  });

  it('rejects non-Drive URLs and invalid strings', () => {
    expect(extractDriveFolderId('https://evil.example.com/drive/folders/1AbCdEfGhIjKlMnOp')).toBeNull();
    expect(extractDriveFolderId('not a url')).toBeNull();
    expect(extractDriveFolderId('')).toBeNull();
  });
});

describe('buildThumbnailSizedUrl', () => {
  it('replaces Google Drive thumbnail size parameter cleanly', () => {
    expect(buildThumbnailSizedUrl('https://lh3.googleusercontent.com/abc=s220', 800)).toBe(
      'https://lh3.googleusercontent.com/abc=w800'
    );
    expect(buildThumbnailSizedUrl('https://lh3.googleusercontent.com/abc=s220', 2400)).toBe(
      'https://lh3.googleusercontent.com/abc=w1600'
    );
  });
});

describe('fetchDriveFolderTree', () => {
  it('traverses nested subfolders and collects images and videos', async () => {
    const mockFetch: typeof fetch = async (input) => {
      const url = decodeURIComponent(typeof input === 'string' ? input : input.toString());
      if (url.includes('/files/rootFolder123?')) {
        return new Response(
          JSON.stringify({
            id: 'rootFolder123',
            name: 'Wedding Shoot',
            mimeType: 'application/vnd.google-apps.folder'
          }),
          { status: 200 }
        );
      }
      if (url.includes("'rootFolder123'+in+parents")) {
        return new Response(
          JSON.stringify({
            files: [
              {
                id: 'subFolder456',
                name: 'Ceremony',
                mimeType: 'application/vnd.google-apps.folder'
              },
              {
                id: 'photoRoot001',
                name: 'cover.jpg',
                mimeType: 'image/jpeg',
                size: '2048000',
                imageMediaMetadata: { width: 4000, height: 2667 }
              },
              {
                id: 'docIgnore001',
                name: 'notes.pdf',
                mimeType: 'application/pdf'
              },
              {
                id: 'svgIgnore001',
                name: 'xss.svg',
                mimeType: 'image/svg+xml'
              }
            ]
          }),
          { status: 200 }
        );
      }
      if (url.includes("'subFolder456'+in+parents")) {
        return new Response(
          JSON.stringify({
            files: [
              {
                id: 'videoSub001',
                name: 'highlight.mp4',
                mimeType: 'video/mp4',
                size: '15000000',
                videoMediaMetadata: { width: 1920, height: 1080, durationMillis: '94000' }
              }
            ]
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    };

    const res = await fetchDriveFolderTree('rootFolder123', 'test-api-key', mockFetch);
    expect(res.folderName).toBe('Wedding Shoot');
    expect(res.folders).toHaveLength(2);
    expect(res.folders[1].path).toBe('Ceremony');
    expect(res.folders[1].itemCount).toBe(1);
    expect(res.items).toHaveLength(2);
    expect(res.items[0]).toMatchObject({
      id: 'photoRoot001',
      kind: 'image',
      folderPath: ''
    });
    expect(res.items[1]).toMatchObject({
      id: 'videoSub001',
      kind: 'video',
      folderPath: 'Ceremony',
      durationMs: 94000
    });
  });

  it('throws friendly DriveError when folder is private or not found', async () => {
    const mockFetch: typeof fetch = async () => new Response('{}', { status: 404 });
    await expect(fetchDriveFolderTree('privateFolder123', 'test-key', mockFetch)).rejects.toThrow(
      DriveError
    );
  });

  it('includes support contact email when Drive API rate limit or quota is exhausted', async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ error: { message: 'User rate limit exceeded' } }), {
        status: 403
      });
    await expect(fetchDriveFolderTree('folder123456', 'test-key', mockFetch)).rejects.toThrow(
      'josiahjezraelguevarra.bsit@gmail.com'
    );
  });

  it('combines multiple Drive folders into distinct root chapters and falls back to backup key on 429', async () => {
    const mockFetch: typeof fetch = async (input) => {
      const url = decodeURIComponent(typeof input === 'string' ? input : input.toString());
      if (url.includes('key=primary-key')) {
        return new Response(JSON.stringify({ error: { message: 'Rate limit exceeded' } }), {
          status: 429
        });
      }
      if (url.includes('/files/folderOne123?')) {
        return new Response(
          JSON.stringify({ id: 'folderOne123', name: 'Ceremony', mimeType: 'application/vnd.google-apps.folder' }),
          { status: 200 }
        );
      }
      if (url.includes('/files/folderTwo456?')) {
        return new Response(
          JSON.stringify({ id: 'folderTwo456', name: 'Reception', mimeType: 'application/vnd.google-apps.folder' }),
          { status: 200 }
        );
      }
      if (url.includes("'folderOne123'+in+parents")) {
        return new Response(
          JSON.stringify({
            files: [{ id: 'imgA00000001', name: 'vows.jpg', mimeType: 'image/jpeg' }]
          }),
          { status: 200 }
        );
      }
      if (url.includes("'folderTwo456'+in+parents")) {
        return new Response(
          JSON.stringify({
            files: [{ id: 'imgB00000002', name: 'dance.jpg', mimeType: 'image/jpeg' }]
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    };

    const res = await fetchMultiDriveFolderTrees(
      ['folderOne123', 'folderTwo456', 'folderOne123'],
      'primary-key',
      mockFetch,
      'backup-key'
    );
    expect(res.items).toHaveLength(2);
    expect(res.items[0].folderPath).toBe('Ceremony');
    expect(res.items[1].folderPath).toBe('Reception');
    expect(res.folders.map((f) => f.path)).toEqual(['Ceremony', 'Reception']);
  });

  it('rejects more than 3 distinct Drive folder links', async () => {
    await expect(
      fetchMultiDriveFolderTrees(
        ['folder000001', 'folder000002', 'folder000003', 'folder000004'],
        'test-key'
      )
    ).rejects.toThrow('up to 3');
  });
});
