const QUANTITY_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,  won: 1,
  two: 2,  to: 2, too: 2,
  three: 3, tree: 3,
  four: 4,  for: 4, fore: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8, ate: 8,
  nine: 9,  nein: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  dozen: 12,
  couple: 2,
  few: 3,
  half: 1,
};

const FILLER_PREFIXES = [
  // polite requests
  "can you pick up",
  "can you grab",
  "can you buy",
  "can you get",
  "could you pick up",
  "could you grab",
  "could you buy",
  "could you get",
  // "we" variants (shared lists)
  "we need to get",
  "we need to buy",
  "we need some",
  "we need",
  "we want some",
  "we want",
  "we're out of",
  "we ran out of",
  "we're missing",
  // "i" variants
  "i need to get",
  "i need to buy",
  "i need",
  "i want",
  "i'd like some",
  "i'd like",
  "i'd love some",
  "i'd love",
  // reminders
  "don't forget to get",
  "don't forget to buy",
  "don't forget",
  "remember to get",
  "remember to buy",
  "remember",
  // imperative
  "please pick up",
  "please grab",
  "please buy",
  "please get",
  "pick up some",
  "pick up",
  "grab some",
  "grab me",
  "grab",
  "buy some",
  "buy me",
  "buy",
  "get me",
  "add some",
  "add",
  // self-corrections (quantity changes)
  "make it",
  "change it to",
  "change that to",
  "no wait",
  "actually",
  "wait no",
  "scratch that",
  "never mind",
  "correction",
  // softeners
  "maybe some",
  "maybe",
  "just some",
  "just a",
  "just",
  "a bit of",
  "a little",
  "some",
  "please",
  "oh",
];

function stripFillers(text: string): string {
  let s = text.trim().toLowerCase();
  for (const filler of FILLER_PREFIXES) {
    if (s === filler || s.startsWith(filler + " ")) {
      s = s.slice(filler.length).trim();
    }
  }
  return s;
}

function extractQuantity(text: string): { name: string; quantity: number } {
  // Leading digit(s): "2 apples", "12 eggs"
  const leadingDigit = text.match(/^(\d+)\s+(.+)$/);
  if (leadingDigit) {
    return { name: leadingDigit[2].trim(), quantity: parseInt(leadingDigit[1], 10) };
  }

  // Trailing x-pattern: "apples x2", "milk x 3"
  const trailingX = text.match(/^(.+?)\s+x\s*(\d+)$/i);
  if (trailingX) {
    return { name: trailingX[1].trim(), quantity: parseInt(trailingX[2], 10) };
  }

  // Leading quantity word: "two apples", "a dozen eggs", "a couple of bananas"
  const words = text.split(/\s+/);
  if (words.length >= 2) {
    // Handle "a dozen X" or "a couple of X"
    if (words[0] === 'a' && words[1] && QUANTITY_WORDS[words[1]] !== undefined && words[1] !== 'a' && words[1] !== 'an') {
      const qty = QUANTITY_WORDS[words[1]];
      const rest = words.slice(2).join(' ').replace(/^of\s+/, '').trim();
      if (rest) return { name: rest, quantity: qty };
    }

    const firstWord = words[0].toLowerCase();
    if (QUANTITY_WORDS[firstWord] !== undefined && words.length > 1) {
      const qty = QUANTITY_WORDS[firstWord];
      const rest = words.slice(1).join(' ').replace(/^of\s+/, '').trim();
      return { name: rest, quantity: qty };
    }
  }

  return { name: text.trim(), quantity: 1 };
}

const QUANTITY_WORD_SPLIT_RE = /\s+(?=(?:\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s)/i;

function splitOnNumberBoundaries(text: string): string[] {
  // "5 bread 2 milk" → ["5 bread", "2 milk"]
  // "two bread three cheese" → ["two bread", "three cheese"]
  return text.split(QUANTITY_WORD_SPLIT_RE).filter(Boolean);
}

export function parseTranscript(transcript: string): { name: string; quantity: number }[] {
  if (!transcript.trim()) return [];

  // Split on comma, "and", "next", "then", or newline
  const rawParts = transcript
    .split(/,|\band\b|\bnext\b|\bthen\b|\bplus\b|\balso\b|\bcomma\b|\n/i)
    .map((p) => p.trim())
    .filter(Boolean);

  // Further split each part on number boundaries
  const parts = rawParts.flatMap(splitOnNumberBoundaries);

  const indexMap = new Map<string, number>();
  const results: { name: string; quantity: number }[] = [];

  for (const part of parts) {
    const stripped = stripFillers(part);
    if (!stripped) continue;

    const { name, quantity } = extractQuantity(stripped);
    const normalized = name.toLowerCase().trim();
    if (!normalized) continue;

    const existing = indexMap.get(normalized);
    if (existing !== undefined) {
      // Self-correction — replace with the latest quantity
      results[existing] = { name: name.trim(), quantity };
    } else {
      indexMap.set(normalized, results.length);
      results.push({ name: name.trim(), quantity });
    }
  }

  return results;
}
