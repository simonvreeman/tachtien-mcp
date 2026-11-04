/**
 * Worker entry for mcp.tachtien.nl: /mcp is the MCP server, / a small page
 * that says what this is and how to connect, plus the server card and
 * security.txt under /.well-known/. Everything else is an HTML 404.
 * Trailing slashes are normalised once here so the MCP handler sees /mcp.
 */
import { handleMcp, MCP_PATH, PAGE_CONTENT, serverCard } from "./mcp.js";

const ORIGIN = "https://mcp.tachtien.nl";
const ENDPOINT = `${ORIGIN}${MCP_PATH}`;
const CARD_PATH = "/.well-known/mcp/server-card.json";
const PAGE_METHODS = new Set(["GET", "HEAD"]);

// no-cache plus an ETag: the page is tiny, a deploy must show the new tool list
// at once, and an unchanged page revalidates with an empty 304.
// The pages have no scripts or forms; the only images are tachtien.nl's icons.
// The headers match tachtien.nl's _headers.
const PAGE_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-cache",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src https://tachtien.nl; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  "cross-origin-opener-policy": "same-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
};
const DISCOVERY_LINKS = [
  `<${CARD_PATH}>; rel="mcp"; type="application/json"; title="MCP server card"`,
  `<${ENDPOINT}>; rel="related"; title="MCP endpoint"`,
  `</.well-known/security.txt>; rel="security"; type="text/plain"`,
].join(", ");

const SECURITY_TXT = `Contact: https://vreeman.com/
Expires: 2027-10-31T00:00:00.000Z
Preferred-Languages: nl, en
Canonical: ${ORIGIN}/.well-known/security.txt
`;

// The same signals as tachtien.nl/robots.txt: the server exists to be used by AI.
const ROBOTS_TXT = `User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /

Agentmap: https://tachtien.nl/.well-known/ai-catalog.json
`;

const layout = ({ title, head = "", body }) => `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#404040" media="(prefers-color-scheme: dark)">
    <link rel="icon" href="https://tachtien.nl/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="https://tachtien.nl/apple-touch-icon.png">
${head}    <style>
      :root { --muted: rgba(0, 0, 0, .45); --tint: rgba(0, 0, 0, .05); --rule: rgba(0, 0, 0, .15); }
      body { color: rgba(0, 0, 0, .8); background: #fff; font: calc(.8rem + .35vw)/1.65 ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; padding: 5%; max-width: 72ch; }
      a { color: inherit; text-underline-offset: .2em; }
      h1 { font-size: 2em; font-weight: 700; letter-spacing: -.02em; line-height: 1.2; margin: 0 0 .75em; }
      h2 { font-size: 1.25em; font-weight: 700; line-height: 1.3; margin: 2.5em 0 .75em; }
      h3 { font-size: 1em; font-weight: 700; line-height: 1.4; margin: 1.75em 0 .5em; }
      h2::before { content: "## "; color: var(--muted); }
      h3::before { content: "### "; color: var(--muted); }
      .note { font-size: .85em; color: var(--muted); }
      pre { font: inherit; font-size: .9em; white-space: pre-wrap; overflow-wrap: anywhere; padding: .75em 1em; background: var(--tint); border-left: 3px solid var(--rule); }
      .cmd::before { content: "$ "; color: var(--muted); user-select: none; }
      code { font: inherit; padding: .05em .3em; background: var(--tint); border-radius: 3px; }
      dt { margin-top: 1.5em; }
      dt code { font-weight: 700; padding: 0; background: none; }
      dt code::before { content: "> "; color: var(--muted); }
      dd { margin-left: 2ch; }
      ol { padding-left: 3ch; }
      footer { margin-top: 4em; padding-top: 1em; border-top: 1px dashed var(--rule); font-size: .8em; color: var(--muted); }
      @media (prefers-color-scheme: dark) {
        :root { --muted: rgba(255, 255, 255, .5); --tint: rgba(255, 255, 255, .08); --rule: rgba(255, 255, 255, .25); }
        body { background: #404040; color: rgba(255, 255, 255, .9); }
      }
    </style>
  </head>
  <body>
${body}  </body>
</html>
`;

const definitionList = (items) => `      <dl>
${items.map(({ name, description }) => `        <dt><code>${name}</code></dt>
        <dd>${description}</dd>`).join("\n")}
      </dl>`;

