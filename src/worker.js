/**
 * Worker entry for mcp.tachtien.nl: /mcp is the MCP server, / a small page
 * that says what this is and how to connect, plus the server card and
 * security.txt under /.well-known/. Everything else is an HTML 404.
 * Trailing slashes are normalised once here so the MCP handler sees /mcp.
 */
import { handleMcp, MCP_PATH, serverCard } from "./mcp.js";

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

const SECURITY_TXT = `Contact: mailto:simon@vreeman.com
Expires: 2027-10-31T00:00:00.000Z
Preferred-Languages: nl, en
Canonical: ${ORIGIN}/.well-known/security.txt
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
      body { color: rgba(0, 0, 0, .75); background: #fff; font: italic calc(1rem + .5vw)/1.618 Georgia, serif; padding: 5%; max-width: 40em; }
      h1 { font-style: normal; font-weight: 100; letter-spacing: 2px; }
      a { color: inherit; }
      h2 { font-size: 1em; font-style: normal; font-weight: 400; letter-spacing: 2px; margin-top: 1.5em; }
      pre { font: .85rem/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
      code { font: normal .85em ui-monospace, Menlo, monospace; }
      dt { margin-top: 1em; }
      dt code { font-size: 1em; font-weight: 600; }
      dd { margin-left: 0; }
      footer { margin-top: 3em; font-size: 1rem; }
      @media (prefers-color-scheme: dark) { body { background: #404040; color: rgba(255, 255, 255, .9); } }
    </style>
  </head>
  <body>
${body}  </body>
</html>
`;

const DESCRIPTION = "MCP-server voor het woord tachtien: ontelbaar veel.";
const PAGE = layout({
  title: "Tachtien MCP",
  head: `    <meta name="description" content="${DESCRIPTION}">
    <meta name="robots" content="noindex">
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
      <p>Een MCP-server voor het woord <a href="https://tachtien.nl/">tachtien</a>: ontelbaar veel. Met tools om het woord op te zoeken, voorbeelden en vermeldingen te vinden, teksten te tachtienificeren en te bepalen of iets tachtien is.</p>
      <p>Endpoint (Streamable HTTP, zonder login):</p>
      <pre>${ENDPOINT}</pre>
      <p>Toevoegen aan Claude Code:</p>
      <pre>claude mcp add --transport http tachtien ${ENDPOINT}</pre>
      <h2>Tools</h2>
      <dl>
        <dt><code>define</code></dt>
        <dd>Zoekt het woord op: lettergrepen, woordsoort, uitspraak (<code lang="nl-fonipa">tɑxtin</code>), definitie en herkomst.</dd>
        <dt><code>examples</code></dt>
        <dd>Voorbeeldzinnen met tachtien. Met <code>random: true</code> krijg je er één willekeurig.</dd>
        <dt><code>mentions</code></dt>
        <dd>Externe vermeldingen met link: tweets, pers en Cityguys. Filter met <code>source</code>: <code>twitter</code>, <code>press</code> of <code>cityguys</code>.</dd>
        <dt><code>tachtienify</code></dt>
        <dd>Vervangt vage grote hoeveelheden in een tekst door tachtien, in het Nederlands en Engels. Exacte getallen blijven staan, want die zijn geteld. &ldquo;Gisteren heel veel kopstootjes&rdquo; wordt &ldquo;Gisteren tachtien kopstootjes&rdquo;.</dd>
        <dt><code>is_tachtien</code></dt>
        <dd>Bepaalt of een hoeveelheid tachtien is, met een reden. 18 is achttien, 80 is tachtig, &ldquo;geen idee&rdquo; is wel tachtien, &ldquo;niet heel veel&rdquo; niet.</dd>
      </dl>
      <h2>Resource</h2>
      <dl>
        <dt><code>tachtien://entry</code></dt>
        <dd>Het hele woordenboekartikel als Markdown, in één keer.</dd>
      </dl>
    </main>
    <footer>
      <p><a href="${CARD_PATH}">MCP server card</a> &middot; <a href="https://github.com/simonvreeman/tachtien-mcp">Broncode op GitHub</a> &middot; <a href="https://tachtien.nl/privacy">Privacy</a></p>
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
      return Response.json(serverCard(), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600", "access-control-allow-origin": "*" },
      });
    }
    if (path === "/.well-known/security.txt") {
      return new Response(SECURITY_TXT, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" } });
    }
    if (path === "/favicon.ico") return Response.redirect("https://tachtien.nl/favicon.ico", 301);
    return html(request, NOT_FOUND, 404);
  },
};
