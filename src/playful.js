/**
 * The playful tools: tachtienify and isTachtien. Pure functions, no MCP
 * imports. Tachtien means "ontelbaar veel", so vague large amounts are
 * tachtien and anything you can state as an exact number is not. An
 * estimate ("ongeveer honderd", "~100", "100+") was not counted either, so
 * it is tachtien too, as long as it is large (APPROX_MIN or more). A lower
 * bound ("meer dan 50", "ruim honderd") counts as an estimate.
 */

/** Vague large amounts that tachtienify replaces, Dutch and English. */
export const VAGUE_AMOUNTS = [
  "heel veel", "ontzettend veel", "enorm veel", "ontelbaar veel", "eindeloos veel",
  "verschrikkelijk veel", "waanzinnig veel", "belachelijk veel", "bizar veel", "hartstikke veel",
  "superveel", "megaveel", "een heleboel", "een hele boel", "een boel", "een hoop",
  "talloze", "ontelbare", "tig", "massa's", "massa’s", "stapels",
  "tientallen", "honderden", "duizenden", "tienduizenden", "honderdduizenden", "miljoenen", "miljarden",
  "a lot of", "lots of", "loads of", "tons of", "a ton of", "a bunch of", "heaps of", "oodles of",
  "countless", "innumerable", "umpteen", "a gazillion", "a zillion",
  "dozens of", "scores of", "hundreds of", "thousands of", "tens of thousands of",
  "hundreds of thousands of", "millions of", "billions of",
];

/** An estimate counts as tachtien from this value up: "zo'n 30 man" can still be counted, so it is not ontelbaar veel. */
export const APPROX_MIN = 50;

/** Words in front of a number that make it an estimate. */
export const APPROX_BEFORE = [
  "ongeveer", "zo'n", "zo’n", "rond", "rond de", "rondom de", "circa", "ca.", "ruim", "dik", "bijna",
  "pakweg", "grofweg", "ruwweg", "naar schatting", "een stuk of", "om en nabij", "om en nabij de",
  "plusminus", "meer dan", "about", "around", "roughly", "approximately", "approx.", "nearly",
  "almost", "more than", "upwards of", "well over", "give or take", "~", "±", "≈",
];

// Also tachtien when asked, but not phrases to replace inside a sentence.
const ALSO_TACHTIEN = [
  "tachtien", "ontelbaar", "oneindig", "te veel om te tellen", "geen idee", "weet ik niet",
  "a lot", "lots", "too many to count", "∞",
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const alternation = (phrases) => [...phrases]
  .sort((a, b) => b.length - a.length)
  .map((p) => p.split(" ").map(escape).join("\\s+"))
  .join("|");
// Whole words only: no letter or digit directly before or after the phrase.
const phraseRegex = (phrases, flags) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternation(phrases)})(?![\\p{L}\\p{N}])`, flags);


// Number words. "een"/"one" only count inside a number ("eenentwintig",
// "twenty-one"): alone they are usually an article ("een hoop").
const NUMBER_WORDS = new Map([
  ["nul", 0], ["een", 1], ["één", 1], ["zero", 0], ["one", 1],
  ...["twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien", "elf", "twaalf", "dertien", "veertien",
    "vijftien", "zestien", "zeventien", "achttien", "negentien", "twintig"].map((w, i) => [w, i + 2]),
  ...["dertig", "veertig", "vijftig", "zestig", "zeventig", "tachtig", "negentig"].map((w, i) => [w, (i + 3) * 10]),
  ...["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
    "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"].map((w, i) => [w, i + 2]),
  ...["thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"].map((w, i) => [w, (i + 3) * 10]),
  ["honderd", 100], ["duizend", 1e3], ["miljoen", 1e6], ["miljard", 1e9],
  ["hundred", 100], ["thousand", 1e3], ["million", 1e6], ["billion", 1e9],
]);
// Longest first, so "achttien" wins over "acht" and "tachtig" over nothing shorter.
const NUMBER_KEYS = [...NUMBER_WORDS.keys()].sort((a, b) => b.length - a.length);
const LONE_ARTICLES = new Set(["een", "één", "one"]);
// "vijfentwintig", "tweeëntwintig"; "and" joins words ("hundred and five").
const CONNECTORS = ["en", "ën", "and"];

const REPLACE_RE = phraseRegex(VAGUE_AMOUNTS, "giu");
const VAGUE_RE = phraseRegex([...VAGUE_AMOUNTS, ...ALSO_TACHTIEN], "iu");
const NEGATION_RE = phraseRegex(["niet", "geen", "nee", "nooit", "allesbehalve", "not", "no", "never"], "iu");
// A marker right before a number, at the end of the text in front of it.
const APPROX_BEFORE_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternation(APPROX_BEFORE)})\\s*$`, "iu");
const APPROX_AFTER_RE = /^(?:\+(?!\s*\d)|-?ish|-odd|\s+(?:of zo|or so|en nog wat|of meer|or more|odd))(?![\p{L}\p{N}])/iu;
// A token start: a digit (or sign) not inside a number, or the first letter of a word.
const START_RE = /(?<![\p{L}\p{N}.,])(?=[-+]?\d)|(?<![\p{L}\p{N}])(?=\p{L})/gu;
// "1.000" and "2,500" are thousands; "3,5" is a decimal.
const DIGITS_RE = /[-+]?(?:[1-9]\d{0,2}(?:([.,])\d{3})(?:\1\d{3})*(?!\d|[.,]\d)|\d+(?:[.,]\d+)?)/y;
const WORD_RE = /\p{L}+/uy;
const SEPARATOR_RE = /(?:\s+|-)(?:(en|and)(?:\s+|-))?/y;

