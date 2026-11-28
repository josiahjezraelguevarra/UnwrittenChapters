export type GalleryFontPreset = 'sans' | 'serif' | 'mono' | 'fineart';
export type GalleryGridGap = 'none' | 'compact' | 'normal' | 'airy';
export type GalleryCardRadius = 'sharp' | 'rounded' | 'soft';
export type GalleryHeroStyle = 'fullscreen' | 'banner' | 'minimal' | 'split';
export type GalleryCardStyle = 'clean' | 'framed' | 'mat' | 'polaroid' | 'shadow';
export type GalleryCaptionMode = 'hover' | 'below' | 'hidden';

export interface FontPresetMeta {
  id: GalleryFontPreset;
  label: string;
  tagline: string;
  headingFamily: string;
  bodyFamily: string;
}

export const FONT_PRESETS: Record<GalleryFontPreset, FontPresetMeta> = {
  sans: {
    id: 'sans',
    label: 'Modern Sans',
    tagline: 'Clean & balanced',
    headingFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif",
    bodyFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"
  },
  serif: {
    id: 'serif',
    label: 'Editorial Serif',
    tagline: 'Timeless & boutique',
    headingFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
    bodyFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"
  },
  fineart: {
    id: 'fineart',
    label: 'Fine Art',
    tagline: 'Graceful & poetic',
    headingFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    bodyFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"
  },
  mono: {
    id: 'mono',
    label: 'Minimal Mono',
    tagline: 'Crisp & gallery-like',
    headingFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    bodyFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"
  }
};

export const GRID_GAP_META: Record<
  GalleryGridGap,
  { id: GalleryGridGap; label: string; cssValue: string }
> = {
  none: { id: 'none', label: 'None', cssValue: '0px' },
  compact: { id: 'compact', label: 'Compact', cssValue: '0.5rem' },
  normal: { id: 'normal', label: 'Normal', cssValue: '1rem' },
  airy: { id: 'airy', label: 'Airy', cssValue: '1.75rem' }
};

export const CARD_RADIUS_META: Record<
  GalleryCardRadius,
  { id: GalleryCardRadius; label: string; cssValue: string }
> = {
  sharp: { id: 'sharp', label: 'Sharp', cssValue: '0px' },
  rounded: { id: 'rounded', label: 'Rounded', cssValue: '0.75rem' },
  soft: { id: 'soft', label: 'Soft', cssValue: '1.25rem' }
};

export const HERO_STYLE_META: Record<
  GalleryHeroStyle,
  { id: GalleryHeroStyle; label: string; tagline: string }
> = {
  fullscreen: { id: 'fullscreen', label: 'Full Screen', tagline: 'Whole-screen cover & center title' },
  banner: { id: 'banner', label: 'Cover Banner', tagline: 'Soft photo backdrop' },
  minimal: { id: 'minimal', label: 'Minimal Type', tagline: 'Pure color & ink' },
  split: { id: 'split', label: 'Split Frame', tagline: 'Side-by-side cover' }
};

export const CARD_STYLE_META: Record<
  GalleryCardStyle,
  { id: GalleryCardStyle; label: string; tagline: string }
> = {
  clean: { id: 'clean', label: 'Edge-to-Edge', tagline: 'Full bleed frames' },
  framed: { id: 'framed', label: 'Hairline', tagline: 'Subtle crisp border' },
  mat: { id: 'mat', label: 'Gallery Mat', tagline: 'Museum print border' },
  polaroid: { id: 'polaroid', label: 'Polaroid', tagline: 'Classic film border' },
  shadow: { id: 'shadow', label: 'Floating Print', tagline: 'Soft elevated frame' }
};

export const CAPTION_MODE_META: Record<
  GalleryCaptionMode,
  { id: GalleryCaptionMode; label: string; tagline: string }
> = {
  hover: { id: 'hover', label: 'On Hover', tagline: 'Reveals on pointer' },
  below: { id: 'below', label: 'Below Photo', tagline: 'Always visible plaque' },
  hidden: { id: 'hidden', label: 'Pure Image', tagline: 'No filename overlay' }
};