const DESCRIPTION = "MCP-server voor het woord tachtien: ontelbaar veel.";
const PAGE = layout({
  title: "Tachtien MCP",
  head: `    <meta name="description" content="${DESCRIPTION}">
    <link rel="canonical" href="${ORIGIN}/">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${ORIGIN}/">
    <meta property="og:title" content="Tachtien MCP">
    <meta property="og:description" content="${DESCRIPTION}">
    <meta property="og:image" content="https://tachtien.nl/tachtien.jpg">
    <meta property="og:image:width" content="669">
    <meta property="og:image:height" content="662">
    <meta property="og:image:alt" content="Logo van tachtien: een doorgestreepte 80 die overgaat in 18">
    <meta property="og:locale" content="nl_NL">
    <meta name="twitter:card" content="summary">
`,
  body: `    <main>
      <h1>tach&middot;tien MCP</h1>
      <p class="lead">Een MCP-server voor het woord <a href="https://tachtien.nl/">tachtien</a>: ontelbaar veel. Met tools om het woord op te zoeken, voorbeelden en vermeldingen te vinden, teksten te tachtienificeren en te bepalen of iets tachtien is.</p>
      <h2>Verbinden</h2>
      <h3>Endpoint</h3>
      <pre>${ENDPOINT}</pre>
      <p class="note">Streamable HTTP, zonder login.</p>
      <h3>Claude Code</h3>
      <pre class="cmd">claude mcp add --transport http tachtien ${ENDPOINT}</pre>
      <h3>Cursor</h3>
      <p>Zet dit in <code>.cursor/mcp.json</code> in je project, of in <code>~/.cursor/mcp.json</code> voor al je projecten:</p>
      <pre>{
  "mcpServers": {
    "tachtien": { "url": "${ENDPOINT}" }
  }
}</pre>
      <h3>ChatGPT (op het web)</h3>
      <ol>
        <li>Open <strong>Plugins</strong>, kies <strong>+</strong> en daarna <strong>Add custom MCP server</strong>.</li>
        <li>Geef de server bijvoorbeeld de naam <code>Tachtien</code> en vul als endpoint <code>${ENDPOINT}</code> in.</li>
        <li>Kies geen authenticatie, maak de plugin aan en installeer hem. Gebruik daarna <code>@Tachtien</code> in een nieuwe chat.</li>
      </ol>
      <p class="note">De mogelijkheid om eigen MCP-servers toe te voegen hangt af van je ChatGPT-abonnement en de instellingen van je workspace. Lees de <a href="https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt">officiële ChatGPT-handleiding</a> voor de actuele stappen.</p>
      <h2>Tools</h2>
${definitionList(PAGE_CONTENT.tools)}
      <h2>Prompts</h2>
      <p>Prompts start je zelf, bijvoorbeeld als slash-commando in je MCP-client.</p>
${definitionList(PAGE_CONTENT.prompts)}
      <h2>Resource</h2>
      <dl>
        <dt><code>tachtien://entry</code></dt>
        <dd>Het hele woordenboekartikel als Markdown, in één keer.</dd>
      </dl>
    </main>
    <footer>
      <p><a href="${CARD_PATH}">MCP server card</a> &middot; <a href="https://github.com/simonvreeman/tachtien-mcp">Broncode op GitHub</a> &middot; <a href="https://tachtien.nl/privacy">Privacy</a></p>
      <p>Gemaakt door <a href="https://vreeman.com">Simon Vreeman</a>.</p>
    </footer>
`,
});

const NOT_FOUND = layout({
  title: "Pagina niet gevonden - Tachtien MCP",
  head: `    <meta name="robots" content="noindex">
`,
  body: `    <main>
      <h1>404</h1>
      <p>Deze pagina bestaat niet. Het MCP-endpoint is <code>${ENDPOINT}</code>.</p>
      <p><a href="/">Naar de uitleg over de Tachtien MCP</a> of <a href="https://tachtien.nl/">de definitie van tachtien</a></p>
    </main>
`,
});

// FNV-1a: a stable 32-bit content hash, enough to tell two versions of the page apart.
const fnv1a = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
};
const PAGE_ETAG = `"${fnv1a(PAGE)}"`;

// Cloudflare weakens the ETag when it compresses the response, so compare without W/.
const etagMatches = (header, etag) =>
  header?.split(",").some((t) => t.trim().replace(/^W\//, "") === etag || t.trim() === "*") ?? false;

const html = (request, body, status = 200, extra = {}) =>
  new Response(request.method === "HEAD" ? null : body, { status, headers: { ...PAGE_HEADERS, ...extra } });
const plain = (request, body, headers) =>
  new Response(request.method === "HEAD" ? null : body, { headers });
const json = (request, data, headers) =>
  request.method === "HEAD" ? new Response(null, { headers }) : Response.json(data, { headers });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === MCP_PATH) {
      if (path !== url.pathname) {
        url.pathname = path;
        request = new Request(url, request);
      }
      return handleMcp(request, env, ctx);
    }
    if (!PAGE_METHODS.has(request.method)) {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    if (path === "/") {
      const headers = { etag: PAGE_ETAG, link: DISCOVERY_LINKS };
      if (etagMatches(request.headers.get("if-none-match"), PAGE_ETAG)) {
        return new Response(null, { status: 304, headers: { ...PAGE_HEADERS, ...headers } });
      }
      return html(request, PAGE, 200, headers);
    }
    if (path === CARD_PATH) {
      return json(request, serverCard(), { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" });
    }
    if (path === "/robots.txt") {
      return plain(request, ROBOTS_TXT, { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" });
    }
    if (path === "/.well-known/security.txt") {
      return plain(request, SECURITY_TXT, { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" });
    }
    if (path === "/favicon.ico") return Response.redirect("https://tachtien.nl/favicon.ico", 301);
    // The privacy policy lives on the site; scanners look for it on this host.
    if (path === "/privacy") return Response.redirect("https://tachtien.nl/privacy", 301);
    return html(request, NOT_FOUND, 404);
  },
};