const isTens = (v) => v >= 20 && v < 100 && v % 10 === 0;
// May `next` follow `prev` in one number? "twee honderd", "honderd twee", "twenty one", "vijf en twintig".
const mayFollow = (prev, next, joined) =>
  next >= 100 || prev >= 100 || (joined ? prev < 10 && isTens(next) : isTens(prev) && next > 0 && next < 10);

/** One word as number values ("tweehonderdvijftig" → [2, 100, 50]), or undefined. */
function splitWord(word) {
  const values = [];
  let i = 0, joined = false;
  while (i < word.length) {
    const key = NUMBER_KEYS.find((k) => word.startsWith(k, i));
    if (key) {
      const v = NUMBER_WORDS.get(key);
      if (values.length && !mayFollow(values.at(-1), v, joined)) return undefined;
      values.push(v);
      i += key.length;
      joined = false;
      continue;
    }
    const connector = !joined && values.length && CONNECTORS.find((c) => word.startsWith(c, i));
    if (!connector) return undefined;
    i += connector.length;
    joined = true;
  }
  return joined || !values.length ? undefined : values;
}

/** The value of number words in order: [2, 100, 50] → 250, [2, 1000, 3] → 2003. */
function combine(values) {
  let total = 0, current = 0;
  for (const v of values) {
    if (v >= 1000) { total += (current || 1) * v; current = 0; }
    else if (v === 100) current = (current || 1) * 100;
    else current += v;
  }
  return total + current;
}

/** The number that starts at `s[i]`, in digits or words, as { value, end, year }, or undefined. */
function readNumber(s, i) {
  DIGITS_RE.lastIndex = i;
  const digits = DIGITS_RE.exec(s);
  if (digits) {
    const end = i + digits[0].length;
    const rest = s.slice(end);
    // "20ish" is a number with a suffix; "20e", "3x" and "20:00" are not amounts.
    if (/^[\p{L}\p{N}:]/u.test(rest) && !/^ish(?![\p{L}\p{N}])/iu.test(rest)) return undefined;
    const thousands = digits[1];
    const value = Number(thousands ? digits[0].replaceAll(thousands, "") : digits[0].replace(",", "."));
    return { value, end, year: /^\d{4}$/.test(digits[0]) && value >= 1000 && value <= 2100 };
  }
  const values = [];
  let end = i, pos = i, joined = false;
  for (;;) {
    WORD_RE.lastIndex = pos;
    const word = WORD_RE.exec(s)?.[0];
    const lower = word?.toLowerCase();
    const parts = lower && splitWord(lower);
    if (!parts || (!values.length && LONE_ARTICLES.has(lower))) break;
    if (values.length && !mayFollow(values.at(-1), parts[0], joined)) break;
    values.push(...parts);
    end = pos + word.length;
    SEPARATOR_RE.lastIndex = end;
    const sep = SEPARATOR_RE.exec(s);
    if (!sep) break;
    pos = end + sep[0].length;
    joined = Boolean(sep[1]);
  }
  return values.length ? { value: combine(values), end, year: false } : undefined;
}

/**
 * Every number in `s`, in order, as { start, end, value, approx, year }. For
 * an estimate, start and end include the marker ("ongeveer", "+"). A year
 * after a marker ("rond 2014") is a date, not an estimate.
 */
