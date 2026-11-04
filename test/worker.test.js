import { describe, it, expect } from "vitest";
import worker from "../src/worker.js";
import pkg from "../package.json";

const fetch = (path, init) => worker.fetch(new Request(`https://mcp.tachtien.nl${path}`, init), {}, {});
const toolsList = {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
};
const listTools = async () => {
  const body = await (await fetch("/mcp", toolsList)).text();
  return JSON.parse(body.split("\n").find((l) => l.startsWith("data:")).slice(5)).result.tools;
};

describe("worker", () => {
  it("serves the info page at /", async () => {
    const res = await fetch("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await res.text();
    expect(html).toContain("https://mcp.tachtien.nl/mcp");
    expect(html).toContain('href="https://tachtien.nl/"');
    expect(html).toMatch(/<main>[\s\S]*<h1>[\s\S]*<\/main>/);
    expect(html).toContain('<link rel="canonical" href="https://mcp.tachtien.nl/">');
    expect(html).not.toContain("noindex");
    expect(html).toContain('<meta property="og:title"');
    expect(html).toContain('<link rel="icon" href="https://tachtien.nl/favicon.svg"');
    expect(html).toContain('href="https://tachtien.nl/privacy"');
    expect(html).toContain("<h3>Cursor</h3>");
    expect(html).toContain('"tachtien": { "url": "https://mcp.tachtien.nl/mcp" }');
    expect(html).toContain('Gemaakt door <a href="https://vreeman.com">Simon Vreeman</a>');
    expect((await fetch("/", { method: "HEAD" })).status).toBe(200);
  });
  it("sends revalidation and security headers with the info page", async () => {
    const { headers } = await fetch("/");
    expect(headers.get("cache-control")).toBe("no-cache");
    const csp = headers.get("content-security-policy");
    for (const directive of ["default-src 'none'", "img-src https://tachtien.nl", "frame-ancestors 'none'", "upgrade-insecure-requests"]) {
      expect(csp).toContain(directive);
    }
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("permissions-policy")).toContain("camera=()");
    expect(headers.get("link")).toContain('</.well-known/mcp/server-card.json>; rel="mcp"');
  });
  it("answers 304 when the ETag still matches", async () => {
    const etag = (await fetch("/")).headers.get("etag");
    expect(etag).toMatch(/^"[0-9a-f]+"$/);
    const res = await fetch("/", { headers: { "if-none-match": etag } });
    expect(res.status).toBe(304);
    expect(await res.text()).toBe("");
    // Cloudflare weakens the ETag when it compresses, so browsers send it back as W/"...".
    expect((await fetch("/", { headers: { "if-none-match": `W/${etag}` } })).status).toBe(304);
    expect((await fetch("/", { headers: { "if-none-match": '"stale"' } })).status).toBe(200);
  });
  it("describes every tool, prompt and the resource on the info page", async () => {
    const html = await (await fetch("/")).text();
    const tools = await listTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const { name } of tools) expect(html, name).toContain(`<dt><code>${name}</code>`);
    const card = await (await fetch("/.well-known/mcp/server-card.json")).json();
    for (const { name } of card.prompts) expect(html, name).toContain(`<dt><code>${name}</code>`);
    expect(html).toContain("tachtien://entry");
  });
  it("routes /mcp and /mcp/ to the MCP server", async () => {
    for (const path of ["/mcp", "/mcp/"]) {
      const res = await fetch(path, toolsList);
      expect(res.status, path).toBe(200);
      expect(await res.text()).toContain("tachtienify");
    }
  });
  it("serves an MCP server card that matches the server", async () => {
    const res = await fetch("/.well-known/mcp/server-card.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const card = await res.json();
    expect(card).toMatchObject({ name: "tachtien", version: pkg.version, endpoint: "https://mcp.tachtien.nl/mcp", transport: "http", authentication: "none" });
    expect(card.serverInfo).toEqual({ name: "tachtien", title: "Tachtien", version: pkg.version });
    expect(card.supportedProtocolVersions).toContain("2025-06-18");
    // Directory scanners read the card, so it carries the full tools/list definitions.
    expect(card.tools).toEqual(await listTools());
    for (const t of card.tools) {
      expect(Object.keys(t.annotations).sort(), t.name).toEqual(["destructiveHint", "idempotentHint", "openWorldHint", "readOnlyHint"]);
      expect(Object.values(t.annotations).every((v) => typeof v === "boolean"), t.name).toBe(true);
      expect(t.inputSchema.type, t.name).toBe("object");
    }
    expect(card.resources).toEqual([expect.objectContaining({ uri: "tachtien://entry" })]);
    expect(card.prompts.map((p) => p.name)).toEqual(["uitleg", "herschrijf", "zin"]);
  });
  it("serves robots.txt with content signals", async () => {
    const res = await fetch("/robots.txt");
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const body = await res.text();
    expect(body).toMatch(/User-agent: \*\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\nAllow: \//);
    expect(body).toContain("Agentmap: https://tachtien.nl/.well-known/ai-catalog.json");
  });
  it("serves no body for HEAD requests to static discovery files", async () => {
    for (const path of ["/.well-known/mcp/server-card.json", "/robots.txt", "/.well-known/security.txt"]) {
      const res = await fetch(path, { method: "HEAD" });
      expect(res.status, path).toBe(200);
      expect(await res.text(), path).toBe("");
    }
  });
  it("serves security.txt and sends favicon and privacy requests to tachtien.nl", async () => {
    const txt = await fetch("/.well-known/security.txt");
    expect(txt.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const body = await txt.text();
    expect(body).toContain("Contact: https://vreeman.com/");
    expect(body).toContain("Canonical: https://mcp.tachtien.nl/.well-known/security.txt");
    const icon = await fetch("/favicon.ico");
    expect(icon.status).toBe(301);
    expect(icon.headers.get("location")).toBe("https://tachtien.nl/favicon.ico");
    const privacy = await fetch("/privacy");
    expect(privacy.status).toBe(301);
    expect(privacy.headers.get("location")).toBe("https://tachtien.nl/privacy");
  });
  it("answers an HTML 404 with a way back, and 405 for POST /", async () => {
    const res = await fetch("/nope");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await res.text()).toContain('<a href="/">');
    expect((await fetch("/", { method: "POST" })).status).toBe(405);
    const cardPost = await fetch("/.well-known/mcp/server-card.json", { method: "POST" });
    expect(cardPost.status).toBe(405);
    expect(cardPost.headers.get("allow")).toBe("GET, HEAD");
  });
});
