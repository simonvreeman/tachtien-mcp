/**
 * MCP server at /mcp (Streamable HTTP, stateless). Three lookup tools over
 * the tachtien.nl entry (define, examples, mentions), two playful ones
 * (tachtienify, is_tachtien), the whole entry as resource tachtien://entry,
 * and three prompts (uitleg, herschrijf, zin) that clients show as commands.
 *
 * Schemas and descriptions live at module scope; createServer() only
 * registers closures, so the per-request McpServer the stateless handler
 * needs is cheap.
 */
import { McpServer, SUPPORTED_PROTOCOL_VERSIONS, completable } from "@modelcontextprotocol/server";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/server/validators/cf-worker";
import { createMcpHandler } from "agents/mcp/server";
import * as z from "zod";
import { entry, entryMarkdown, MENTION_SOURCES } from "./entry.js";
import { tachtienify, isTachtien } from "./playful.js";
import pkg from "../package.json";

const SERVER_INFO = { name: "tachtien", version: pkg.version };
export const MCP_PATH = "/mcp";
const ENDPOINT = `https://mcp.tachtien.nl${MCP_PATH}`;
const ENTRY_URI = "tachtien://entry";
const ENTRY_RESOURCE = { title: "Tachtien (woordenboekartikel)", description: "The whole tachtien.nl entry as Markdown, in Dutch.", mimeType: "text/markdown" };
// 2026-07-28 is served through server/discover; the handshake revisions through initialize.
const PROTOCOL_VERSIONS = ["2026-07-28", ...SUPPORTED_PROTOCOL_VERSIONS];
// Every tool only reads frozen data or computes on its input: no writes, no network.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const link = z.object({ title: z.string(), url: z.string() });
const example = z.object({ lines: z.array(z.string()) });
const mention = z.object({ title: z.string(), source: z.enum(MENTION_SOURCES), url: z.string().nullable() });

const TOOLS = {
  define: {
    description: "Define the Dutch word 'tachtien' (a cardinal number meaning 'ontelbaar veel', uncountably many): syllables, part of speech, IPA pronunciation, definition and origin, as on tachtien.nl. Content is in Dutch.",
    pageDescription: "Zoekt het woord op: lettergrepen, woordsoort, uitspraak (<code lang=\"nl-fonipa\">tɑxtin</code>), definitie en herkomst.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      word: z.string(),
      syllables: z.string(),
      partOfSpeech: z.string(),
      pronunciation: z.object({ ipa: z.string() }),
      definition: z.string(),
      origin: z.object({ text: z.string(), year: z.number().int(), links: z.array(link) }),
      url: z.string(),
    }),
  },
  examples: {
    description: "Example sentences that use 'tachtien', in Dutch. Each example is a short dialogue of one or more lines.",
    pageDescription: "Voorbeeldzinnen met tachtien. Met <code>random: true</code> krijg je er één willekeurig.",
    inputSchema: z.object({
      random: z.boolean().optional().describe("Return one example at random instead of all"),
    }),
    outputSchema: z.object({ examples: z.array(example) }),
  },
  mentions: {
    description: "External mentions of 'tachtien' (tweets, press and Cityguys articles) with title, source and URL. The url is null for a mention without a link.",
    pageDescription: "Externe vermeldingen met link: tweets, pers en Cityguys. Filter met <code>source</code>: <code>twitter</code>, <code>press</code> of <code>cityguys</code>.",
    inputSchema: z.object({
      source: z.enum(MENTION_SOURCES).optional().describe("Only mentions from this source"),
    }),
    outputSchema: z.object({ mentions: z.array(mention) }),
  },
  tachtienify: {
    description: "Rewrite a text so that vague large amounts in Dutch or English ('heel veel', 'honderden', 'a lot of', 'countless', ...) and large estimates ('ongeveer honderd', '~200', '100+') become 'tachtien'. Exact numbers, small estimates and years are left alone. Returns the new text, the number of replacements and each replaced phrase with its index in the input.",
    pageDescription: "Vervangt vage grote hoeveelheden en grote schattingen in een tekst door tachtien, in het Nederlands en Engels, en zegt waar. Exacte getallen en jaartallen blijven staan, want die zijn geteld. &ldquo;Gisteren heel veel kopstootjes met ongeveer honderd man&rdquo; wordt &ldquo;Gisteren tachtien kopstootjes met tachtien man&rdquo;.",
    inputSchema: z.object({
      text: z.string().min(1).max(5000).describe("The text to rewrite"),
    }),
    outputSchema: z.object({
      text: z.string(),
      replacements: z.number().int(),
      replaced: z.array(z.object({ text: z.string(), index: z.number().int() })),
    }),
  },
  is_tachtien: {
    description: "Judge whether an amount counts as 'tachtien' (uncountably many) and give a tongue-in-cheek reason in Dutch. Exact numbers never do (18 is achttien, 80 is tachtig, also inside a phrase like '18 biertjes'). Vague amounts like 'heel veel' or 'geen idee' do, and so do estimates of 50 or more, lower bounds included ('ongeveer honderd', 'meer dan 50', '100+'), because nobody counted; negation ('niet heel veel') makes either false.",
    pageDescription: "Bepaalt of een hoeveelheid tachtien is, met een reden. 18 is achttien, 80 is tachtig, &ldquo;geen idee&rdquo; en &ldquo;ongeveer honderd&rdquo; zijn wel tachtien, &ldquo;niet heel veel&rdquo; en &ldquo;zo&rsquo;n dertig&rdquo; niet. Een schatting telt vanaf vijftig, ook &ldquo;meer dan&rdquo; of &ldquo;ruim&rdquo;.",
    inputSchema: z.object({
      // examples give test clients a valid value to send.
      amount: z.union([z.number(), z.string().min(1).max(200)])
        .describe("A number, or an amount in words")
        .meta({ examples: ["heel veel", "ongeveer honderd", 18] }),
    }),
    outputSchema: z.object({ isTachtien: z.boolean(), reason: z.string() }),
  },
};

