/**
 * Worker entry for mcp.tachtien.nl: /mcp is the MCP server, / a small page
 * that says what this is and how to connect. Everything else is a 404.
 * Trailing slashes are normalised once here so the MCP handler sees /mcp.
 */
import { handleMcp, MCP_PATH } from "./mcp.js";

const ENDPOINT = `https://mcp.tachtien.nl${MCP_PATH}`;
const PAGE_METHODS = new Set(["GET", "HEAD"]);
// no-cache: the page is tiny, and a deploy must show the new tool list at once.
// The page has no scripts, images or forms; the headers match tachtien.nl's _headers.
const PAGE_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-cache",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
};

const PAGE = `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Tachtien MCP</title>
    <meta name="description" content="MCP-server voor het woord tachtien: ontelbaar veel.">
    <meta name="robots" content="noindex">
    <meta name="color-scheme" content="light dark">
    <style>
      body { color: rgba(0, 0, 0, .75); font: italic calc(1rem + .5vw)/1.618 Georgia, serif; padding: 5%; max-width: 40em; }
      h1 { font-style: normal; font-weight: 100; letter-spacing: 2px; }
      a { color: inherit; }
      h2 { font-size: 1em; font-style: normal; font-weight: 400; letter-spacing: 2px; margin-top: 1.5em; }
      pre { font: .85rem/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
      code { font: normal .85em ui-monospace, Menlo, monospace; }
      dt { margin-top: 1em; }
      dt code { font-size: 1em; font-weight: 600; }
      dd { margin-left: 0; }
      @media (prefers-color-scheme: dark) { body { background: #404040; color: rgba(255, 255, 255, .9); } }
    </style>
  </head>
  <body>
    <h1>tach&middot;tien MCP</h1>
    <p>Een MCP-server voor het woord <a href="https://tachtien.nl/">tachtien</a>: ontelbaar veel. Met tools om het woord op te zoeken, voorbeelden en vermeldingen te vinden, teksten te tachtienificeren en te bepalen of iets tachtien is.</p>
    <p>Endpoint (Streamable HTTP, zonder login):</p>
    <pre>${ENDPOINT}</pre>
    <p>Toevoegen aan Claude Code:</p>
    <pre>claude mcp add --transport http tachtien ${ENDPOINT}</pre>
    <h2>Tools</h2>
    <dl>
      <dt><code>define</code></dt>
      <dd>Zoekt het woord op: lettergrepen, woordsoort, uitspraak (<code>tɑxtin</code>), definitie en herkomst.</dd>
      <dt><code>examples</code></dt>
      <dd>Voorbeeldzinnen met tachtien. Met <code>random: true</code> krijg je er één willekeurig.</dd>
      <dt><code>mentions</code></dt>
      <dd>Externe vermeldingen met link: tweets, pers en Cityguys. Filter met <code>source</code>: <code>twitter</code>, <code>press</code> of <code>cityguys</code>.</dd>
      <dt><code>tachtienify</code></dt>
      <dd>Vervangt vage grote hoeveelheden in een tekst door tachtien, in het Nederlands en Engels. Exacte getallen blijven staan, want die zijn geteld. &ldquo;Gisteren heel veel kopstootjes&rdquo; wordt &ldquo;Gisteren tachtien kopstootjes&rdquo;.</dd>
      <dt><code>is_tachtien</code></dt>
      <dd>Bepaalt of een hoeveelheid tachtien is, met een reden. 18 is achttien, 80 is tachtig, &ldquo;geen idee&rdquo; is wel tachtien.</dd>
    </dl>
    <h2>Resource</h2>
    <dl>
      <dt><code>tachtien://entry</code></dt>
      <dd>Het hele woordenboekartikel als Markdown, in één keer.</dd>
    </dl>
  </body>
</html>
`;

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
    if (path === "/") {
      if (!PAGE_METHODS.has(request.method)) {
        return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
      }
      return new Response(request.method === "HEAD" ? null : PAGE, { headers: PAGE_HEADERS });
    }
    return new Response("Not found", { status: 404 });
  },
};
