/**
 * The dictionary entry for tachtien, copied from https://tachtien.nl. This is
 * the only content source for the MCP server; `npm run check:drift` checks
 * it against the live site.
 */

export const MENTION_SOURCES = ["twitter", "press", "cityguys"];

const deepFreeze = (o) => {
  for (const v of Object.values(o)) if (v && typeof v === "object") deepFreeze(v);
  return Object.freeze(o);
};

export const entry = deepFreeze({
  word: "tachtien",
  syllables: "tach·tien",
  partOfSpeech: "hoofdtelwoord",
  pronunciation: { ipa: "tɑxtin" },
  definition: "Ontelbaar veel.",
  origin: {
    text: "Verspreking van Julia van den Bergh in 2014, die gelijk werd geadopteerd door @ditisdesteven als één van zijn favoriete woorden.",
    year: 2014,
    links: [
      { title: "Julia van den Bergh", url: "https://twitter.com/jeweetweljulia/status/730801201332273152" },
      { title: "@ditisdesteven", url: "https://twitter.com/ditisdesteven/status/485465659695202305" },
    ],
  },
  examples: [
    { lines: ["Kater?", "Ja joh, gisteren tachtien kopstootjes en mezcal gedronken met JP."] },
    { lines: ["Tachtien Bloody Mary's graag!"] },
  ],
  mentions: [
    { title: "@larasteenv op Twitter (januari 2020)", source: "twitter", url: "https://twitter.com/larasteenv/status/1215342799794704385" },
    { title: "@kamphuis1979 op Twitter", source: "twitter", url: "https://twitter.com/kamphuis1979/status/1214690171335192578" },
    { title: "@larasteenv op Twitter (oktober 2017)", source: "twitter", url: "https://twitter.com/larasteenv/status/917994677697220608" },
    { title: "@ditisdesteven op Twitter", source: "twitter", url: "https://twitter.com/ditisdesteven/status/910881907482648576" },
    { title: "Metro nieuws", source: "press", url: "https://www.metronieuws.nl/nieuws/amsterdam/2017/07/tachtien-bloody-marys-graag-voor-de-cityguys" },
    { title: "Column van Mark Schoones", source: "press", url: "https://www.vacatureviaginny.nl/column/column-mark-schoones-de-noodrem-van-het-leven/" },
    { title: "MarketingTribune", source: "press", url: "https://www.marketingtribune.nl/content/nieuws/2017/07/cityguys-lanceert-youtube-serie-in-bioscoop/index.xml" },
    { title: "Upcoming", source: "press", url: "http://www.upcoming.nl/roella/23115/10-ellendige-momenten-waar-niet-ochtendmensen-dagelijks-mee-moeten-dealen" },
    { title: "Awesome aanlegplekken in Amsterdam", source: "cityguys", url: "https://www.cityguys.nl/amsterdam/awesome-aanlegplekken-amsterdam/" },
    { title: "Vette veganplekken in Amsterdam", source: "cityguys", url: "https://www.cityguys.nl/amsterdam/vette-veganplekken-amsterdam/" },
    { title: "Bao Buns in Amsterdam", source: "cityguys", url: "https://www.cityguys.nl/amsterdam/food-amsterdam/hier-eet-lekkerste-bao-buns-amsterdam/" },
    { title: "Cityguide Barcelona: Tachtien cervezas por favor!", source: "cityguys", url: "https://www.cityguys.nl/reizen/cityguide-barcelona-tachtien-cervezas-por-favor/" },
    { title: "Citytrip Kopenhagen", source: "cityguys", url: "https://www.cityguys.nl/reizen/kopenhagen-citytrip-hotspots/" },
    { title: "Het juryrapport van de Cityguys voor Jaimie van Heije. Een TACHTIEN+!", source: "cityguys", url: null },
  ],
  url: "https://tachtien.nl/",
});

const SOURCE_HEADINGS = { twitter: "Twitter", press: "Pers", cityguys: "Cityguys" };
const link = ({ title, url }) => (url ? `[${title}](${url})` : title);

/**
 * The whole entry as one Markdown document, in the order of the site.
 * @returns {string}
 */
export function entryMarkdown() {
  const lines = [
    `# ${entry.syllables} (${entry.partOfSpeech})`,
    "",
    "## Uitspraak",
    "",
    `/${entry.pronunciation.ipa}/`,
    "",
    "## Definitie",
    "",
    entry.definition,
    "",
    "## Herkomst",
    "",
    entry.origin.text,
    "",
    ...entry.origin.links.map((l) => `- ${link(l)}`),
    "",
    "## Voorbeelden",
    "",
    ...entry.examples.flatMap((ex) => [...ex.lines.map((l) => `> ${l}`), ""]),
    "## Externe vermeldingen",
  ];
  for (const source of MENTION_SOURCES) {
    lines.push("", `### ${SOURCE_HEADINGS[source]}`, "");
    for (const m of entry.mentions.filter((m) => m.source === source)) lines.push(`- ${link(m)}`);
  }
  lines.push("", `Bron: ${entry.url}`, "");
  return lines.join("\n");
}
