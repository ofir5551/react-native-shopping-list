import { Locale } from '../i18n/index';
import { SPEECH_LEXICON, SpeechLexicon } from '../data/speechLexicon';

export type ParsedItem = { name: string; quantity: number };

export type VoiceCommand =
  | { type: 'add'; name: string; quantity: number }
  | { type: 'remove'; name: string }
  | { type: 'undo' }
  | { type: 'clear' };

type UnitKind = 'sep' | 'noise' | 'filler' | 'remove' | 'undo' | 'clear' | 'number' | 'word';
type Unit = { kind: UnitKind; text: string };

type CompiledLexicon = {
  lex: SpeechLexicon;
  phrases: Map<string, UnitKind>;
  maxPhraseTokens: number;
  splittingNumbers: Set<string>;
};

const DIGITS_RE = /^\d+(\.\d+)?$/;
const DIGITS_X_RE = /^(\d+)x$/;
const X_DIGITS_RE = /^x(\d+)$/;
const SEP_TOKEN = ',';

const compiledCache = new Map<Locale, CompiledLexicon>();

function compile(locale: Locale): CompiledLexicon {
  const cached = compiledCache.get(locale);
  if (cached) return cached;
  const lex = SPEECH_LEXICON[locale];
  const phrases = new Map<string, UnitKind>();
  // Later groups win on exact duplicates, so commands take priority over fillers
  const groups: [string[], UnitKind][] = [
    [Object.keys(lex.numbers), 'number'],
    [lex.fillers, 'filler'],
    [lex.noise, 'noise'],
    [lex.separators, 'sep'],
    [lex.removeVerbs, 'remove'],
    [lex.undoPhrases, 'undo'],
    [lex.clearPhrases, 'clear'],
  ];
  for (const [list, kind] of groups) {
    for (const phrase of list) phrases.set(phrase, kind);
  }
  const maxPhraseTokens = Math.max(...[...phrases.keys()].map((p) => p.split(' ').length));
  const nonSplitting = new Set(lex.nonSplittingNumbers);
  const splittingNumbers = new Set(Object.keys(lex.numbers).filter((n) => !nonSplitting.has(n)));
  const compiled = { lex, phrases, maxPhraseTokens, splittingNumbers };
  compiledCache.set(locale, compiled);
  return compiled;
}

function tokenize(text: string, lex: SpeechLexicon, vocab: Vocabulary | null): string[] {
  const normalized = text
    .toLowerCase()
    // Sentence punctuation separates items too, but not the point in decimals: "1.5 liters"
    .replace(/[\n,،;:?!]|\.(?!\d)/g, ` ${SEP_TOKEN} `)
    .replace(/[-־]/g, ' ');
  const tokens: string[] = [];
  for (const token of normalized.split(/\s+/).filter(Boolean)) {
    // Hebrew "and" is a prefix: "וביצים" → separator + "ביצים", "ו2" → separator + "2"
    if (
      (token.length > 2 || /^ו\d/.test(token)) &&
      token.startsWith('ו') &&
      !token.startsWith('וו') &&
      !lex.vavExceptions.includes(token) &&
      !lex.separators.includes(token) &&
      !vocab?.keys.has(matchKey(token))
    ) {
      tokens.push(SEP_TOKEN, token.slice(1));
    } else {
      tokens.push(token);
    }
  }
  return tokens;
}

function toUnits(tokens: string[], compiled: CompiledLexicon): Unit[] {
  const units: Unit[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i] === SEP_TOKEN) {
      units.push({ kind: 'sep', text: SEP_TOKEN });
      i++;
      continue;
    }
    let matched = false;
    for (let len = Math.min(compiled.maxPhraseTokens, tokens.length - i); len > 0; len--) {
      const phrase = tokens.slice(i, i + len).join(' ');
      const kind = compiled.phrases.get(phrase);
      if (kind) {
        units.push({ kind, text: phrase });
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const token = tokens[i];
      const isNumber = DIGITS_RE.test(token) || DIGITS_X_RE.test(token);
      units.push({ kind: isNumber ? 'number' : 'word', text: token });
      i++;
    }
  }
  return units;
}

function isSplittingNumber(unit: Unit, compiled: CompiledLexicon): boolean {
  if (unit.kind !== 'number') return false;
  return DIGITS_RE.test(unit.text) || DIGITS_X_RE.test(unit.text) || compiled.splittingNumbers.has(unit.text);
}

