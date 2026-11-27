import { Hono } from 'hono';
import type { Env } from '../types';

export interface BibleVersePayload {
  reference: string;
  text: string;
  translation: 'ESV';
  source: 'curated';
}

export const POPULAR_ESV_VERSES: ReadonlyArray<{ reference: string; text: string }> = [
  {
    reference: 'John 3:16',
    text: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.'
  },
  {
    reference: 'Psalm 23:1',
    text: 'The LORD is my shepherd; I shall not want.'
  },
  {
    reference: 'Proverbs 3:5–6',
    text: 'Trust in the LORD with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.'
  },
  {
    reference: 'Philippians 4:13',
    text: 'I can do all things through him who strengthens me.'
  },
  {
    reference: 'Jeremiah 29:11',
    text: 'For I know the plans I have for you, declares the LORD, plans for welfare and not for evil, to give you a future and a hope.'
  },
  {
    reference: 'Romans 8:28',
    text: 'And we know that for those who love God all things work together for good, for those who are called according to his purpose.'
  },
  {
    reference: 'Isaiah 40:31',
    text: 'But they who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.'
  },
  {
    reference: 'Joshua 1:9',
    text: 'Have I not commanded you? Be strong and courageous. Do not be frightened, and do not be dismayed, for the LORD your God is with you wherever you go.'
  },
  {
    reference: 'Philippians 4:6–7',
    text: 'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.'
  },
  {
    reference: '1 Corinthians 13:4–5',
    text: 'Love is patient and kind; love does not envy or boast; it is not arrogant or rude. It does not insist on its own way; it is not irritable or resentful.'
  },
  {
    reference: '1 Corinthians 13:7',
    text: 'Love bears all things, believes all things, hopes all things, endures all things.'
  },
  {
    reference: '1 Corinthians 13:13',
    text: 'So now faith, hope, and love abide, these three; but the greatest of these is love.'
  },
  {
    reference: '1 Corinthians 16:14',
    text: 'Let all that you do be done in love.'
  },
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
    reference: 'Psalm 46:1',
    text: 'God is our refuge and strength, a very present help in trouble.'
  },
  {
    reference: 'Psalm 46:10',
    text: 'Be still, and know that I am God.'
  },
  {
    reference: 'Psalm 27:1',
    text: 'The LORD is my light and my salvation; whom shall I fear? The LORD is the stronghold of my life; of whom shall I be afraid?'
  },
  {
    reference: 'Psalm 27:14',
    text: 'Wait for the LORD; be strong, and let your heart take courage; wait for the LORD!'
  },
  {
    reference: 'Psalm 34:8',
    text: 'Oh, taste and see that the LORD is good! Blessed is the man who takes refuge in him!'
  },
  {
    reference: 'Psalm 37:4',
    text: 'Delight yourself in the LORD, and he will give you the desires of your heart.'
  },
  {
    reference: 'Psalm 100:5',
    text: 'For the LORD is good; his steadfast love endures forever, and his faithfulness to all generations.'
  },
  {
    reference: 'Psalm 121:1–2',
    text: 'I lift up my eyes to the hills. From where does my help come? My help comes from the LORD, who made heaven and earth.'
  },
  {
    reference: 'Psalm 139:14',
    text: 'I praise you, for I am fearfully and wonderfully made. Wonderful are your works; my soul knows it very well.'
  },
  {
    reference: 'Ecclesiastes 3:11',
    text: 'He has made everything beautiful in its time.'
  },
  {
    reference: 'Ecclesiastes 4:9',
    text: 'Two are better than one, because they have a good reward for their toil.'
  },
  {
    reference: 'Lamentations 3:22–23',
    text: 'The steadfast love of the LORD never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.'
  },
  {
    reference: 'Isaiah 41:10',
    text: 'Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you, I will uphold you with my righteous right hand.'
  },
  {
    reference: 'Matthew 5:14',
    text: 'You are the light of the world. A city set on a hill cannot be hidden.'
  },
  {
    reference: 'Matthew 5:16',
    text: 'In the same way, let your light shine before others, so that they may see your good works and give glory to your Father who is in heaven.'
  },
  {
    reference: 'Matthew 6:33',
    text: 'But seek first the kingdom of God and his righteousness, and all these things will be added to you.'
  },
  {
    reference: 'Matthew 11:28',
    text: 'Come to me, all who labor and are heavy laden, and I will give you rest.'
  },
  {
    reference: 'Matthew 19:6',
    text: 'So they are no longer two but one flesh. What therefore God has joined together, let not man separate.'
  },
  {
    reference: 'John 1:5',
    text: 'The light shines in the darkness, and the darkness has not overcome it.'
  },
  {
    reference: 'John 14:27',
    text: 'Peace I leave with you; my peace I give to you. Not as the world gives do I give to you. Let not your hearts be troubled, neither let them be afraid.'
  },
  {
    reference: 'Romans 12:12',
    text: 'Rejoice in hope, be patient in tribulation, be constant in prayer.'
  },
  {
    reference: 'Romans 15:13',
    text: 'May the God of hope fill you with all joy and peace in believing, so that by the power of the Holy Spirit you may abound in hope.'
  },
  {
    reference: '2 Corinthians 5:7',
    text: 'For we walk by faith, not by sight.'
  },
  {
    reference: 'Galatians 5:22–23',
    text: 'But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control; against such things there is no law.'
  },
  {
    reference: 'Ephesians 2:10',
    text: 'For we are his workmanship, created in Christ Jesus for good works, which God prepared beforehand, that we should walk in them.'
  },
  {
    reference: 'Ephesians 4:32',
    text: 'Be kind to one another, tenderhearted, forgiving one another, as God in Christ forgave you.'
  },
  {
    reference: 'Colossians 3:14',
    text: 'And above all these put on love, which binds everything together in perfect harmony.'
  },
  {
    reference: 'Colossians 3:23',
    text: 'Whatever you do, work heartily, as for the Lord and not for men.'
  },
  {
    reference: '1 Thessalonians 5:16–18',
    text: 'Rejoice always, pray without ceasing, give thanks in all circumstances; for this is the will of God in Christ Jesus for you.'
  },
  {
    reference: '2 Timothy 1:7',
    text: 'For God gave us a spirit not of fear but of power and love and self-control.'
  },
  {
    reference: 'Hebrews 11:1',
    text: 'Now faith is the assurance of things hoped for, the conviction of things not seen.'
  },
  {
    reference: 'Hebrews 13:8',
    text: 'Jesus Christ is the same yesterday and today and forever.'
  },
  {
    reference: 'James 1:17',
    text: 'Every good gift and every perfect gift is from above, coming down from the Father of lights, with whom there is no variation or shadow due to change.'
  },
  {
    reference: '1 Peter 5:7',
    text: 'Casting all your anxieties on him, because he cares for you.'
  },
  {
    reference: '1 John 4:19',
    text: 'We love because he first loved us.'
  },
  {
    reference: 'Numbers 6:24–26',
    text: 'The LORD bless you and keep you; the LORD make his face to shine upon you and be gracious to you; the LORD lift up his countenance upon you and give you peace.'
  }
];

export const bibleRouter = new Hono<{ Bindings: Env }>();

bibleRouter.get('/bible/random', (c) => {
  c.header('Cache-Control', 'no-store');
  const exclude = (c.req.query('exclude') || '').trim();
  const pool = exclude
    ? POPULAR_ESV_VERSES.filter((v) => v.reference !== exclude)
    : POPULAR_ESV_VERSES;
  const list = pool.length > 0 ? pool : POPULAR_ESV_VERSES;
  const pick = list[Math.floor(Math.random() * list.length)] || POPULAR_ESV_VERSES[0];

  return c.json<BibleVersePayload>({
    reference: pick.reference,
    text: pick.text,
    translation: 'ESV',
    source: 'curated'
  });
});
