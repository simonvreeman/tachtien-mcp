/**
 * MCP server at /mcp (Streamable HTTP, stateless). Three lookup tools over
 * the tachtien.nl entry (define, examples, mentions), two playful ones
 * (tachtienify, is_tachtien) and the whole entry as resource tachtien://entry.
 *
 * Schemas and descriptions live at module scope; createServer() only
 * registers closures, so the per-request McpServer the stateless handler
 * needs is cheap.
 */
import { McpServer, SUPPORTED_PROTOCOL_VERSIONS } from "@modelcontextprotocol/server";
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
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const link = z.object({ title: z.string(), url: z.string() });
const example = z.object({ lines: z.array(z.string()) });
const mention = z.object({ title: z.string(), source: z.enum(MENTION_SOURCES), url: z.string().nullable() });

const TOOLS = {
  define: {
    description: "Define the Dutch word 'tachtien' (a cardinal number meaning 'ontelbaar veel', uncountably many): syllables, part of speech, IPA pronunciation, definition and origin, as on tachtien.nl. Content is in Dutch.",
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
    inputSchema: z.object({
      random: z.boolean().optional().describe("Return one example at random instead of all"),
    }),
    outputSchema: z.object({ examples: z.array(example) }),
  },
  mentions: {
    description: "External mentions of 'tachtien' (tweets, press and Cityguys articles) with title, source and URL. The url is null for a mention without a link.",
    inputSchema: z.object({
      source: z.enum(MENTION_SOURCES).optional().describe("Only mentions from this source"),
    }),
    outputSchema: z.object({ mentions: z.array(mention) }),
  },
  tachtienify: {
    description: "Rewrite a text so that vague large amounts in Dutch or English ('heel veel', 'honderden', 'a lot of', 'countless', ...) become 'tachtien'. Exact numbers are left alone, because they were counted. Returns the new text and the number of replacements.",
    inputSchema: z.object({
      text: z.string().min(1).max(5000).describe("The text to rewrite"),
    }),
    outputSchema: z.object({ text: z.string(), replacements: z.number().int() }),
  },
  is_tachtien: {
    description: "Judge whether an amount counts as 'tachtien' (uncountably many) and give a tongue-in-cheek reason in Dutch. Exact numbers never do (18 is achttien, 80 is tachtig, also inside a phrase like '18 biertjes'); vague amounts like 'heel veel' or 'geen idee' do, unless negated ('niet heel veel').",
    inputSchema: z.object({
      amount: z.union([z.number(), z.string().min(1).max(200)]).describe("A number, or an amount in words"),
    }),
    outputSchema: z.object({ isTachtien: z.boolean(), reason: z.string() }),
  },
};

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
  const register = (name, fn) =>
    server.registerTool(name, { ...TOOLS[name], annotations: READ_ONLY }, toolResult(name, fn));

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
    name: SERVER_INFO.name,
    title: "Tachtien",
    version: SERVER_INFO.version,
    description: "Read-only MCP server for the Dutch word tachtien (ontelbaar veel): look it up, find examples and mentions, rewrite vague amounts as tachtien, or ask whether something counts as tachtien.",
    vendor: { name: "Simon Vreeman", url: "https://vreeman.com" },
    license: { code: "MIT", repo: "https://github.com/simonvreeman/tachtien-mcp" },
    endpoint: ENDPOINT,
    transport: "http",
    protocolVersion: PROTOCOL_VERSIONS[0],
    supportedProtocolVersions: PROTOCOL_VERSIONS,
    authentication: "none",
    capabilities: { tools: true, resources: true, prompts: false },
    tools: Object.entries(TOOLS).map(([name, { description }]) => ({ name, description })),
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
