import { Locale } from '../i18n/index';

// All phrases are lowercase and space-separated; the parser matches them token by token
// (longest phrase first), so they work for Hebrew where regex \b does not.
export type SpeechLexicon = {
  /** Words that separate items: "milk and eggs" */
  separators: string[];
  /** Quantity phrases. Keys may span several tokens ("half a dozen"). */
  numbers: Record<string, number>;
  /** Quantity phrases that do NOT start a new item mid-sentence (homophones, post-nominal numbers) */
  nonSplittingNumbers: string[];
  /** Quantity words that follow the noun: "לחם אחד" */
  trailingNumbers: Record<string, number>;
  /** Phrases stripped from the start of an item: "i need", "תקנה" */
  fillers: string[];
  /** Phrases dropped wherever they appear: "please", "to the list" */
  noise: string[];
  /** Phrases that turn the rest of the segment into a removal: "remove", "תמחק" */
  removeVerbs: string[];
  /** Removal targets that mean "the last item": "scratch that" */
  pronouns: string[];
  undoPhrases: string[];
  clearPhrases: string[];
  /** Count containers stripped from item names: "bottles of water" → "water" */
  containers: string[];
  /** Measure units — the quantity stays part of the name: "500 grams of cheese" */
  measures: string[];
  /** Hebrew: words starting with ו that are not "and" + word */
  vavExceptions: string[];
};

