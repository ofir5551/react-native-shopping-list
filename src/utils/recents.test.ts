import { sanitizeRecents, MAX_RECENTS } from './recents';

describe('sanitizeRecents', () => {
  it('returns empty array for empty input', () => {
    expect(sanitizeRecents([])).toEqual([]);
  });

  it('passes through fewer than MAX_RECENTS items unchanged', () => {
    const items = ['apple', 'banana', 'cherry'];
    expect(sanitizeRecents(items)).toEqual(items);
  });

  it('caps at MAX_RECENTS (12)', () => {
    const items = Array.from({ length: 15 }, (_, i) => `item${i}`);
    const result = sanitizeRecents(items);
    expect(result).toHaveLength(MAX_RECENTS);
  });

  it('keeps exactly MAX_RECENTS items when input is exactly MAX_RECENTS', () => {
    const items = Array.from({ length: MAX_RECENTS }, (_, i) => `item${i}`);
    expect(sanitizeRecents(items)).toHaveLength(MAX_RECENTS);
  });

  it('deduplicates keeping first occurrence', () => {
    const items = ['apple', 'banana', 'apple', 'cherry'];
    expect(sanitizeRecents(items)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('deduplicates and then caps', () => {
    // 8 unique + many dupes; result should be 8 unique (under cap)
    const unique = Array.from({ length: 8 }, (_, i) => `item${i}`);
    const withDupes = [...unique, ...unique, ...unique];
    expect(sanitizeRecents(withDupes)).toEqual(unique);
  });

  it('handles duplicates interspersed across many items', () => {
    const items = ['a', 'b', 'a', 'c', 'b', 'd'];
    expect(sanitizeRecents(items)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('MAX_RECENTS is 12', () => {
    expect(MAX_RECENTS).toBe(12);
  });
});
