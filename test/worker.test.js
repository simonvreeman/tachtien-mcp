import { describe, it, expect } from "vitest";
import worker from "../src/worker.js";

const fetch = (path, init) => worker.fetch(new Request(`https://mcp.tachtien.nl${path}`, init), {}, {});
const toolsList = {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
};

describe("worker", () => {
  it("serves the info page at /", async () => {
    const res = await fetch("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await res.text();
    expect(html).toContain("https://mcp.tachtien.nl/mcp");
    expect(html).toContain('href="https://tachtien.nl/"');
    expect((await fetch("/", { method: "HEAD" })).status).toBe(200);
  });
  it("describes every tool and the resource on the info page", async () => {
    const html = await (await fetch("/")).text();
    const body = await (await fetch("/mcp", toolsList)).text();
    const { result } = JSON.parse(body.split("\n").find((l) => l.startsWith("data:")).slice(5));
    expect(result.tools.length).toBeGreaterThan(0);
    for (const { name } of result.tools) expect(html, name).toContain(`<dt><code>${name}</code>`);
    expect(html).toContain("tachtien://entry");
  });
  it("routes /mcp and /mcp/ to the MCP server", async () => {
    for (const path of ["/mcp", "/mcp/"]) {
      const res = await fetch(path, toolsList);
      expect(res.status, path).toBe(200);
      expect(await res.text()).toContain("tachtienify");
    }
  });
  it("answers 404 elsewhere and 405 for POST /", async () => {
    expect((await fetch("/nope")).status).toBe(404);
    expect((await fetch("/", { method: "POST" })).status).toBe(405);
  });
});
