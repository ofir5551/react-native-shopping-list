const QUANTITY_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  dozen: 12,
  couple: 2,
  few: 3,
  half: 1,
};

const FILLER_PREFIXES = [
  "can you get",
  "i need to get",
  "i need",
  "i want",
  "get me",
  "please get",
  "maybe some",
  "maybe",
  "also some",
  "also",
  "a bit of",
  "a little",
  "some",
  "please",
  "and also",
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

function splitOnNumberBoundaries(text: string): string[] {
  // "5 bread 2 milk 3 eggs" → ["5 bread", "2 milk", "3 eggs"]
  return text.split(/\s+(?=\d+\s)/).filter(Boolean);
}

export function parseTranscript(transcript: string): { name: string; quantity: number }[] {
  if (!transcript.trim()) return [];

  // Split on comma, "and", "next", "then", or newline
  const rawParts = transcript
    .split(/,|\band\b|\bnext\b|\bthen\b|\n/i)
    .map((p) => p.trim())
    .filter(Boolean);

  // Further split each part on number boundaries
  const parts = rawParts.flatMap(splitOnNumberBoundaries);

  const seen = new Set<string>();
  const results: { name: string; quantity: number }[] = [];

  for (const part of parts) {
    const stripped = stripFillers(part);
    if (!stripped) continue;

    const { name, quantity } = extractQuantity(stripped);
    const normalized = name.toLowerCase().trim();
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    // Preserve original casing from the first word-boundary match in the stripped text
    results.push({ name: name.trim(), quantity });
  }

  return results;
}
