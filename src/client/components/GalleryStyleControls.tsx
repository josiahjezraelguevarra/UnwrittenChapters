import { useId } from 'react';
import { AlertTriangle, Check, ChevronDown, Frame, Palette, RotateCcw, Sparkles } from 'lucide-react';
import {
  CardFrameIllustration,
  CaptionModeIllustration,
  CornerRadiusIllustration,
  HeroStyleIllustration,
  SpacingIllustration
} from './StyleIllustrations';
import {
  ACCENT_PRESETS,
  CAPTION_MODE_META,
  CARD_RADIUS_META,
  CARD_STYLE_META,
  FONT_PRESETS,
  GALLERY_PALETTES,
  GRID_GAP_META,
  HERO_STYLE_META,
  getContrastTextColor,
  resolveGalleryThemeTokens,
  sanitizeHexColor,
  type GalleryCaptionMode,
  type GalleryCardRadius,
  type GalleryCardStyle,
  type GalleryFontPreset,
  type GalleryGridGap,
  type GalleryHeroStyle,
  type GalleryPalettePreset
} from '../../shared/customization';
import type { GalleryTheme } from '../../shared/types';

export interface GalleryStyleValues {
  theme: GalleryTheme;
  fontPreset: GalleryFontPreset;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  heroStyle: GalleryHeroStyle;
  cardStyle: GalleryCardStyle;
  captionMode: GalleryCaptionMode;
  gridGap: GalleryGridGap;
  cardRadius: GalleryCardRadius;
}

interface GalleryStyleControlsProps {
  values: GalleryStyleValues;
  onChange: <K extends keyof GalleryStyleValues>(key: K, value: GalleryStyleValues[K]) => void;
  onApplyPalette?: (palette: GalleryPalettePreset) => void;
  section?: 'all' | 'colors' | 'layout' | 'hero' | 'framing';
  previewTitle?: string;
  previewBrand?: string;
  showMiniPreview?: boolean;
  compact?: boolean;
  dark?: boolean;
}

const FONT_LIST = Object.values(FONT_PRESETS);
const GAP_LIST = Object.values(GRID_GAP_META);
const RADIUS_LIST = Object.values(CARD_RADIUS_META);
const HERO_LIST = Object.values(HERO_STYLE_META);
const CARD_STYLE_LIST = Object.values(CARD_STYLE_META);
const CAPTION_LIST = Object.values(CAPTION_MODE_META);

interface ColorControlRowProps {
  label: string;
  hint: string;
  value: string;
  fallbackHex: string;
  onChange: (next: string) => void;
  onReset?: () => void;
  dark: boolean;
}

