import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Shuffle } from 'lucide-react';
import { hexToRgba } from '../../shared/customization';
import { fetchRandomBibleVerse, type BibleVerseResponse } from '../lib/api';

const CLIENT_FALLBACK_VERSES: ReadonlyArray<BibleVerseResponse> = [
  {
    reference: 'Psalm 19:1',
    text: 'The heavens declare the glory of God, and the sky above proclaims his handiwork.',
    translation: 'ESV'
  },
  {
    reference: 'John 1:5',
    text: 'The light shines in the darkness, and the darkness has not overcome it.',
    translation: 'ESV'
  },
  {
    reference: 'Lamentations 3:22–23',
    text: 'The steadfast love of the LORD never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.',
    translation: 'ESV'
  },
  {
    reference: 'Psalm 118:24',
    text: 'This is the day that the LORD has made; let us rejoice and be glad in it.',
    translation: 'ESV'
  }
];

function getRandomClientFallback(excludeRef?: string): BibleVerseResponse {
  const pool = excludeRef
    ? CLIENT_FALLBACK_VERSES.filter((v) => v.reference !== excludeRef)
    : CLIENT_FALLBACK_VERSES;
  const list = pool.length > 0 ? pool : CLIENT_FALLBACK_VERSES;
  return list[Math.floor(Math.random() * list.length)] || CLIENT_FALLBACK_VERSES[0];
}

interface VerseTickerBarProps {
  dark?: boolean;
  customColors?: {
    bg: string;
    fg: string;
    border: string;
  };
}

export function VerseTickerBar({ dark = false, customColors }: VerseTickerBarProps) {
  const [verse, setVerse] = useState<BibleVerseResponse | null>(null);
  const [verseSeq, setVerseSeq] = useState(0);
  const [shuffling, setShuffling] = useState(false);

  const mountedRef = useRef(true);
  const currentRef = useRef<BibleVerseResponse | null>(null);

  useEffect(() => {
    currentRef.current = verse;
  }, [verse]);

  const loadOneVerse = useCallback(async (avoidRef?: string): Promise<BibleVerseResponse> => {
    try {
      const result = await fetchRandomBibleVerse();
      if (result.reference && result.text) {
        return result;
      }
    } catch {
      // Fallback below
    }
    return getRandomClientFallback(avoidRef);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

    void (async () => {
      try {
        const result = await fetchRandomBibleVerse(controller.signal);
        if (!mountedRef.current || controller.signal.aborted) return;
        setVerse(result.reference && result.text ? result : getRandomClientFallback());
        setVerseSeq((seq) => seq + 1);
      } catch {
        if (!mountedRef.current || controller.signal.aborted) return;
        setVerse(getRandomClientFallback());
        setVerseSeq((seq) => seq + 1);
      }
    })();

    return () => {
      controller.abort();
      mountedRef.current = false;
    };
  }, []);

  const handleManualShuffle = async () => {
    if (shuffling) return;
    setShuffling(true);
    try {
      const fresh = await loadOneVerse(currentRef.current?.reference);
      if (!mountedRef.current) return;
      setVerse(fresh);
      setVerseSeq((seq) => seq + 1);
    } finally {
      if (mountedRef.current) {
        setShuffling(false);
      }
    }
  };

  const repeatPerHalf = verse
    ? verse.text.length < 70
      ? 6
      : verse.text.length < 150
        ? 4
        : 3
    : 4;
  const durationSec = verse
    ? Math.max(40, Math.round(repeatPerHalf * (verse.text.length * 0.14 + 7)))
    : 60;

  return (
    <section
      aria-label="Scrolling ESV Bible verses"
      className={`fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-md transition-colors ${
        customColors
          ? ''
          : dark
            ? 'border-[#f4f1ea]/12 bg-[#161512]/94 text-[#f4f1ea]'
            : 'border-[#141311]/12 bg-[#f3efe7]/94 text-[#141311]'
      }`}
      style={
        customColors
          ? {
              backgroundColor: hexToRgba(customColors.bg, 0.94),
              color: customColors.fg,
              borderColor: customColors.border
            }
          : undefined
      }
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:gap-3 sm:px-6">
        <div
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            customColors
              ? ''
              : dark
                ? 'border-[#f4f1ea]/18 bg-[#12110f] text-[#f4f1ea]/80'
                : 'border-[#141311]/14 bg-[#f8f6f2] text-[#141311]/75'
          }`}
          style={
            customColors
              ? {
                  borderColor: customColors.border,
                  backgroundColor: hexToRgba(customColors.fg, 0.06),
                  color: hexToRgba(customColors.fg, 0.8)
                }
              : undefined
          }
        >
          <BookOpen className="h-3 w-3 opacity-70" />
          <span>ESV</span>
        </div>

        <div className="uc-verse-marquee-container relative min-w-0 flex-1 overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6"
            style={{
              background: `linear-gradient(to right, ${
                customColors ? customColors.bg : dark ? '#161512' : '#f3efe7'
              }, transparent)`
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6"
            style={{
              background: `linear-gradient(to left, ${
                customColors ? customColors.bg : dark ? '#161512' : '#f3efe7'
              }, transparent)`
            }}
          />

          {verse ? (
            <div
              key={verseSeq}
              style={{ animationDuration: `${durationSec}s` }}
              className="uc-verse-marquee items-center py-0.5"
            >
              {[0, 1].map((loopIndex) => (
                <div
                  key={loopIndex}
                  aria-hidden={loopIndex === 1 ? true : undefined}
                  className="flex shrink-0 items-center gap-8 pr-8"
                >
                  {Array.from({ length: repeatPerHalf }).map((_, copyIndex) => (
                    <p
                      key={`${loopIndex}-${copyIndex}`}
                      aria-hidden={copyIndex > 0 ? true : undefined}
                      className="inline-flex shrink-0 items-baseline gap-2.5 text-xs whitespace-nowrap sm:text-[13px]"
                    >
                      <span className="text-[13px] opacity-90">“{verse.text}”</span>
                      <span className="text-xs opacity-60">
                        — {verse.reference} ({verse.translation})
                      </span>
                      <span aria-hidden="true" className="ml-4 opacity-25">
                        ·
                      </span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center py-0.5 text-xs opacity-55">
              <span className="opacity-75">Loading ESV Scripture...</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleManualShuffle}
          disabled={shuffling}
          aria-label="Shuffle ESV verse"
          title="Load random ESV verse"
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 ${
            customColors
              ? 'hover:opacity-100'
              : dark
                ? 'border-[#f4f1ea]/15 text-[#f4f1ea]/70 hover:bg-[#f4f1ea]/10 hover:text-[#f4f1ea]'
                : 'border-[#141311]/12 text-[#141311]/65 hover:bg-[#141311]/5 hover:text-[#141311]'
          }`}
          style={
            customColors
              ? {
                  borderColor: customColors.border,
                  color: hexToRgba(customColors.fg, 0.72)
                }
              : undefined
          }
        >
          <Shuffle className={`h-3 w-3 ${shuffling ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </section>
  );
}