/** Groups units into item/command segments */
function segment(units: Unit[], compiled: CompiledLexicon): Unit[][] {
  const segments: Unit[][] = [];
  let current: Unit[] = [];
  const flush = () => {
    if (current.length) segments.push(current);
    current = [];
  };
  // True while the segment holds nothing but a lead-in ("i need", "remove") — a quantity
  // there belongs to the upcoming item rather than starting a new one
  const onlyLeadIn = () => current.every((u) => u.kind === 'filler' || u.kind === 'remove');

  units.forEach((unit, index) => {
    switch (unit.kind) {
      case 'sep':
        flush();
        break;
      case 'noise':
        break;
      case 'undo':
      case 'clear':
        flush();
        segments.push([unit]);
        break;
      case 'remove':
        flush();
        current.push(unit);
        break;
      default: {
        const isLast = index === units.length - 1 || units[index + 1].kind === 'sep';
        if (isSplittingNumber(unit, compiled) && !isLast && !onlyLeadIn()) flush();
        current.push(unit);
      }
    }
  });
  flush();
  return segments;
}

function stripLeadingFillers(units: Unit[]): { rest: Unit[]; lastFiller?: string } {
  let start = 0;
  while (start < units.length && units[start].kind === 'filler') start++;
  return { rest: units.slice(start), lastFiller: start > 0 ? units[start - 1].text : undefined };
}

function matchPhraseAtStart(tokens: string[], phrases: string[]): number {
  let best = 0;
  for (const phrase of phrases) {
    const parts = phrase.split(' ');
    if (parts.length > best && parts.every((p, i) => tokens[i] === p)) best = parts.length;
  }
  return best;
}

/** Extracts quantity from a filler-free item phrase */
function extractQuantity(units: Unit[], lex: SpeechLexicon): { name: string; quantity: number; hasQuantity: boolean } {
  let tokens = units.map((u) => u.text).join(' ').split(' ').filter(Boolean);
  let quantity = 1;
  let hasQuantity = false;

  // Leading quantity: "2 apples", "2x milk", "a dozen eggs", "שתי ביצים"
  const first = units[0];
  if (first?.kind === 'number') {
    const digits = first.text.match(DIGITS_X_RE)?.[1] ?? (DIGITS_RE.test(first.text) ? first.text : null);
    const value = digits !== null ? parseFloat(digits) : lex.numbers[first.text];
    const rest = tokens.slice(first.text.split(' ').length);
    // A bare number ("2" while the item is still being spoken) is not an item
    if (rest.length === 0) return { name: '', quantity: 1, hasQuantity: false };
    if (value !== undefined) {
      quantity = value;
      hasQuantity = true;
      tokens = rest;
      if (tokens[0] === 'of') tokens = tokens.slice(1);
    }
  }

  // Trailing quantity: "apples x2", "milk x 3", "eggs times 3", "לחם אחד"
  if (!hasQuantity && tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    const beforeLast = tokens[tokens.length - 2];
    const xMatch = last.match(X_DIGITS_RE);
    if (xMatch) {
      quantity = parseInt(xMatch[1], 10);
      hasQuantity = true;
      tokens = tokens.slice(0, -1);
    } else if (DIGITS_RE.test(last) && (beforeLast === 'x' || beforeLast === 'times') && tokens.length > 2) {
      quantity = parseInt(last, 10);
      hasQuantity = true;
      tokens = tokens.slice(0, -2);
    } else if (lex.trailingNumbers[last] !== undefined) {
      quantity = lex.trailingNumbers[last];
      hasQuantity = true;
      tokens = tokens.slice(0, -1);
    }
  }

  // Measure units keep the amount in the name: "500 grams of cheese", and so do fractions: "1.5 milk"
  if (hasQuantity && (lex.measures.includes(tokens[0]) || !Number.isInteger(quantity))) {
    return { name: [String(quantity), ...tokens].join(' '), quantity: 1, hasQuantity: false };
  }

  // Count containers: "bottles of water" → "water"
  const containerLen = matchPhraseAtStart(tokens, lex.containers);
  if (containerLen > 0 && tokens.length > containerLen) tokens = tokens.slice(containerLen);

  return { name: tokens.join(' '), quantity, hasQuantity };
}

const EN_ARTICLES = new Set(['the', 'a', 'an', 'my', 'some']);

