import { parseTranscript } from './itemParser';

describe('parseTranscript', () => {
  it('returns empty array for empty input', () => {
    expect(parseTranscript('')).toEqual([]);
    expect(parseTranscript('   ')).toEqual([]);
  });

  it('parses a single item with no quantity', () => {
    expect(parseTranscript('milk')).toEqual([{ name: 'milk', quantity: 1 }]);
  });

  it('parses leading digit quantity', () => {
    expect(parseTranscript('2 apples')).toEqual([{ name: 'apples', quantity: 2 }]);
    expect(parseTranscript('12 eggs')).toEqual([{ name: 'eggs', quantity: 12 }]);
  });

  it('parses leading word quantity', () => {
    expect(parseTranscript('two eggs')).toEqual([{ name: 'eggs', quantity: 2 }]);
    expect(parseTranscript('three bananas')).toEqual([{ name: 'bananas', quantity: 3 }]);
  });

  it('parses "a dozen" quantity', () => {
    expect(parseTranscript('a dozen eggs')).toEqual([{ name: 'eggs', quantity: 12 }]);
  });

  it('parses trailing x-pattern', () => {
    expect(parseTranscript('apples x2')).toEqual([{ name: 'apples', quantity: 2 }]);
    expect(parseTranscript('milk x 3')).toEqual([{ name: 'milk', quantity: 3 }]);
  });

  it('splits on comma', () => {
    const result = parseTranscript('milk, eggs, bread');
    expect(result).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'eggs', quantity: 1 },
      { name: 'bread', quantity: 1 },
    ]);
  });

  it('splits on "and"', () => {
    const result = parseTranscript('milk and eggs and bread');
    expect(result).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'eggs', quantity: 1 },
      { name: 'bread', quantity: 1 },
    ]);
  });

  it('strips filler words', () => {
    expect(parseTranscript('I need milk')).toEqual([{ name: 'milk', quantity: 1 }]);
    expect(parseTranscript('get me eggs')).toEqual([{ name: 'eggs', quantity: 1 }]);
    expect(parseTranscript('some bread')).toEqual([{ name: 'bread', quantity: 1 }]);
    expect(parseTranscript('also butter')).toEqual([{ name: 'butter', quantity: 1 }]);
  });

  it('deduplicates by normalized name, keeping last occurrence', () => {
    const result = parseTranscript('milk and eggs and milk');
    expect(result).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'eggs', quantity: 1 },
    ]);
  });

  it('replaces quantity on repeated item (self-correction)', () => {
    const result = parseTranscript('4 cheese and 2 milk and 3 cheese');
    expect(result).toEqual([
      { name: 'cheese', quantity: 3 },
      { name: 'milk', quantity: 2 },
    ]);
  });

  it('handles mixed quantities and fillers', () => {
    const result = parseTranscript('I need 2 apples and some eggs and three bananas');
    expect(result).toEqual([
      { name: 'apples', quantity: 2 },
      { name: 'eggs', quantity: 1 },
      { name: 'bananas', quantity: 3 },
    ]);
  });

  it('splits on "next"', () => {
    const result = parseTranscript('milk next eggs next bread');
    expect(result).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'eggs', quantity: 1 },
      { name: 'bread', quantity: 1 },
    ]);
  });

  it('splits on "then"', () => {
    const result = parseTranscript('milk then eggs then bread');
    expect(result).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'eggs', quantity: 1 },
      { name: 'bread', quantity: 1 },
    ]);
  });

  it('splits on "plus"', () => {
    const result = parseTranscript('milk plus eggs plus bread');
    expect(result).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'eggs', quantity: 1 },
      { name: 'bread', quantity: 1 },
    ]);
  });

  it('splits on "also"', () => {
    const result = parseTranscript('milk also 2 eggs also bread');
    expect(result).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'eggs', quantity: 2 },
      { name: 'bread', quantity: 1 },
    ]);
  });

  it('splits on spoken "comma"', () => {
    const result = parseTranscript('milk comma eggs comma bread');
    expect(result).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'eggs', quantity: 1 },
      { name: 'bread', quantity: 1 },
    ]);
  });

  it('splits on number boundaries', () => {
    const result = parseTranscript('5 bread 2 milk 3 eggs');
    expect(result).toEqual([
      { name: 'bread', quantity: 5 },
      { name: 'milk', quantity: 2 },
      { name: 'eggs', quantity: 3 },
    ]);
  });

  it('splits on number boundaries mixed with next', () => {
    const result = parseTranscript('5 bread next milk next 3 eggs');
    expect(result).toEqual([
      { name: 'bread', quantity: 5 },
      { name: 'milk', quantity: 1 },
      { name: 'eggs', quantity: 3 },
    ]);
  });

  it('handles accent homophones as quantities', () => {
    expect(parseTranscript('for cheese')).toEqual([{ name: 'cheese', quantity: 4 }]);
    expect(parseTranscript('to milk')).toEqual([{ name: 'milk', quantity: 2 }]);
    expect(parseTranscript('ate eggs')).toEqual([{ name: 'eggs', quantity: 8 }]);
    expect(parseTranscript('tree apples')).toEqual([{ name: 'apples', quantity: 3 }]);
  });

  it('splits on word-number boundaries', () => {
    const result = parseTranscript('two bread three cheese five milk');
    expect(result).toEqual([
      { name: 'bread', quantity: 2 },
      { name: 'cheese', quantity: 3 },
      { name: 'milk', quantity: 5 },
    ]);
  });

  it('self-corrects with word-number then digit boundary', () => {
    const result = parseTranscript('two bread three cheese 5 popcorn 6 paper 4 bread');
    expect(result).toEqual([
      { name: 'bread', quantity: 4 },
      { name: 'cheese', quantity: 3 },
      { name: 'popcorn', quantity: 5 },
      { name: 'paper', quantity: 6 },
    ]);
  });
});