/** JSON Schema for a zod schema, converted the way the SDK does for tools/list. */
const jsonSchema = (schema, io) => ({ type: "object", ...schema["~standard"].jsonSchema[io]({ target: "draft-2020-12" }) });

/** Tool definitions as tools/list returns them, for the server card. */
const listedTools = () => Object.entries(TOOLS).map(([name, { description, inputSchema, outputSchema }]) => ({
  name,
  description,
  inputSchema: jsonSchema(inputSchema, "input"),
  annotations: READ_ONLY,
  outputSchema: jsonSchema(outputSchema, "output"),
}));

// Prompt arguments are strings; completable() feeds completion/complete.
const startsWith = (options) => (value = "") =>
  options.filter((o) => o.toLowerCase().startsWith(value.toLowerCase()));
const LANGUAGES = ["Nederlands", "English"];
const TOPICS = ["kopstootjes", "Bloody Mary's", "cervezas", "mails", "vergaderingen", "katers", "verjaardagen", "bao buns"];

const PROMPTS = {
  uitleg: {
    title: "Leg tachtien uit",
    description: "Explain the Dutch word tachtien (meaning, pronunciation, origin, an example) from the tachtien.nl entry.",
    pageDescription: "Legt het woord uit met het hele artikel erbij. Met <code>taal: English</code> in het Engels.",
    argsSchema: z.object({
      taal: completable(z.string().describe("Language of the explanation: Nederlands or English"), startsWith(LANGUAGES)).optional(),
    }),
  },
  herschrijf: {
    title: "Herschrijf met tachtien",
    description: "Rewrite a text with tachtien: the server replaces vague large amounts and estimates, then asks the model to fix the grammar around each replacement.",
    pageDescription: "Haalt je <code>tekst</code> door tachtienify en vraagt het model de grammatica rond elk tachtien recht te zetten.",
    argsSchema: z.object({ tekst: z.string().min(1).max(5000).describe("The text to rewrite") }),
  },
  zin: {
    title: "Verzin een zin met tachtien",
    description: "Write a new Dutch example sentence with tachtien, in the style of the examples on tachtien.nl.",
    pageDescription: "Verzint een nieuwe voorbeeldzin in de stijl van tachtien.nl, eventueel over een <code>onderwerp</code>.",
    argsSchema: z.object({
      onderwerp: completable(z.string().max(200).describe("What the sentence is about, for example kopstootjes"), startsWith(TOPICS)).optional(),
    }),
  },
};

/** Dutch display copy for the info page, derived from the registered MCP definitions. */
export const PAGE_CONTENT = {
  tools: Object.entries(TOOLS).map(([name, { pageDescription }]) => ({ name, description: pageDescription })),
  prompts: Object.entries(PROMPTS).map(([name, { pageDescription }]) => ({ name, description: pageDescription })),
};

const userText = (text) => ({ role: "user", content: { type: "text", text } });
const entryResource = () => ({
  role: "user",
  content: { type: "resource", resource: { uri: ENTRY_URI, mimeType: "text/markdown", text: entryMarkdown() } },
});

// The text block keeps clients without structured output support working.
const text = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: data });
const toolError = (message) => ({ content: [{ type: "text", text: message }], isError: true });
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Wrap a tool body: its return value becomes a JSON text result; a throw is logged and masked. */
const toolResult = (name, fn) => async (args) => {
  try {
    return text(await fn(args));
  } catch (e) {
    console.error("mcp tool error", { tool: name, message: e.message, stack: e.stack });
    return toolError("Internal error");
  }
};

