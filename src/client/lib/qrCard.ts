import QRCode from 'qrcode';

export interface QrCardOptions {
  url: string;
  title: string;
  brandName?: string;
  passwordHint?: string;
  theme: 'light' | 'dark';
}

export async function generateQrSvg(
  url: string,
  options?: { darkColor?: string; lightColor?: string; margin?: number }
): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: options?.margin ?? 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: options?.darkColor ?? '#141311',
      light: options?.lightColor ?? '#ffffff'
    }
  });
}

export async function generateQrPngDataUrl(
  url: string,
  options?: { width?: number; darkColor?: string; lightColor?: string; margin?: number }
): Promise<string> {
  return QRCode.toDataURL(url, {
    width: options?.width ?? 1024,
    margin: options?.margin ?? 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: options?.darkColor ?? '#141311',
      light: options?.lightColor ?? '#ffffff'
    }
  });
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length >= maxLines - 1) {
        const remaining = [current, ...words.slice(i + 1)].join(' ');
        let clipped = remaining;
        while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
          clipped = clipped.slice(0, -1);
        }
        lines.push(clipped === remaining ? clipped : `${clipped.trimEnd()}…`);
        return lines;
      }
    }
  }
  lines.push(current);
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load QR image.'));
    img.src = src;
  });
}

/**
 * Renders a 4x6 inch (1200x1800px at 300 DPI) printable share card PNG data URL.
 */
export async function renderShareCardPngDataUrl(options: QrCardOptions): Promise<string> {
  const width = 1200;
  const height = 1800;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  const isDark = options.theme === 'dark';
  const bg = isDark ? '#111216' : '#f8f6f2';
  const surface = isDark ? '#1a1c22' : '#ffffff';
  const ink = isDark ? '#f4f1ea' : '#141311';
  const muted = isDark ? 'rgba(244, 241, 234, 0.65)' : 'rgba(20, 19, 17, 0.6)';
  const border = isDark ? 'rgba(244, 241, 234, 0.16)' : 'rgba(20, 19, 17, 0.14)';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Outer editorial hairline frame
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 56, 56, width - 112, height - 112, 32);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const brand = (options.brandName || 'UnwrittenChapters').trim().toUpperCase();
  ctx.fillStyle = muted;
  ctx.font = '600 28px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(brand.slice(0, 40), width / 2, 150);

  const safeTitle = options.title.trim() || 'Photo Gallery';
  ctx.fillStyle = ink;
  ctx.font = '700 66px "Playfair Display", Georgia, serif';
  const titleLines = wrapTextLines(ctx, safeTitle, width - 220, 2);
  titleLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, 230 + idx * 82);
  });

  // QR Container card
  const qrBoxSize = 720;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = 470;
  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 36);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();

  const qrPng = await generateQrPngDataUrl(options.url, {
    width: 620,
    margin: 1,
    darkColor: '#141311',
    lightColor: '#ffffff'
  });
  const qrImg = await loadImage(qrPng);
  ctx.drawImage(qrImg, qrBoxX + 50, qrBoxY + 50, 620, 620);

  // Instruction & URL
  ctx.fillStyle = ink;
  ctx.font = '600 34px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('Scan to view & download photos', width / 2, 1270);

  const displayUrl = options.url.replace(/^https?:\/\//, '');
  ctx.fillStyle = muted;
  ctx.font = '500 26px "JetBrains Mono", ui-monospace, monospace';
  const urlLines = wrapTextLines(ctx, displayUrl, width - 220, 2);
  urlLines.forEach((line, idx) => {
    ctx.fillText(line, width / 2, 1345 + idx * 36);
  });

  if (options.passwordHint?.trim()) {
    const hintText = `Password: ${options.passwordHint.trim()}`;
    ctx.font = '600 28px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
    const textW = Math.min(width - 260, ctx.measureText(hintText).width + 72);
    const pillX = (width - textW) / 2;
    const pillY = 1455;
    ctx.fillStyle = surface;
    drawRoundedRect(ctx, pillX, pillY, textW, 68, 34);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.fillText(hintText.slice(0, 48), width / 2, pillY + 18);
  }

  ctx.fillStyle = muted;
  ctx.font = '500 22px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('4 × 6 Print Card', width / 2, 1650);

  return canvas.toDataURL('image/png');
}

export function triggerFileDownload(href: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function downloadSvgMarkup(svgMarkup: string, filename: string): void {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerFileDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