function findAmounts(s) {
  const amounts = [];
  for (let i = 0; i < s.length;) {
    START_RE.lastIndex = i;
    const m = START_RE.exec(s);
    if (!m) break;
    const num = readNumber(s, m.index);
    if (!num) { i = m.index + 1; continue; }
    let start = m.index, end = num.end;
    const before = s.slice(Math.max(0, start - 40), start).match(APPROX_BEFORE_RE);
    const after = s.slice(end).match(APPROX_AFTER_RE);
    const marked = Boolean(before || after);
    const approx = marked && !num.year;
    if (approx && before) start -= before[0].length;
    if (approx && after) end += after[0].length;
    amounts.push({ start, end, value: num.value, approx, year: marked && num.year });
    i = num.end;
  }
  return amounts;
}

const recase = (match) => {
  if (match === match.toUpperCase() && match !== match.toLowerCase() && match.length > 1) return "TACHTIEN";
  return match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase() ? "Tachtien" : "tachtien";
};

/**
 * Replace vague large amounts and large estimates in `text` with "tachtien"
 * ("Tachtien" when the match starts with a capital). Exact numbers stay.
 * @param {string} text
 * @returns {{ text: string, replacements: number, replaced: { text: string, index: number }[] }}
 */
export function tachtienify(text) {
  const spans = [
    ...[...text.matchAll(REPLACE_RE)].map((m) => ({ start: m.index, end: m.index + m[0].length })),
    ...findAmounts(text).filter((a) => a.approx && a.value >= APPROX_MIN),
  ].sort((a, b) => a.start - b.start || b.end - a.end);
  let out = "", last = 0;
  const replaced = [];
  for (const { start, end } of spans) {
    if (start < last) continue;
    const match = text.slice(start, end);
    out += text.slice(last, start) + recase(match);
    replaced.push({ text: match, index: start });
    last = end;
  }
  return { text: out + text.slice(last), replacements: replaced.length, replaced };
}

const counted = (shown, n) => {
  if (n === 18) return "Nee, dat is achttien. Bijna, maar daar heeft iemand gewoon geteld.";
  if (n === 80) return "Nee, dat is tachtig. Een keurig getal, en dus telbaar.";
  if (n < 0) return `Nee, ${shown} is minder dan niks. Dat is het tegenovergestelde van tachtien.`;
  return `Nee, ${shown} is precies geteld. Tachtien is ontelbaar veel.`;
};
const negated = (phrase) => ({ isTachtien: false, reason: `Nee, je zegt zelf al dat het niet "${phrase}" is.` });

/**
 * Judge whether an amount counts as tachtien, with a tongue-in-cheek reason
 * in Dutch.
 * @param {number | string} amount
 * @returns {{ isTachtien: boolean, reason: string }}
 */
export function isTachtien(amount) {
  const s = String(amount).trim();
  if (amount === Infinity || /^\+?infinity$/i.test(s)) {
    return { isTachtien: true, reason: "Ja. Oneindig is het enige exacte getal dat ook ontelbaar is." };
  }
  if (typeof amount === "number") {
    return Number.isNaN(amount) ? NOT_TACHTIEN : { isTachtien: false, reason: counted(String(amount).replace(".", ","), amount) };
  }
  const vague = s.match(VAGUE_RE);
  if (vague) {
    // Only a negation in front counts: "geen idee" and "weet ik niet" carry their own.
    if (NEGATION_RE.test(s.slice(0, vague.index))) return negated(vague[0]);
    return { isTachtien: true, reason: `Ja, "${vague[0]}" is ontelbaar veel, en dat is precies tachtien.` };
  }
  if (/^-infinity$/i.test(s)) return { isTachtien: false, reason: counted(s, -Infinity) };
  const amounts = findAmounts(s);
  const a = amounts.find((x) => x.approx) ?? amounts.find((x) => x.year) ?? amounts[0];
  if (!a) return NOT_TACHTIEN;
  const phrase = s.slice(a.start, a.end);
  if (a.year) return { isTachtien: false, reason: `Nee, ${phrase} klinkt als een jaartal, en jaartallen tellen we gewoon.` };
  if (!a.approx) return { isTachtien: false, reason: counted(s, a.value) };
  if (NEGATION_RE.test(s.slice(0, a.start))) return negated(phrase);
  if (a.value < APPROX_MIN) return { isTachtien: false, reason: `Nee, "${phrase}" is wel geschat, maar niet veel. Tachtien is ontelbaar veel.` };
  return { isTachtien: true, reason: `Ja, "${phrase}" is geschat, niet geteld. Wie schat, telt niet, en dat is precies tachtien.` };
}

const NOT_TACHTIEN = Object.freeze({ isTachtien: false, reason: "Nee, dat klinkt als iets wat je nog gewoon kunt tellen." });
