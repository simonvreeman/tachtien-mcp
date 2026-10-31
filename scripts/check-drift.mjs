/**
 * Check src/entry.js against the live https://tachtien.nl, both ways: every
 * text of entry.js must appear in the page text and every link in its hrefs,
 * and every list item under "Voorbeelden" and "Externe vermeldingen" must be
 * in entry.js. Exits 1 and lists the differences, 2 when the fetch fails.
 *
 * Usage: npm run check:drift [-- <url>]
 */
import { entry } from "../src/entry.js";

const url = process.argv[2] ?? entry.url;
const res = await fetch(url);
if (!res.ok) {
  console.error(`Fetch failed: ${res.status} ${res.statusText} for ${url}`);
  process.exit(2);
}
const html = await res.text();

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", middot: "·" };
const toText = (fragment) => fragment
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
  .replace(/<[^>]+>/g, "")
  .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(Number(e[1] === "x" ? `0${e.slice(1)}` : e.slice(1))) : ENTITIES[e] ?? m)
  .replace(/\s+/g, " ")
  .trim();
const pageText = toText(html);
const hrefs = new Set([...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]));

// The text of each <li> without a nested list, in the section under <h2>heading</h2>.
const leafItems = (heading) => {
  const section = html.split(/<h2>/).find((part) => part.startsWith(`${heading}</h2>`)) ?? "";
  return [...section.matchAll(/<li>((?:(?!<li|<ol|<ul)[\s\S])*?)<\/li>/g)].map((m) => toText(m[1]));
};

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
const exampleLines = new Set(entry.examples.flatMap((ex) => ex.lines));
const mentionTitles = new Set(entry.mentions.map((m) => m.title));
const siteExamples = leafItems("Voorbeelden").map((t) => t.replace(/^"|"$/g, ""));
const siteMentions = leafItems("Externe vermeldingen");

const missing = [
  ...texts.filter((t) => !pageText.includes(t)).map((t) => `not on site, text: ${t}`),
  ...links.filter((l) => !hrefs.has(l)).map((l) => `not on site, link: ${l}`),
  ...(siteExamples.length ? [] : ["not on site: the Voorbeelden list"]),
  ...(siteMentions.length ? [] : ["not on site: the Externe vermeldingen list"]),
  ...siteExamples.filter((t) => !exampleLines.has(t)).map((t) => `not in entry.js, example: ${t}`),
  ...siteMentions.filter((t) => !mentionTitles.has(t)).map((t) => `not in entry.js, mention: ${t}`),
];
if (missing.length) {
  console.error(`entry.js has drifted from ${url}:\n${missing.map((m) => `  - ${m}`).join("\n")}`);
  process.exit(1);
}
console.log(`OK: ${texts.length} texts, ${links.length} links, ${siteExamples.length} examples and ${siteMentions.length} mentions match ${url}`);
