/**
 * Check src/entry.js against the live https://tachtien.nl: every text must
 * appear in the page text and every link in the page's hrefs. Exits 1 and
 * lists what is missing, so a change to the site is copied here too.
 *
 * Usage: npm run check:drift [-- <url>]
 */
import { entry } from "../src/entry.js";

const url = process.argv[2] ?? entry.url;
const html = await (await fetch(url)).text();

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·" };
const pageText = html
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
  .replace(/<[^>]+>/g, "")
  .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(Number(e[1] === "x" ? `0${e.slice(1)}` : e.slice(1))) : ENTITIES[e] ?? m)
  .replace(/\s+/g, " ");
const hrefs = new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]));

const texts = [
  entry.syllables,
  entry.partOfSpeech,
  entry.pronunciation.ipa,
  entry.definition,
  entry.origin.text,
  ...entry.origin.links.map((l) => l.title),
  ...entry.examples.flatMap((ex) => ex.lines),
  ...entry.mentions.map((m) => m.title),
];
const links = [...entry.origin.links, ...entry.mentions].map((m) => m.url).filter(Boolean);

const missing = [
  ...texts.filter((t) => !pageText.includes(t)).map((t) => `text: ${t}`),
  ...links.filter((l) => !hrefs.has(l)).map((l) => `link: ${l}`),
];
if (missing.length) {
  console.error(`entry.js has drifted from ${url}:\n${missing.map((m) => `  - ${m}`).join("\n")}`);
  process.exit(1);
}
console.log(`OK: ${texts.length} texts and ${links.length} links match ${url}`);
