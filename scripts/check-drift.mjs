/**
 * Check src/entry.js against the live https://tachtien.nl, both ways: every
 * text of entry.js must appear in the page text and every link in its hrefs,
 * and every list item under "Voorbeelden" and "Externe vermeldingen" must be
 * in entry.js. Also checks the site's agent surfaces: every agent skill must
 * match its sha256 digest, and webmcp.js must register exactly the server
 * card's tools with the same descriptions. Exits 1 and lists the
 * differences, 2 when a fetch fails.
 *
 * Usage: npm run check:drift [-- <site url> [<server card url>]]
 */
import { createHash } from "node:crypto";
import { entry } from "../src/entry.js";

const url = process.argv[2] ?? entry.url;
const cardUrl = process.argv[3] ?? "https://mcp.tachtien.nl/.well-known/mcp/server-card.json";

/** Fetch a URL as text, or exit 2 when it fails. */
async function get(target) {
  const res = await fetch(target);
  if (!res.ok) {
    console.error(`Fetch failed: ${res.status} ${res.statusText} for ${target}`);
    process.exit(2);
  }
  return res.text();
}
// Resolve a site URL against the checked site, so a local run reads local files.
const onSite = (absolute) => new URL(new URL(absolute).pathname, url).href;

const html = await get(url);

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

const skills = JSON.parse(await get(onSite("https://tachtien.nl/.well-known/agent-skills/index.json"))).skills;
const staleSkills = [];
for (const skill of skills) {
  const digest = `sha256:${createHash("sha256").update(await get(onSite(skill.url))).digest("hex")}`;
  if (digest !== skill.digest) staleSkills.push(`${skill.name}: index says ${skill.digest}, file is ${digest}`);
}
const webmcp = await get(onSite("https://tachtien.nl/webmcp.js"));
const cardTools = JSON.parse(await get(cardUrl)).tools;
const webmcpNames = [...webmcp.matchAll(/"name": "([a-z_]+)"/g)].map((m) => m[1]);

const missing = [
  ...texts.filter((t) => !pageText.includes(t)).map((t) => `not on site, text: ${t}`),
  ...links.filter((l) => !hrefs.has(l)).map((l) => `not on site, link: ${l}`),
  ...(siteExamples.length ? [] : ["not on site: the Voorbeelden list"]),
  ...(siteMentions.length ? [] : ["not on site: the Externe vermeldingen list"]),
  ...siteExamples.filter((t) => !exampleLines.has(t)).map((t) => `not in entry.js, example: ${t}`),
  ...siteMentions.filter((t) => !mentionTitles.has(t)).map((t) => `not in entry.js, mention: ${t}`),
  ...staleSkills.map((s) => `agent skill digest is stale, ${s}`),
  ...cardTools.filter((t) => !webmcpNames.includes(t.name)).map((t) => `not in webmcp.js, tool: ${t.name}`),
  ...webmcpNames.filter((n) => !cardTools.some((t) => t.name === n)).map((n) => `not on the server, webmcp.js tool: ${n}`),
  ...cardTools.filter((t) => webmcpNames.includes(t.name) && !webmcp.includes(JSON.stringify(t.description)))
    .map((t) => `webmcp.js description differs from the server, tool: ${t.name}`),
];
if (missing.length) {
  console.error(`${url} and the MCP have drifted apart:\n${missing.map((m) => `  - ${m}`).join("\n")}`);
  process.exit(1);
}
console.log(`OK: ${texts.length} texts, ${links.length} links, ${siteExamples.length} examples and ${siteMentions.length} mentions match ${url}; ${skills.length} skill digest and ${webmcpNames.length} WebMCP tools match`);