function ColorControlRow({
  label,
  hint,
  value,
  fallbackHex,
  onChange,
  onReset,
  dark
}: ColorControlRowProps) {
  const pickerId = useId();
  const hexId = useId();
  const clean = sanitizeHexColor(value);

  return (
    <div
      className={`flex items-center justify-between gap-2.5 rounded-xl border px-3 py-2 ${
        dark ? 'border-[#f4f1ea]/12 bg-[#1c1b18]' : 'border-stone-200 bg-stone-50/75'
      }`}
    >
      <div className="min-w-0">
        <span className={`block text-xs font-semibold ${dark ? 'text-[#f4f1ea]' : 'text-slate-800'}`}>
          {label}
        </span>
        <span className={`block truncate text-[11px] ${dark ? 'text-[#f4f1ea]/55' : 'text-slate-500'}`}>
          {clean ? clean.toUpperCase() : hint}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {clean && onReset && (
          <button
            type="button"
            onClick={onReset}
            title={`Reset ${label} to auto`}
            className={`inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium transition ${
              dark
                ? 'text-[#f4f1ea]/65 hover:bg-[#f4f1ea]/10 hover:text-[#f4f1ea]'
                : 'text-slate-500 hover:bg-stone-200 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="h-2.5 w-2.5" />
            <span>Auto</span>
          </button>
        )}
        <div
          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${
            dark ? 'border-[#f4f1ea]/18 bg-[#141311]' : 'border-stone-300 bg-white'
          }`}
        >
          <label htmlFor={pickerId} className="sr-only">
            {label} color picker
          </label>
          <input
            id={pickerId}
            type="color"
            value={clean || fallbackHex}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <label htmlFor={hexId} className="sr-only">
            {label} hex value
          </label>
          <input
            id={hexId}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={fallbackHex}
            maxLength={7}
            className={`w-[58px] bg-transparent font-mono text-[11px] focus:outline-none ${
              dark ? 'text-[#f4f1ea]' : 'text-slate-700'
            }`}
          />
        </div>
      </div>
    </div>
  );
}

export function GalleryStyleControls({
  values,
  onChange,
  onApplyPalette,
  section = 'all',
  previewTitle,
  previewBrand,
  showMiniPreview = false,
  compact = false,
  dark = false
}: GalleryStyleControlsProps) {
  const customColorId = useId();
  const customHexId = useId();

  const tokens = resolveGalleryThemeTokens(values);
  const validAccent = sanitizeHexColor(values.accentColor);
  const fontMeta = FONT_PRESETS[values.fontPreset];
  const gapPx =
    values.gridGap === 'none'
      ? '0px'
      : values.gridGap === 'compact'
        ? '4px'
        : values.gridGap === 'airy'
          ? '12px'
          : '8px';
  const previewRadius =
    values.cardRadius === 'sharp' ? '0px' : values.cardRadius === 'soft' ? '12px' : '6px';

  const applyPalette = (palette: GalleryPalettePreset) => {
    if (onApplyPalette) {
      onApplyPalette(palette);
      return;
    }
    onChange('theme', palette.theme);
    onChange('backgroundColor', palette.backgroundColor);
    onChange('surfaceColor', palette.surfaceColor);
    onChange('textColor', palette.textColor);
    onChange('accentColor', palette.accentColor);
  };

  const isPaletteActive = (p: GalleryPalettePreset) =>
    sanitizeHexColor(values.backgroundColor) === p.backgroundColor &&
    sanitizeHexColor(values.surfaceColor) === p.surfaceColor &&
    sanitizeHexColor(values.textColor) === p.textColor &&
    sanitizeHexColor(values.accentColor) === p.accentColor;

  const showColors = section === 'all' || section === 'colors';
  const showHero = section === 'all' || section === 'layout' || section === 'hero';
  const showFraming = section === 'all' || section === 'layout' || section === 'framing';
  const showLayout = showHero || showFraming;

  return (
    <div
      className={`space-y-4 rounded-xl border p-4 sm:col-span-2 ${
        dark
          ? 'border-[#f4f1ea]/15 bg-[#161513] text-[#f4f1ea]'
          : 'border-stone-200 bg-stone-50/40 text-slate-900'
      }`}
    >
      {showColors && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Palette className={`h-4 w-4 ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`} />
              <h3
                className={`text-xs font-semibold tracking-wide uppercase ${
                  dark ? 'text-[#f4f1ea]' : 'text-slate-800'
                }`}
              >
                Whole-Gallery Atmosphere & Colors
              </h3>
            </div>
            <span
              title={`Text vs background contrast ratio: ${tokens.contrastRatio.toFixed(1)}:1`}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                tokens.contrastRatio >= 4.5
                  ? dark
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {tokens.contrastRatio < 4.5 && <AlertTriangle className="h-2.5 w-2.5" />}
              <span>
                {tokens.contrastRatio >= 7
                  ? 'AAA'
                  : tokens.contrastRatio >= 4.5
                    ? 'AA'
                    : 'Low Contrast'}{' '}
                {tokens.contrastRatio.toFixed(1)}:1
              </span>
            </span>
          </div>

          {/* Curated Whole-Gallery Palettes */}
          <div>
            <span
              className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
            >
              Curated Studio Palettes
            </span>
            <div className={`mt-1.5 grid grid-cols-2 gap-2 ${compact ? '' : 'sm:grid-cols-4'}`}>
              {GALLERY_PALETTES.map((palette) => {
                const active = isPaletteActive(palette);
                const swatchAccent = palette.accentColor || palette.textColor;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => applyPalette(palette)}
                    className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      dark
                        ? `${
                            active
                              ? 'border-[#f4f1ea] bg-[#f4f1ea]/10 ring-1 ring-[#f4f1ea]'
                              : 'border-[#f4f1ea]/14 bg-[#1c1b18] hover:border-[#f4f1ea]/35'
                          } focus-visible:outline-[#f4f1ea]`
                        : `${
                            active
                              ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                              : 'border-stone-200 bg-stone-50/70 hover:border-stone-300'
                          } focus-visible:outline-slate-900`
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-black/15 shadow-2xs"
                    >
                      <span className="w-1/2 h-full" style={{ backgroundColor: palette.backgroundColor }} />
                      <span className="flex w-1/2 h-full flex-col">
                        <span className="h-1/2 w-full" style={{ backgroundColor: palette.surfaceColor }} />
                        <span className="h-1/2 w-full" style={{ backgroundColor: swatchAccent }} />
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold">{palette.label}</span>
                      <span
                        className={`block truncate text-[10px] ${
                          dark ? 'text-[#f4f1ea]/55' : 'text-slate-500'
                        }`}
                      >
                        {palette.tagline}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Whole-Gallery Color Pickers (Collapsible for clean sidebar) */}
          <details
            className={`group rounded-xl border ${
              dark ? 'border-[#f4f1ea]/12 bg-[#1a1916]' : 'border-stone-200 bg-white'
            }`}
          >
            <summary className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold select-none">
              <span>Custom Hex Colors (Background, Surface &amp; Ink)</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid grid-cols-1 gap-2 border-t border-stone-200/70 p-3">
              <ColorControlRow
                label="Gallery Background"
                hint="Auto (from theme)"
                value={values.backgroundColor}
                fallbackHex={tokens.bg}
                onChange={(next) => {
                  onChange('backgroundColor', next);
                  const clean = sanitizeHexColor(next);
                  if (clean) {
                    const lum = getContrastTextColor(clean);
                    onChange('theme', lum === '#ffffff' ? 'dark' : 'light');
                  }
                }}
                onReset={() => onChange('backgroundColor', '')}
                dark={dark}
              />
              <ColorControlRow
                label="Toolbar & Card Surface"
                hint="Auto (tinted from bg)"
                value={values.surfaceColor}
                fallbackHex={tokens.surface}
                onChange={(next) => onChange('surfaceColor', next)}
                onReset={() => onChange('surfaceColor', '')}
                dark={dark}
              />
              <ColorControlRow
                label="Text Ink Color"
                hint="Auto (high contrast)"
                value={values.textColor}
                fallbackHex={tokens.fg}
                onChange={(next) => onChange('textColor', next)}
                onReset={() => onChange('textColor', '')}
                dark={dark}
              />
            </div>
          </details>

          {/* Accent Color */}
          <div>
            <span
              className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
            >
              Accent & Button Color
            </span>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {ACCENT_PRESETS.map((preset) => {
                const active = validAccent === preset.hex;
                const isDefault = preset.hex === '';
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-label={preset.label}
                    aria-pressed={active}
                    title={preset.label}
                    onClick={() => onChange('accentColor', preset.hex)}
                    className={`relative flex h-8 min-w-[32px] items-center justify-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      isDefault ? 'px-2.5 text-xs font-medium' : 'w-8'
                    } ${
                      dark
                        ? `${
                            active
                              ? 'border-[#f4f1ea] ring-2 ring-[#f4f1ea]/35'
                              : 'border-[#f4f1ea]/25 hover:scale-105'
                          } focus-visible:outline-[#f4f1ea]`
                        : `${
                            active
                              ? 'border-slate-900 ring-2 ring-slate-900/25'
                              : 'border-stone-300 hover:scale-105'
                          } focus-visible:outline-slate-900`
                    }`}
                    style={
                      isDefault
                        ? { backgroundColor: tokens.surface, color: tokens.fg }
                        : { backgroundColor: preset.hex, color: getContrastTextColor(preset.hex) }
                    }
                  >
                    {isDefault ? (
                      <span>Auto</span>
                    ) : (
                      active && <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    )}
                  </button>
                );
              })}

              <div
                className={`flex items-center gap-1.5 rounded-full border px-2 py-1 ${
                  dark ? 'border-[#f4f1ea]/20 bg-[#1c1b18]' : 'border-stone-300 bg-stone-50'
                }`}
              >
                <label htmlFor={customColorId} className="sr-only">
                  Custom accent color picker
                </label>
                <input
                  id={customColorId}
                  type="color"
                  value={validAccent || tokens.accent}
                  onChange={(e) => onChange('accentColor', e.target.value.toLowerCase())}
                  className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
                />
                <label htmlFor={customHexId} className="sr-only">
                  Custom accent hex color
                </label>
                <input
                  id={customHexId}
                  type="text"
                  value={values.accentColor}
                  onChange={(e) => onChange('accentColor', e.target.value)}
                  placeholder="#hex"
                  maxLength={7}
                  className={`w-16 bg-transparent font-mono text-xs focus:outline-none ${
                    dark ? 'text-[#f4f1ea]' : 'text-slate-700'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showColors && showLayout && (
        <div className={`border-t ${dark ? 'border-[#f4f1ea]/12' : 'border-stone-200'}`} />
      )}

      {showLayout && (
        <div className="space-y-4">
          {showFraming && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Frame className={`h-4 w-4 ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`} />
                <h3
                  className={`text-xs font-semibold tracking-wide uppercase ${
                    dark ? 'text-[#f4f1ea]' : 'text-slate-800'
                  }`}
                >
                  Typography &amp; Photo Framing
                </h3>
              </div>

              {/* Compact Mobile Live Swatch Preview (visible when main Preview is below the fold) */}
              <div
                aria-label="Compact framing preview"
                className="rounded-xl border p-3 xl:hidden"
                style={{
                  backgroundColor: tokens.bg,
                  color: tokens.fg,
                  borderColor: tokens.border,
                  fontFamily: fontMeta.bodyFamily
                }}
              >
                <p
                  className="truncate text-sm font-bold"
                  style={{ fontFamily: fontMeta.headingFamily }}
                >
                  {previewTitle || 'Gallery Title'}
                </p>
                <div className="mt-2 grid grid-cols-3" style={{ gap: gapPx }}>
                  {['from-amber-200 to-stone-300', 'from-rose-200 to-amber-100', 'from-slate-300 to-stone-200'].map(
                    (grad, i) => (
                      <div
                        key={i}
                        className="overflow-hidden"
                        style={{
                          borderRadius: previewRadius,
                          backgroundColor:
                            values.cardStyle === 'polaroid'
                              ? '#ffffff'
                              : values.cardStyle === 'clean'
                                ? tokens.cardBg
                                : tokens.surface,
                          border:
                            values.cardStyle === 'clean' ? 'none' : `1px solid ${tokens.border}`,
                          padding:
                            values.cardStyle === 'mat'
                              ? '4px'
                              : values.cardStyle === 'polaroid'
                                ? '4px 4px 10px'
                                : '0px',
                          boxShadow:
                            values.cardStyle === 'shadow'
                              ? '0 4px 10px rgba(15,23,42,0.16)'
                              : undefined
                        }}
                      >
                        <div
                          className={`aspect-[4/3] bg-gradient-to-br ${grad}`}
                          style={{
                            borderRadius:
                              values.cardStyle === 'mat' || values.cardStyle === 'polaroid'
                                ? '3px'
                                : previewRadius
                          }}
                        />
                        {values.captionMode === 'below' && values.cardStyle !== 'polaroid' && (
                          <div className="mt-1 h-1 w-8 rounded-full bg-current opacity-35" />
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Typography Presets */}
          {showFraming && (
            <div>
            <span
              className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
            >
              Typography Preset
            </span>
            <div
              role="radiogroup"
              aria-label="Typography Preset"
              className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {FONT_LIST.map((preset) => {
                const selected = values.fontPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange('fontPreset', preset.id)}
                    className={`flex min-h-[48px] items-center justify-between rounded-lg border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      dark
                        ? `${
                            selected
                              ? 'border-[#f4f1ea] bg-[#f4f1ea]/10 ring-1 ring-[#f4f1ea]'
                              : 'border-[#f4f1ea]/15 bg-[#1c1b18] hover:border-[#f4f1ea]/35'
                          } focus-visible:outline-[#f4f1ea]`
                        : `${
                            selected
                              ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                              : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-100/70'
                          } focus-visible:outline-slate-900`
                    }`}
                  >
                    <div>
                      <span
                        className={`block text-sm font-semibold ${
                          dark ? 'text-[#f4f1ea]' : 'text-slate-900'
                        }`}
                        style={{ fontFamily: preset.headingFamily }}
                      >
                        {preset.label}
                      </span>
                      <span
                        className={`block text-[11px] ${
                          dark ? 'text-[#f4f1ea]/60' : 'text-slate-500'
                        }`}
                      >
                        {preset.tagline}
                      </span>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`text-lg font-bold ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
                      style={{ fontFamily: preset.headingFamily }}
                    >
                      Aa
                    </span>
                  </button>
                );
              })}
            </div>
            </div>
          )}

          {/* Hero Style */}
          {showHero && (
            <div>
            <span
              className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
            >
              Cover Hero Style
            </span>
            <div
              role="radiogroup"
              aria-label="Cover Hero Style"
              className="mt-1.5 grid grid-cols-2 gap-2"
            >
              {HERO_LIST.map((opt) => {
                const selected = values.heroStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange('heroStyle', opt.id)}
                    className={`flex flex-col gap-2 rounded-xl border p-2 text-left transition ${
                      dark
                        ? selected
                          ? 'border-[#f4f1ea] bg-[#f4f1ea]/10 ring-1 ring-[#f4f1ea]'
                          : 'border-[#f4f1ea]/15 bg-[#1c1b18] hover:border-[#f4f1ea]/30'
                        : selected
                          ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <HeroStyleIllustration mode={opt.id} />
                    <span className="block text-center text-xs font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
            </div>
          )}

          {/* Card Frame & Captions */}
          {showFraming && (
            <div className="space-y-4">
            <div>
              <span
                className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
              >
                Photo Frame
              </span>
              <div
                role="radiogroup"
                aria-label="Photo Frame"
                className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {CARD_STYLE_LIST.map((opt) => {
                  const selected = values.cardStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange('cardStyle', opt.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition ${
                        dark
                          ? selected
                            ? 'border-[#f4f1ea] bg-[#f4f1ea]/10 ring-1 ring-[#f4f1ea]'
                            : 'border-[#f4f1ea]/15 bg-[#1c1b18] hover:border-[#f4f1ea]/30'
                          : selected
                            ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <CardFrameIllustration mode={opt.id} />
                      <span className="text-[11px] font-semibold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span
                className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
              >
                Filenames &amp; Captions
              </span>
              <div
                role="radiogroup"
                aria-label="Filenames and Captions"
                className="mt-1.5 grid grid-cols-3 gap-2"
              >
                {CAPTION_LIST.map((opt) => {
                  const selected = values.captionMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange('captionMode', opt.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition ${
                        dark
                          ? selected
                            ? 'border-[#f4f1ea] bg-[#f4f1ea]/10 ring-1 ring-[#f4f1ea]'
                            : 'border-[#f4f1ea]/15 bg-[#1c1b18] hover:border-[#f4f1ea]/30'
                          : selected
                            ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <CaptionModeIllustration mode={opt.id} />
                      <span className="text-[11px] font-semibold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            </div>
          )}

          {/* Spacing & Corner Radius */}
          {showFraming && (
            <div className="space-y-4">
            <div>
              <span
                className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
              >
                Photo Spacing
              </span>
              <div
                role="radiogroup"
                aria-label="Photo Spacing"
                className="mt-1.5 grid grid-cols-4 gap-1.5"
              >
                {GAP_LIST.map((opt) => {
                  const selected = values.gridGap === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange('gridGap', opt.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 text-center transition ${
                        dark
                          ? selected
                            ? 'border-[#f4f1ea] bg-[#f4f1ea]/10 ring-1 ring-[#f4f1ea]'
                            : 'border-[#f4f1ea]/15 bg-[#1c1b18] hover:border-[#f4f1ea]/30'
                          : selected
                            ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <SpacingIllustration mode={opt.id} />
                      <span className="text-[11px] font-semibold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span
                className={`block text-xs font-medium ${dark ? 'text-[#f4f1ea]/80' : 'text-slate-700'}`}
              >
                Corner Style
              </span>
              <div
                role="radiogroup"
                aria-label="Corner Style"
                className="mt-1.5 grid grid-cols-3 gap-2"
              >
                {RADIUS_LIST.map((opt) => {
                  const selected = values.cardRadius === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onChange('cardRadius', opt.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                        dark
                          ? selected
                            ? 'border-[#f4f1ea] bg-[#f4f1ea]/10 ring-1 ring-[#f4f1ea]'
                            : 'border-[#f4f1ea]/15 bg-[#1c1b18] hover:border-[#f4f1ea]/30'
                          : selected
                            ? 'border-slate-900 bg-slate-900/5 ring-1 ring-slate-900'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      <CornerRadiusIllustration mode={opt.id} />
                      <span className="text-[11px] font-semibold">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            </div>
          )}
        </div>
      )}

      {/* Optional Mini Preview */}
      {showMiniPreview && (
        <div
          aria-label="Live style preview"
          className="rounded-xl border p-3.5 transition-colors"
          style={{
            backgroundColor: tokens.bg,
            color: tokens.fg,
            borderColor: tokens.border,
            fontFamily: fontMeta.bodyFamily
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase opacity-70">
                <Sparkles className="h-3 w-3" style={{ color: tokens.accent }} />
                <span className="truncate">{previewBrand || 'Your Studio'}</span>
              </p>
              <p
                className="truncate text-base font-bold"
                style={{ fontFamily: fontMeta.headingFamily }}
              >
                {previewTitle || 'Client Gallery Preview'}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ backgroundColor: tokens.accent, color: tokens.accentFg }}
            >
              Download ZIP
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4" style={{ gap: gapPx }}>
            {[
              'from-amber-200/80 to-stone-300/80',
              'from-rose-200/80 to-amber-100/80',
              'from-emerald-200/80 to-teal-100/80',
              'from-slate-300/80 to-stone-200/80'
            ].map((grad, idx) => (
              <div
                key={idx}
                className={`aspect-[4/3] bg-gradient-to-br ${grad}`}
                style={{ borderRadius: previewRadius }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
