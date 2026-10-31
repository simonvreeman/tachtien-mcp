/**
 * The playful tools: tachtienify and isTachtien. Pure functions, no MCP
 * imports. Tachtien means "ontelbaar veel", so vague large amounts are
 * tachtien and anything you can state as an exact number is not.
 */

/** Vague large amounts that tachtienify replaces, Dutch and English. */
export const VAGUE_AMOUNTS = [
  "heel veel", "ontzettend veel", "enorm veel", "ontelbaar veel", "eindeloos veel",
  "superveel", "een heleboel", "een hoop", "talloze", "tig",
  "honderden", "duizenden", "miljoenen", "miljarden",
  "a lot of", "lots of", "loads of", "tons of", "countless", "innumerable", "umpteen",
  "a gazillion", "a zillion", "hundreds of", "thousands of", "millions of",
];

// Also tachtien when asked, but not phrases to replace inside a sentence.
const ALSO_TACHTIEN = [
  "tachtien", "ontelbaar", "oneindig", "te veel om te tellen", "geen idee", "weet ik niet",
  "a lot", "lots", "too many to count", "∞",
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole words only: no letter or digit directly before or after the phrase.
const phraseRegex = (phrases, flags) => {
  const alternatives = [...phrases]
    .sort((a, b) => b.length - a.length)
    .map((p) => p.split(" ").map(escape).join("\\s+"));
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join("|")})(?![\\p{L}\\p{N}])`, flags);
};

const REPLACE_RE = phraseRegex(VAGUE_AMOUNTS, "giu");
const VAGUE_RE = phraseRegex([...VAGUE_AMOUNTS, ...ALSO_TACHTIEN], "iu");
const NUMBER_RE = /^[-+]?\d+(?:[.,]\d+)?$/;
const NUMBER_WORDS = new Map([["achttien", 18], ["tachtig", 80]]);

/**
 * Replace vague large amounts in `text` with "tachtien" ("Tachtien" when the
 * match starts with a capital).
 * @param {string} text
 * @returns {{ text: string, replacements: number }}
 */
export function tachtienify(text) {
  let replacements = 0;
  const out = text.replace(REPLACE_RE, (match) => {
    replacements++;
    return match[0] === match[0].toUpperCase() ? "Tachtien" : "tachtien";
  });
  return { text: out, replacements };
}

const counted = (shown, n) => {
  if (n === 18) return "Nee, dat is achttien. Bijna, maar daar heeft iemand gewoon geteld.";
  if (n === 80) return "Nee, dat is tachtig. Een keurig getal, en dus telbaar.";
  if (n < 0) return `Nee, ${shown} is minder dan niks. Dat is het tegenovergestelde van tachtien.`;
  return `Nee, ${shown} is precies geteld. Tachtien is ontelbaar veel.`;
};

/**
 * Judge whether an amount counts as tachtien, with a tongue-in-cheek reason
 * in Dutch.
 * @param {number | string} amount
 * @returns {{ isTachtien: boolean, reason: string }}
 */
export function isTachtien(amount) {
  const s = String(amount).trim();
  const n = typeof amount === "number" ? amount
    : NUMBER_RE.test(s) ? Number(s.replace(",", "."))
    : /^[-+]?infinity$/i.test(s) ? Number(s)
    : NUMBER_WORDS.get(s.toLowerCase());

  if (n === Infinity) return { isTachtien: true, reason: "Ja. Oneindig is het enige exacte getal dat ook ontelbaar is." };
  if (Number.isFinite(n) || n === -Infinity) {
    const shown = typeof amount === "number" ? String(amount).replace(".", ",") : s;
    return { isTachtien: false, reason: counted(shown, n) };
  }
  const vague = s.match(VAGUE_RE);
  if (vague) return { isTachtien: true, reason: `Ja, "${vague[0]}" is ontelbaar veel, en dat is precies tachtien.` };
  return { isTachtien: false, reason: "Nee, dat klinkt als iets wat je nog gewoon kunt tellen." };
}
