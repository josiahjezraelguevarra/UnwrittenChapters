import { Hono } from 'hono';
import type { Env } from '../types';

export interface BibleVersePayload {
  reference: string;
  text: string;
  translation: 'ESV';
  source: 'api' | 'fallback';
}

const BIBLE_BOOKS: readonly string[] = [
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalms',
  'Proverbs',
  'Ecclesiastes',
  'Song of Solomon',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation'
];

const ESV_FALLBACK_VERSES: ReadonlyArray<{ reference: string; text: string }> = [
  {
    reference: 'Psalm 19:1',
    text: 'The heavens declare the glory of God, and the sky above proclaims his handiwork.'
  },
  {
    reference: 'Psalm 118:24',
    text: 'This is the day that the LORD has made; let us rejoice and be glad in it.'
  },
  {
    reference: 'Psalm 119:105',
    text: 'Your word is a lamp to my feet and a light to my path.'
  },
  {
    reference: 'Ecclesiastes 3:11',
    text: 'He has made everything beautiful in its time.'
  },
  {
    reference: 'Lamentations 3:22–23',
    text: 'The steadfast love of the LORD never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.'
  },
  {
    reference: 'John 1:5',
    text: 'The light shines in the darkness, and the darkness has not overcome it.'
  },
  {
    reference: '1 Corinthians 16:14',
    text: 'Let all that you do be done in love.'
  },
  {
    reference: 'James 1:17',
    text: 'Every good gift and every perfect gift is from above, coming down from the Father of lights, with whom there is no variation or shadow due to change.'
  },
  {
    reference: 'Colossians 3:23',
    text: 'Whatever you do, work heartily, as for the Lord and not for men'
  },
  {
    reference: 'Psalm 27:14',
    text: 'Wait for the LORD; be strong, and let your heart take courage; wait for the LORD!'
  },
  {
    reference: 'Isaiah 40:31',
    text: '...but they who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.'
  },
  {
    reference: 'Proverbs 3:5',
    text: 'Trust in the LORD with all your heart, and do not lean on your own understanding.'
  }
];

function sanitizeVerseText(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&rsquo;/gi, '’')
    .replace(/&lsquo;/gi, '‘')
    .replace(/&rdquo;/gi, '”')
    .replace(/&ldquo;/gi, '“')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickFallbackVerse(): BibleVersePayload {
  const pick =
    ESV_FALLBACK_VERSES[Math.floor(Math.random() * ESV_FALLBACK_VERSES.length)] ||
    ESV_FALLBACK_VERSES[0];
  return {
    reference: pick.reference,
    text: pick.text,
    translation: 'ESV',
    source: 'fallback'
  };
}

interface BollsRandomVerseResponse {
  book?: number;
  chapter?: number;
  verse?: number;
  text?: string;
}

export const bibleRouter = new Hono<{ Bindings: Env }>();

bibleRouter.get('/bible/random', async (c) => {
  c.header('Cache-Control', 'no-store');

  try {
    const upstream = await fetch('https://bolls.life/get-random-verse/ESV/', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'UnwrittenChapters/1.0'
      },
      signal: AbortSignal.timeout(4500)
    });

    if (!upstream.ok) {
      return c.json(pickFallbackVerse());
    }

    const data = (await upstream.json()) as BollsRandomVerseResponse;
    const bookIndex = typeof data.book === 'number' ? Math.trunc(data.book) - 1 : -1;
    const bookName = BIBLE_BOOKS[bookIndex];
    const chapter = typeof data.chapter === 'number' ? data.chapter : null;
    const verseNum = typeof data.verse === 'number' ? data.verse : null;
    const cleanText = typeof data.text === 'string' ? sanitizeVerseText(data.text) : '';

    if (!bookName || !chapter || !verseNum || !cleanText) {
      return c.json(pickFallbackVerse());
    }

    return c.json<BibleVersePayload>({
      reference: `${bookName} ${chapter}:${verseNum}`,
      text: cleanText,
      translation: 'ESV',
      source: 'api'
    });
  } catch {
    return c.json(pickFallbackVerse());
  }
});