export const SPEECH_LEXICON: Record<Locale, SpeechLexicon> = {
  en: {
    separators: [
      'and', 'next', 'then', 'plus', 'also', 'comma', 'and also', 'and then', 'as well as', 'after that',
    ],
    numbers: {
      a: 1, an: 1,
      one: 1, won: 1,
      two: 2, to: 2, too: 2,
      three: 3, tree: 3,
      four: 4, for: 4, fore: 4,
      five: 5, six: 6, seven: 7,
      eight: 8, ate: 8,
      nine: 9, nein: 9,
      ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
      sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
      dozen: 12, 'a dozen': 12, 'half a dozen': 6,
      couple: 2, 'a couple': 2, 'a couple of': 2, 'a pair of': 2,
      few: 3, 'a few': 3,
      half: 1,
    },
    nonSplittingNumbers: [
      'a', 'an', 'won', 'to', 'too', 'tree', 'for', 'fore', 'ate', 'nein',
      'dozen', 'couple', 'few', 'half', 'a couple', 'a couple of', 'a pair of', 'a few',
    ],
    trailingNumbers: {},
    fillers: [
      // polite requests
      'can you pick up', 'can you grab', 'can you buy', 'can you get', 'can you add',
      'could you pick up', 'could you grab', 'could you buy', 'could you get', 'could you add',
      // "we" variants (shared lists)
      'we need to get', 'we need to buy', 'we need some', 'we need', 'we also need', "we'll need",
      'we want some', 'we want', "we're out of", 'we ran out of', "we're missing", 'we should get',
      // "i" variants
      'i need to get', 'i need to buy', 'i need', 'i also need', "i'll need", 'i want',
      "i'd like some", "i'd like", "i'd love some", "i'd love", 'i should get',
      'also need', 'need some', 'need',
      // reminders
      "don't forget to get", "don't forget to buy", "don't forget",
      'remember to get', 'remember to buy', 'remember',
      // imperative
      'please pick up', 'please grab', 'please buy', 'please get', 'please add',
      "let's get", "let's buy", "let's add", 'let me get',
      'pick up some', 'pick up', 'grab some', 'grab me', 'grab',
      'buy some', 'buy me', 'buy', 'get me', 'get some', 'get',
      'add some', 'add', 'put down', 'put', 'write down',
      // self-corrections (the corrected item replaces the earlier one)
      'make it', 'change it to', 'change that to', 'no wait', 'wait no', 'actually', 'correction', 'i mean',
      // softeners and hesitations
      'maybe some', 'maybe', 'just some', 'just a', 'just', 'a bit of', 'a little', 'some',
      'ok', 'okay', 'alright', 'so', 'um', 'umm', 'uh', 'uhh', 'hmm', 'er', 'oh', 'like', 'well', 'yeah',
      'the', 'my', 'our', 'of',
    ],
    noise: [
      'please', 'thanks', 'thank you',
      'to the list', 'to my list', 'to our list', 'to the shopping list', 'on the list', 'on my list',
    ],
    removeVerbs: [
      'remove', 'delete', 'erase', 'take out', 'take off', 'cross off', 'cross out', 'cancel', 'drop',
      'forget', 'forget about', 'scratch', 'skip', 'without', 'get rid of',
      "don't need", 'do not need', "we don't need", "i don't need", 'no need for',
    ],
    pronouns: ['that', 'it', 'this', 'that one', 'last one', 'the last one', 'last item', 'the last item'],
    undoPhrases: ['undo', 'never mind', 'nevermind', 'oops', 'go back'],
    clearPhrases: [
      'clear all', 'clear everything', 'clear the list', 'start over', 'reset',
      'delete all', 'delete everything', 'remove all', 'remove everything',
    ],
    containers: [
      'bottle of', 'bottles of', 'pack of', 'packs of', 'package of', 'packages of', 'bag of', 'bags of',
      'box of', 'boxes of', 'can of', 'cans of', 'jar of', 'jars of', 'carton of', 'cartons of',
      'loaf of', 'loaves of', 'bunch of', 'bunches of', 'piece of', 'pieces of', 'tub of', 'tubs of',
    ],
    measures: [
      'kilo', 'kilos', 'kg', 'kilogram', 'kilograms', 'gram', 'grams', 'g',
      'pound', 'pounds', 'lb', 'lbs', 'ounce', 'ounces', 'oz',
      'liter', 'liters', 'litre', 'litres', 'l', 'ml', 'gallon', 'gallons',
    ],
    vavExceptions: [],
  },
  he: {
    separators: [
      'ו', 'גם', 'וגם', 'אז', 'ואז', 'אחר כך', 'ואחר כך', 'עוד', 'ועוד', 'בנוסף', 'ובנוסף', 'פסיק', 'הבא',
    ],
    numbers: {
      'אחד': 1, 'אחת': 1,
      'שניים': 2, 'שתיים': 2, 'שני': 2, 'שתי': 2, 'זוג': 2,
      'שלושה': 3, 'שלוש': 3, 'שלושת': 3,
      'ארבעה': 4, 'ארבע': 4, 'ארבעת': 4,
      'חמישה': 5, 'חמש': 5, 'חמשת': 5,
      'שישה': 6, 'שש': 6, 'ששת': 6,
      'שבעה': 7, 'שבע': 7, 'שבעת': 7,
      'שמונה': 8, 'שמונת': 8,
      'תשעה': 9, 'תשע': 9, 'תשעת': 9,
      'עשרה': 10, 'עשר': 10, 'עשרת': 10,
      'אחד עשר': 11, 'אחת עשרה': 11,
      'שנים עשר': 12, 'שניים עשר': 12, 'שתים עשרה': 12, 'שתיים עשרה': 12, 'תריסר': 12,
    },
    nonSplittingNumbers: ['אחד', 'אחת', 'זוג'],
    trailingNumbers: { 'אחד': 1, 'אחת': 1 },
    fillers: [
      'אני', 'אנחנו',
      'אני צריך', 'אני צריכה', 'אנחנו צריכים', 'צריך', 'צריכה', 'צריכים',
      'צריך לקנות', 'צריכה לקנות', 'צריכים לקנות',
      'אני רוצה', 'אנחנו רוצים', 'רוצה', 'בא לי',
      'תביא', 'תביאי', 'תביאו', 'להביא',
      'תקנה', 'תקני', 'תקנו', 'קנה', 'קני', 'לקנות',
      'תוסיף', 'תוסיפי', 'תוסיפו', 'הוסף', 'הוסיפי', 'להוסיף',
      'תרשום', 'תרשמי', 'רשום', 'לרשום', 'תכתוב', 'תכתבי',
      'שים', 'תשים', 'תשימי',
      'חסר', 'חסרה', 'חסרים', 'חסר לנו', 'חסרה לנו', 'חסרים לנו',
      'נגמר', 'נגמרה', 'נגמרו', 'נגמר לנו', 'נגמרה לנו', 'נגמרו לנו',
      'אל תשכח', 'אל תשכחי', 'לא לשכוח', 'תזכיר לי', 'תזכירי לי',
      'את', 'קצת', 'אולי',
      'אה', 'אהה', 'אמ', 'אממ', 'טוב', 'אוקיי', 'אוקי', 'יאללה', 'כן', 'רגע', 'בעצם', 'כלומר',
    ],
    noise: ['בבקשה', 'תודה', 'לרשימה', 'ברשימה', 'לרשימת הקניות'],
    removeVerbs: [
      'מחק', 'תמחק', 'תמחקי', 'תמחקו', 'למחוק',
      'הורד', 'תוריד', 'תורידי', 'להוריד',
      'הסר', 'תסיר', 'תסירי', 'להסיר',
      'תוציא', 'תוציאי', 'להוציא',
      'בטל', 'תבטל', 'תבטלי', 'לבטל',
      'בלי', 'לא צריך', 'לא צריכה', 'לא צריכים',
    ],
    pronouns: ['זה', 'את זה', 'אותו', 'אותה', 'האחרון', 'את האחרון'],
    undoPhrases: ['לא משנה', 'תשכח מזה', 'תשכחי מזה', 'עזוב', 'עזבי', 'ביטול', 'אופס', 'טעות'],
    clearPhrases: [
      'מחק הכל', 'תמחק הכל', 'תמחקי הכל', 'למחוק הכל', 'מחק הכול', 'תמחק הכול', 'תמחקי הכול',
      'נקה הכל', 'תנקה הכל', 'תנקי הכל', 'נקה הכול', 'תנקה הכול', 'תנקי הכול',
      'בטל הכל', 'תבטל הכל', 'בטל הכול', 'תבטל הכול',
      'מהתחלה', 'מההתחלה', 'תתחיל מחדש', 'תתחילי מחדש', 'הכל מחדש', 'הכול מחדש',
    ],
    containers: [
      'בקבוקי', 'בקבוק של', 'בקבוקים של',
      'חבילת', 'חבילות', 'חבילה של', 'חבילות של',
      'קופסת', 'קופסאות', 'קופסה של', 'קופסאות של',
      'שקית', 'שקיות', 'שקית של', 'שקיות של',
      'פחית', 'פחיות', 'פחית של', 'פחיות של',
      'צנצנת', 'צנצנות', 'מגש', 'מגשי', 'קרטון', 'קרטוני', 'כיכר', 'כיכרות',
    ],
    measures: ['קילו', 'קג', 'ק"ג', 'ק״ג', 'קילוגרם', 'גרם', 'ליטר', 'ליטרים', 'מל', 'מ"ל', 'מ״ל'],
    vavExceptions: [
      'וניל', 'ויטמין', 'ויטמינים', 'ופל', 'ופלים', 'ופלי', 'ויסקי', 'ורד', 'ורדים', 'ורוד', 'ויניגרט', 'ורמוט',
    ],
  },
};