function singular(word: string): string {
  // "-ies" plurals come from both "-y" and "-ie" singulars, so map all three to "-y":
  // berries/berry, cookies/cookie, pies/pie
  if (word.endsWith('ies') && word.length > 3) return word.slice(0, -3) + 'y';
  if (word.endsWith('ie')) return word.slice(0, -2) + 'y';
  if (word.length <= 3) return word;
  if (/(oes|ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** Normalized identity of an item name, tolerant to articles and plural forms */
export function matchKey(name: string): string {
  const words = name.toLowerCase().trim().split(/\s+/).filter(Boolean);
  while (words.length > 1 && EN_ARTICLES.has(words[0])) words.shift();
  if (words.length === 0) return '';
  // Hebrew definite article: "החלב" ↔ "חלב"
  if (words[0].length > 2 && words[0].startsWith('ה')) words[0] = words[0].slice(1);
  words[words.length - 1] = singular(words[words.length - 1]);
  return words.join(' ');
}

export type Vocabulary = { keys: Set<string>; maxTokens: number };

/** Build once and reuse — parseCommands runs on every interim speech result */
export function buildVocabulary(vocabulary: string[] | undefined): Vocabulary | null {
  if (!vocabulary?.length) return null;
  const keys = new Set<string>();
  let maxTokens = 1;
  for (const entry of vocabulary) {
    const key = matchKey(entry.replace(/[-־]/g, ' '));
    if (!key) continue;
    keys.add(key);
    maxTokens = Math.max(maxTokens, key.split(' ').length);
  }
  return { keys, maxTokens };
}

/**
 * Splits "milk eggs bread" into known items when every word is covered by the vocabulary.
 * Prefers the fewest pieces, so "peanut butter" stays whole when it is a known item.
 */
function splitByVocabulary(name: string, vocab: Vocabulary): string[] {
  const tokens = name.split(' ');
  if (tokens.length < 2) return [name];
  const n = tokens.length;
  const best: number[] = new Array(n + 1).fill(Infinity);
  const prev: number[] = new Array(n + 1).fill(-1);
  best[0] = 0;
  for (let end = 1; end <= n; end++) {
    for (let start = Math.max(0, end - vocab.maxTokens); start < end; start++) {
      if (best[start] === Infinity) continue;
      if (!vocab.keys.has(matchKey(tokens.slice(start, end).join(' ')))) continue;
      if (best[start] + 1 < best[end]) {
        best[end] = best[start] + 1;
        prev[end] = start;
      }
    }
  }
  if (best[n] === Infinity || best[n] === 1) return [name];
  const pieces: string[] = [];
  for (let end = n; end > 0; end = prev[end]) pieces.unshift(tokens.slice(prev[end], end).join(' '));
  return pieces;
}

function stripHebrewArticleAfterEt(name: string, lastFiller: string | undefined): string {
  // "תקנה את החלב" → "חלב": after the object marker the ה is the definite article
  if (lastFiller === 'את' && name.length > 2 && name.startsWith('ה')) return name.slice(1);
  return name;
}

export function parseCommands(text: string, locale: Locale, vocab: Vocabulary | null = null): VoiceCommand[] {
  if (!text.trim()) return [];
  const compiled = compile(locale);
  const commands: VoiceCommand[] = [];

  for (const seg of segment(toUnits(tokenize(text, compiled.lex, vocab), compiled), compiled)) {
    const head = seg[0];
    if (head.kind === 'undo') {
      commands.push({ type: 'undo' });
      continue;
    }
    if (head.kind === 'clear') {
      commands.push({ type: 'clear' });
      continue;
    }
    if (head.kind === 'remove') {
      const { rest, lastFiller } = stripLeadingFillers(seg.slice(1));
      const target = rest.map((u) => u.text).join(' ');
      if (!target || compiled.lex.pronouns.includes(target)) {
        commands.push({ type: 'undo' });
        continue;
      }
      const { name } = extractQuantity(rest, compiled.lex);
      if (name) commands.push({ type: 'remove', name: stripHebrewArticleAfterEt(name, lastFiller) });
      continue;
    }

    const { rest, lastFiller } = stripLeadingFillers(seg);
    if (rest.length === 0) continue;
    const { name: rawName, quantity } = extractQuantity(rest, compiled.lex);
    const name = stripHebrewArticleAfterEt(rawName, lastFiller);
    if (!name) continue;
    const pieces = vocab ? splitByVocabulary(name, vocab) : [name];
    pieces.forEach((piece, i) => commands.push({ type: 'add', name: piece, quantity: i === 0 ? quantity : 1 }));
  }
  return commands;
}

export function applyCommands(commands: VoiceCommand[]): ParsedItem[] {
  let items: ParsedItem[] = [];
  // Keys in the order they were last added or updated — "undo" pops the newest
  let recency: string[] = [];

  const removeKey = (key: string) => {
    items = items.filter((item) => matchKey(item.name) !== key);
    recency = recency.filter((k) => k !== key);
  };

  for (const command of commands) {
    switch (command.type) {
      case 'add': {
        const key = matchKey(command.name);
        const index = items.findIndex((item) => matchKey(item.name) === key);
        const item = { name: command.name, quantity: command.quantity };
        if (index >= 0) {
          // Self-correction — keep the position, take the latest name and quantity
          items[index] = item;
        } else {
          items.push(item);
        }
        recency = [...recency.filter((k) => k !== key), key];
        break;
      }
      case 'remove':
        removeKey(matchKey(command.name));
        break;
      case 'undo': {
        const last = recency[recency.length - 1];
        if (last !== undefined) removeKey(last);
        break;
      }
      case 'clear':
        items = [];
        recency = [];
        break;
    }
  }
  return items;
}