export interface AccentPreset {
  label: string;
  hex: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { label: 'Theme Default', hex: '' },
  { label: 'Rose', hex: '#e11d48' },
  { label: 'Amber', hex: '#d97706' },
  { label: 'Emerald', hex: '#059669' },
  { label: 'Indigo', hex: '#4f46e5' },
  { label: 'Terracotta', hex: '#c2410c' },
  { label: 'Teal', hex: '#0d9488' }
];

export interface GalleryPalettePreset {
  id: string;
  label: string;
  tagline: string;
  theme: 'light' | 'dark';
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  accentColor: string;
}

export const GALLERY_PALETTES: GalleryPalettePreset[] = [
  {
    id: 'editorial-ivory',
    label: 'Editorial Ivory',
    tagline: 'Warm stone paper',
    theme: 'light',
    backgroundColor: '#f8f6f2',
    surfaceColor: '#ffffff',
    textColor: '#141311',
    accentColor: ''
  },
  {
    id: 'midnight-gallery',
    label: 'Midnight Gallery',
    tagline: 'Deep obsidian slate',
    theme: 'dark',
    backgroundColor: '#0b0d12',
    surfaceColor: '#131824',
    textColor: '#f1f5f9',
    accentColor: ''
  },
  {
    id: 'cream-espresso',
    label: 'Cream & Espresso',
    tagline: 'Warm film stock',
    theme: 'light',
    backgroundColor: '#f3ece1',
    surfaceColor: '#faf6ef',
    textColor: '#2c221e',
    accentColor: '#7c4a32'
  },
  {
    id: 'sage-botanical',
    label: 'Sage Botanical',
    tagline: 'Calm garden linen',
    theme: 'light',
    backgroundColor: '#edf2ee',
    surfaceColor: '#f7faf7',
    textColor: '#18241b',
    accentColor: '#3b5943'
  },
  {
    id: 'blush-atelier',
    label: 'Blush Atelier',
    tagline: 'Soft rose editorial',
    theme: 'light',
    backgroundColor: '#fbf3f4',
    surfaceColor: '#ffffff',
    textColor: '#2d1e22',
    accentColor: '#be4b63'
  },
  {
    id: 'obsidian-gold',
    label: 'Obsidian Gold',
    tagline: 'Evening luxury',
    theme: 'dark',
    backgroundColor: '#11100e',
    surfaceColor: '#1b1916',
    textColor: '#f4efe6',
    accentColor: '#d4af37'
  },
  {
    id: 'nordic-slate',
    label: 'Nordic Slate',
    tagline: 'Crisp coastal blue',
    theme: 'light',
    backgroundColor: '#e8edf2',
    surfaceColor: '#f4f7fa',
    textColor: '#16202a',
    accentColor: '#2b547e'
  },
  {
    id: 'velvet-plum',
    label: 'Velvet Plum',
    tagline: 'Moody studio violet',
    theme: 'dark',
    backgroundColor: '#17111d',
    surfaceColor: '#22192b',
    textColor: '#f3ecf8',
    accentColor: '#c084fc'
  }
];

export function validateFontPreset(raw: unknown): GalleryFontPreset {
  if (raw === 'serif' || raw === 'mono' || raw === 'sans' || raw === 'fineart') return raw;
  return 'sans';
}

export function validateGridGap(raw: unknown): GalleryGridGap {
  if (raw === 'none' || raw === 'compact' || raw === 'airy' || raw === 'normal') return raw;
  return 'normal';
}

export function validateCardRadius(raw: unknown): GalleryCardRadius {
  if (raw === 'sharp' || raw === 'soft' || raw === 'rounded') return raw;
  return 'rounded';
}

export function validateHeroStyle(raw: unknown): GalleryHeroStyle {
  if (raw === 'fullscreen' || raw === 'minimal' || raw === 'split' || raw === 'banner') return raw;
  return 'fullscreen';
}

export function validateCardStyle(raw: unknown): GalleryCardStyle {
  if (raw === 'framed' || raw === 'mat' || raw === 'polaroid' || raw === 'shadow' || raw === 'clean') {
    return raw;
  }
  return 'clean';
}

export function validateCaptionMode(raw: unknown): GalleryCaptionMode {
  if (raw === 'below' || raw === 'hidden' || raw === 'hover') return raw;
  return 'hover';
}

export function sanitizeHexColor(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return '';
}

