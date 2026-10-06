import { applyCommands, matchKey, parseCommands, parseTranscript } from './itemParser';

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

describe('parseTranscript — English fluency', () => {
  it('strips stacked fillers and hesitations', () => {
    expect(parseTranscript('okay so um I need some milk')).toEqual([{ name: 'milk', quantity: 1 }]);
    expect(parseTranscript("let's get the eggs please")).toEqual([{ name: 'eggs', quantity: 1 }]);
    expect(parseTranscript('add milk to the list')).toEqual([{ name: 'milk', quantity: 1 }]);
  });

  it('parses "2x" and "times" quantities', () => {
    expect(parseTranscript('2x milk')).toEqual([{ name: 'milk', quantity: 2 }]);
    expect(parseTranscript('eggs times 3')).toEqual([{ name: 'eggs', quantity: 3 }]);
  });

  it('parses extended quantity words', () => {
    expect(parseTranscript('half a dozen eggs')).toEqual([{ name: 'eggs', quantity: 6 }]);
    expect(parseTranscript('fifteen eggs')).toEqual([{ name: 'eggs', quantity: 15 }]);
    expect(parseTranscript('a couple of bananas')).toEqual([{ name: 'bananas', quantity: 2 }]);
  });

  it('strips count containers', () => {
    expect(parseTranscript('2 bottles of water')).toEqual([{ name: 'water', quantity: 2 }]);
    expect(parseTranscript('a bag of chips')).toEqual([{ name: 'chips', quantity: 1 }]);
  });

  it('keeps measure units in the name', () => {
    expect(parseTranscript('500 grams of cheese')).toEqual([{ name: '500 grams of cheese', quantity: 1 }]);
    expect(parseTranscript('two kilos of tomatoes')).toEqual([{ name: '2 kilos of tomatoes', quantity: 1 }]);
  });

  it('dedupes singular and plural forms', () => {
    expect(parseTranscript('apple and 3 apples')).toEqual([{ name: 'apples', quantity: 3 }]);
  });

  it('splits run-on items using the vocabulary', () => {
    const vocabulary = ['Milk', 'Eggs', 'Bread', 'Peanut Butter', 'Butter', 'Jelly'];
    expect(parseTranscript('milk eggs bread', 'en', vocabulary)).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'eggs', quantity: 1 },
      { name: 'bread', quantity: 1 },
    ]);
    expect(parseTranscript('peanut butter jelly', 'en', vocabulary)).toEqual([
      { name: 'peanut butter', quantity: 1 },
      { name: 'jelly', quantity: 1 },
    ]);
    expect(parseTranscript('2 milk eggs', 'en', vocabulary)).toEqual([
      { name: 'milk', quantity: 2 },
      { name: 'eggs', quantity: 1 },
    ]);
  });

  it('keeps unknown multi-word items whole', () => {
    expect(parseTranscript('chocolate milk', 'en', ['Milk'])).toEqual([{ name: 'chocolate milk', quantity: 1 }]);
  });
});

describe('parseTranscript — English voice commands', () => {
  it('removes an item by name', () => {
    expect(parseTranscript('milk, eggs, bread, remove the eggs')).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'bread', quantity: 1 },
    ]);
  });

  it('removes with plural tolerance and quantity', () => {
    expect(parseTranscript('3 apples and milk, delete 2 apple')).toEqual([{ name: 'milk', quantity: 1 }]);
  });

  it('re-adds an item said again after removal', () => {
    expect(parseTranscript('milk, remove milk, milk')).toEqual([{ name: 'milk', quantity: 1 }]);
  });

  it('ignores removal of an item that was never said', () => {
    expect(parseTranscript('milk, remove cheese')).toEqual([{ name: 'milk', quantity: 1 }]);
  });

  it('does not treat "don\'t forget" as a removal', () => {
    expect(parseTranscript("don't forget milk")).toEqual([{ name: 'milk', quantity: 1 }]);
  });

  it('handles "we don\'t need" as a removal', () => {
    expect(parseTranscript("milk and eggs, we don't need eggs")).toEqual([{ name: 'milk', quantity: 1 }]);
  });

  it('undoes the last item with "scratch that" / "never mind"', () => {
    expect(parseTranscript('milk, eggs, scratch that')).toEqual([{ name: 'milk', quantity: 1 }]);
    expect(parseTranscript('milk, eggs never mind bread')).toEqual([
      { name: 'milk', quantity: 1 },
      { name: 'bread', quantity: 1 },
    ]);
    expect(parseTranscript('2 milk scratch that 3 milk')).toEqual([{ name: 'milk', quantity: 3 }]);
  });

  it('clears everything', () => {
    expect(parseTranscript('milk, eggs, start over, bread')).toEqual([{ name: 'bread', quantity: 1 }]);
    expect(parseTranscript('milk delete everything')).toEqual([]);
  });
});