function createServer() {
  const server = new McpServer(SERVER_INFO, { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() });
  const register = (name, fn) => {
    const { pageDescription, ...definition } = TOOLS[name];
    return server.registerTool(name, { ...definition, annotations: READ_ONLY }, toolResult(name, fn));
  };

  register("define", () => {
    const { examples, mentions, ...definition } = entry;
    return definition;
  });
  register("examples", ({ random }) => ({ examples: random ? [pick(entry.examples)] : entry.examples }));
  register("mentions", ({ source }) => ({
    mentions: source ? entry.mentions.filter((m) => m.source === source) : entry.mentions,
  }));
  register("tachtienify", ({ text }) => tachtienify(text));
  register("is_tachtien", ({ amount }) => isTachtien(amount));

  server.registerPrompt("uitleg", PROMPTS.uitleg, ({ taal }) => ({
    messages: [
      entryResource(),
      userText(/^en/i.test(taal ?? "")
        ? "Explain the Dutch word tachtien to me in English, using only the entry above: what it means, how to pronounce it, where it comes from, and one of its examples with a translation. Keep it short."
        : "Leg me het woord tachtien uit met alleen het artikel hierboven: wat het betekent, hoe je het uitspreekt, waar het vandaan komt, en één van de voorbeelden. Houd het kort."),
    ],
  }));
  server.registerPrompt("herschrijf", PROMPTS.herschrijf, ({ tekst }) => {
    const result = tachtienify(tekst);
    const found = result.replaced.map((r) => `- "${r.text}"`).join("\n");
    return {
      messages: [userText(result.replacements
        ? `Ik heb deze tekst door tachtienify gehaald. Vervangen:\n${found}\n\nOrigineel:\n${tekst}\n\nResultaat:\n${result.text}\n\nGeef het resultaat terug met kloppende grammatica rond elk "tachtien" (lidwoorden, enkelvoud of meervoud). Verander verder niets, en laat exacte getallen staan.`
        : `Ik heb deze tekst door tachtienify gehaald, maar er stond geen vage grote hoeveelheid of grote schatting in:\n\n${tekst}\n\nWijs aan waar tachtien zou passen, en leg uit dat exacte getallen niet tachtien zijn, omdat ze geteld zijn.`)],
    };
  });
  server.registerPrompt("zin", PROMPTS.zin, ({ onderwerp }) => ({
    messages: [userText([
      "Tachtien betekent ontelbaar veel. Dit zijn de voorbeelden van tachtien.nl:",
      ...entry.examples.map((ex) => ex.lines.map((l) => `> ${l}`).join("\n")),
      `Verzin één nieuwe, korte Nederlandse zin of dialoog met tachtien${onderwerp ? ` over ${onderwerp}` : ""}, in dezelfde stijl. Gebruik tachtien als telwoord voor iets wat je niet meer kunt tellen, nooit als exact getal.`,
    ].join("\n\n"))],
  }));

  server.registerResource(
    "entry",
    ENTRY_URI,
    ENTRY_RESOURCE,
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: entryMarkdown() }] }),
  );
  return server;
}

// Public, read-only and without auth or sessions, so any browser origin may call it.
const handler = createMcpHandler(createServer, { route: MCP_PATH, allowedOriginHostnames: "*" });

/**
 * The MCP server card for /.well-known/mcp/server-card.json, built from the
 * same tool and resource definitions the server registers.
 */
export function serverCard() {
  return {
    // serverInfo is the SEP-1649 shape; the flat name/title/version match older cards.
    serverInfo: { ...SERVER_INFO, title: "Tachtien" },
    name: SERVER_INFO.name,
    title: "Tachtien",
    version: SERVER_INFO.version,
    description: "Read-only MCP server for the Dutch word tachtien (ontelbaar veel): look it up, find examples and mentions, rewrite vague amounts and estimates as tachtien, or ask whether something counts as tachtien. Prompts explain the word, rewrite a text and write a new example.",
    vendor: { name: "Simon Vreeman", url: "https://vreeman.com" },
    license: { code: "MIT", repo: "https://github.com/simonvreeman/tachtien-mcp" },
    endpoint: ENDPOINT,
    transport: "http",
    protocolVersion: PROTOCOL_VERSIONS[0],
    supportedProtocolVersions: PROTOCOL_VERSIONS,
    authentication: "none",
    capabilities: { tools: true, resources: true, prompts: true, completions: true },
    tools: listedTools(),
    prompts: Object.entries(PROMPTS).map(([name, { title, description }]) => ({ name, title, description })),
    resources: [{ uri: ENTRY_URI, name: "entry", ...ENTRY_RESOURCE }],
    links: {
      site: "https://tachtien.nl/",
      source: "https://github.com/simonvreeman/tachtien-mcp",
      landingPage: "https://mcp.tachtien.nl/",
    },
  };
}

/** Serve one MCP request. */
export function handleMcp(request, env, ctx) {
  return handler(request, env, ctx);
}
