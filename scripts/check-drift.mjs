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
import { parse } from "parse5";
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

const document = parse(html);
const element = (node, name) => node.nodeName === name;
const text = (node) => {
  if (node.nodeName === "#text") return node.value;
  if (element(node, "script") || element(node, "style")) return "";
  return (node.childNodes ?? []).map(text).join("");
};
const clean = (value) => value.replace(/\s+/g, " ").trim();
const walk = (node, visit) => {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
};
const hasList = (node) => {
  let result = false;
  walk(node, (child) => { if (child !== node && (element(child, "ol") || element(child, "ul"))) result = true; });
  return result;
};
const pageText = clean(text(document));
const hrefs = new Set();
walk(document, (node) => {
  if (!element(node, "a")) return;
  const href = node.attrs?.find((attribute) => attribute.name === "href")?.value;
  if (href) hrefs.add(href);
});

// Leaf <li>s after a matching <h2>, until the next <h2>, independent of markup layout.
const leafItems = (heading) => {
  let active = false;
  const items = [];
  walk(document, (node) => {
    if (element(node, "h2")) active = clean(text(node)) === heading;
    else if (active && element(node, "li") && !hasList(node)) items.push(clean(text(node)));
  });
  return items;
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
console.log(`OK: ${texts.length} texts, ${links.length} links, ${siteExamples.length} example lines and ${siteMentions.length} mentions match ${url}; ${skills.length} skill digest and ${webmcpNames.length} WebMCP tools match`);
