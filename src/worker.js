/**
 * Worker entry for mcp.tachtien.nl: /mcp is the MCP server, / a small page
 * that says what this is and how to connect. Everything else is a 404.
 * Trailing slashes are normalised once here so the MCP handler sees /mcp.
 */
import { handleMcp, MCP_PATH } from "./mcp.js";

const ENDPOINT = `https://mcp.tachtien.nl${MCP_PATH}`;
const PAGE_METHODS = new Set(["GET", "HEAD"]);

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
      pre { font: .85rem/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
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
      return new Response(request.method === "HEAD" ? null : PAGE, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};