describe('parseTranscript — Hebrew', () => {
  it('splits on the ו prefix', () => {
    expect(parseTranscript('חלב וביצים ולחם', 'he')).toEqual([
      { name: 'חלב', quantity: 1 },
      { name: 'ביצים', quantity: 1 },
      { name: 'לחם', quantity: 1 },
    ]);
  });

  it('keeps words that naturally start with ו', () => {
    expect(parseTranscript('גלידה וניל', 'he')).toEqual([{ name: 'גלידה וניל', quantity: 1 }]);
    expect(parseTranscript('וופלים', 'he')).toEqual([{ name: 'וופלים', quantity: 1 }]);
  });

  it('splits on Hebrew separators', () => {
    expect(parseTranscript('חלב גם ביצים ואז לחם', 'he')).toEqual([
      { name: 'חלב', quantity: 1 },
      { name: 'ביצים', quantity: 1 },
      { name: 'לחם', quantity: 1 },
    ]);
  });

  it('parses gendered number words', () => {
    expect(parseTranscript('שתי ביצים', 'he')).toEqual([{ name: 'ביצים', quantity: 2 }]);
    expect(parseTranscript('שלושה מלפפונים', 'he')).toEqual([{ name: 'מלפפונים', quantity: 3 }]);
    expect(parseTranscript('שתים עשרה ביצים', 'he')).toEqual([{ name: 'ביצים', quantity: 12 }]);
    expect(parseTranscript('תריסר ביצים', 'he')).toEqual([{ name: 'ביצים', quantity: 12 }]);
  });

  it('parses the post-nominal "one"', () => {
    expect(parseTranscript('לחם אחד', 'he')).toEqual([{ name: 'לחם', quantity: 1 }]);
  });

  it('splits on number boundaries', () => {
    expect(parseTranscript('חלב שלוש ביצים 2 לחם', 'he')).toEqual([
      { name: 'חלב', quantity: 1 },
      { name: 'ביצים', quantity: 3 },
      { name: 'לחם', quantity: 2 },
    ]);
    expect(parseTranscript('חלב ושתי ביצים', 'he')).toEqual([
      { name: 'חלב', quantity: 1 },
      { name: 'ביצים', quantity: 2 },
    ]);
  });

  it('strips Hebrew fillers and the object marker', () => {
    expect(parseTranscript('אני צריך חלב', 'he')).toEqual([{ name: 'חלב', quantity: 1 }]);
    expect(parseTranscript('תקנה את החלב בבקשה', 'he')).toEqual([{ name: 'חלב', quantity: 1 }]);
    expect(parseTranscript('יאללה נגמר לנו לחם', 'he')).toEqual([{ name: 'לחם', quantity: 1 }]);
  });

  it('strips containers', () => {
    expect(parseTranscript('2 בקבוקי מים', 'he')).toEqual([{ name: 'מים', quantity: 2 }]);
    expect(parseTranscript('שתי חבילות של פסטה', 'he')).toEqual([{ name: 'פסטה', quantity: 2 }]);
  });

  it('keeps measure units in the name', () => {
    expect(parseTranscript('2 קילו עגבניות', 'he')).toEqual([{ name: '2 קילו עגבניות', quantity: 1 }]);
  });

  it('removes items by voice', () => {
    expect(parseTranscript('חלב, ביצים, תמחק את החלב', 'he')).toEqual([{ name: 'ביצים', quantity: 1 }]);
    expect(parseTranscript('חלב וביצים בלי ביצים', 'he')).toEqual([{ name: 'חלב', quantity: 1 }]);
    expect(parseTranscript('חלב, ביצים, אני לא צריך ביצים', 'he')).toEqual([{ name: 'חלב', quantity: 1 }]);
  });

  it('undoes and clears', () => {
    expect(parseTranscript('חלב, ביצים, בטל', 'he')).toEqual([{ name: 'חלב', quantity: 1 }]);
    expect(parseTranscript('חלב, ביצים, תמחק את זה', 'he')).toEqual([{ name: 'חלב', quantity: 1 }]);
    expect(parseTranscript('חלב, ביצים, לא משנה', 'he')).toEqual([{ name: 'חלב', quantity: 1 }]);
    expect(parseTranscript('חלב, ביצים, תמחק הכל, לחם', 'he')).toEqual([{ name: 'לחם', quantity: 1 }]);
  });

  it('splits run-on items using the vocabulary', () => {
    expect(parseTranscript('חלב ביצים לחם', 'he', ['חלב', 'ביצים', 'לחם'])).toEqual([
      { name: 'חלב', quantity: 1 },
      { name: 'ביצים', quantity: 1 },
      { name: 'לחם', quantity: 1 },
    ]);
  });
});

describe('applyCommands', () => {
  it('applies commands across separately parsed segments', () => {
    const commands = [
      ...parseCommands('2 milk and eggs', 'en'),
      { type: 'remove' as const, name: 'milk' },
      ...parseCommands('bread', 'en'),
    ];
    expect(applyCommands(commands)).toEqual([
      { name: 'eggs', quantity: 1 },
      { name: 'bread', quantity: 1 },
    ]);
  });

  it('undo removes the most recently touched item', () => {
    const commands = [...parseCommands('milk, eggs, 3 milk', 'en'), { type: 'undo' as const }];
    expect(applyCommands(commands)).toEqual([{ name: 'eggs', quantity: 1 }]);
  });
});

describe('matchKey', () => {
  it('normalizes articles, case and plurals', () => {
    expect(matchKey('The Apples')).toBe('apple');
    expect(matchKey('tomatoes')).toBe(matchKey('tomato'));
    expect(matchKey('berries')).toBe(matchKey('berry'));
    expect(matchKey('glass')).toBe('glass');
  });

  it('treats the Hebrew definite article as optional', () => {
    expect(matchKey('החלב')).toBe(matchKey('חלב'));
  });
});