function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = sanitizeHexColor(hex);
  if (!clean) return null;
  return [
    parseInt(clean.slice(1, 3), 16),
    parseInt(clean.slice(3, 5), 16),
    parseInt(clean.slice(5, 7), 16)
  ];
}

export function getRelativeLuminance(hex: string): number {
  const rgb = parseHexRgb(hex);
  if (!rgb) return 0;
  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2]);
}

export function getContrastRatio(hexA: string, hexB: string): number {
  const cleanA = sanitizeHexColor(hexA);
  const cleanB = sanitizeHexColor(hexB);
  if (!cleanA || !cleanB) return 21;
  const lumA = getRelativeLuminance(cleanA);
  const lumB = getRelativeLuminance(cleanB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns '#0f172a' or '#ffffff' to maintain >= 4.5:1 WCAG contrast on top of a hex background.
 */
export function getContrastTextColor(hex: string): '#0f172a' | '#ffffff' {
  const clean = sanitizeHexColor(hex);
  if (!clean) return '#ffffff';
  return getRelativeLuminance(clean) > 0.18 ? '#0f172a' : '#ffffff';
}

export function mixHexColors(hexA: string, hexB: string, weightB: number): string {
  const rgbA = parseHexRgb(hexA);
  const rgbB = parseHexRgb(hexB);
  if (!rgbA || !rgbB) return sanitizeHexColor(hexA) || sanitizeHexColor(hexB) || '#0f172a';
  const w = Math.max(0, Math.min(1, weightB));
  const r = Math.round(rgbA[0] * (1 - w) + rgbB[0] * w);
  const g = Math.round(rgbA[1] * (1 - w) + rgbB[1] * w);
  const b = Math.round(rgbA[2] * (1 - w) + rgbB[2] * w);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) return `rgba(15, 23, 42, ${alpha})`;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export interface ResolvedGalleryThemeTokens {
  bg: string;
  surface: string;
  surfaceMuted: string;
  fg: string;
  mutedFg: string;
  border: string;
  cardBg: string;
  accent: string;
  accentFg: '#0f172a' | '#ffffff';
  accentSoftBg: string;
  isDarkSurface: boolean;
  contrastRatio: number;
}

export function resolveGalleryThemeTokens(input: {
  theme: 'light' | 'dark';
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  accentColor?: string;
}): ResolvedGalleryThemeTokens {
  const baseIsDark = input.theme === 'dark';
  const defaultBg = baseIsDark ? '#020617' : '#fafaf9';
  const bg = sanitizeHexColor(input.backgroundColor) || defaultBg;
  const isDarkSurface = getRelativeLuminance(bg) <= 0.18;

  const defaultFg = isDarkSurface ? '#f1f5f9' : '#0f172a';
  const fg = sanitizeHexColor(input.textColor) || defaultFg;

  const defaultSurface = isDarkSurface
    ? mixHexColors(bg, '#ffffff', 0.06)
    : mixHexColors(bg, '#ffffff', 0.72);
  const surface = sanitizeHexColor(input.surfaceColor) || defaultSurface;

  const surfaceMuted = isDarkSurface
    ? mixHexColors(surface, '#ffffff', 0.08)
    : mixHexColors(bg, '#000000', 0.05);

  const cardBg = isDarkSurface
    ? mixHexColors(bg, '#ffffff', 0.08)
    : mixHexColors(bg, '#000000', 0.07);

  const border = hexToRgba(fg, isDarkSurface ? 0.15 : 0.12);
  const mutedFg = hexToRgba(fg, 0.72);

  const customAccent = sanitizeHexColor(input.accentColor);
  const accent = customAccent || (isDarkSurface ? '#ffffff' : '#0f172a');
  const accentFg = customAccent ? getContrastTextColor(customAccent) : isDarkSurface ? '#0f172a' : '#ffffff';
  const accentSoftBg = hexToRgba(accent, isDarkSurface ? 0.18 : 0.12);

  return {
    bg,
    surface,
    surfaceMuted,
    fg,
    mutedFg,
    border,
    cardBg,
    accent,
    accentFg,
    accentSoftBg,
    isDarkSurface,
    contrastRatio: getContrastRatio(bg, fg)
  };
}
