import { describe, it, expect } from "vitest";
import { handleMcp } from "../src/mcp.js";
import pkg from "../package.json";

const rpc = (body) => new Request("https://mcp.tachtien.nl/mcp", {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
  body: JSON.stringify(body),
});
const parse = async (res) => {
  const text = await res.text();
  const line = text.split("\n").find((l) => l.startsWith("data:"));
  return JSON.parse(line ? line.slice(5) : text);
};
const send = async (method, params) => parse(await handleMcp(rpc({ jsonrpc: "2.0", id: 1, method, params }), {}, {}));
const call = async (name, args = {}) => (await send("tools/call", { name, arguments: args })).result;
const data = (result) => JSON.parse(result.content[0].text);

describe("mcp", () => {
  it("initializes and lists the five tools", async () => {
    const init = await handleMcp(rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } } }), {}, {});
    expect(init.status).toBe(200);
    expect((await parse(init)).result.serverInfo).toEqual({ name: "tachtien", version: pkg.version });
    const { result } = await send("tools/list");
    expect(result.tools.map((t) => t.name).sort()).toEqual(["define", "examples", "is_tachtien", "mentions", "tachtienify"]);
    for (const t of result.tools) {
      expect(t.annotations?.readOnlyHint, t.name).toBe(true);
      expect(t.outputSchema?.type, t.name).toBe("object");
    }
    const mentions = result.tools.find((t) => t.name === "mentions");
    expect(mentions.inputSchema.properties.source.enum).toEqual(["twitter", "press", "cityguys"]);
  });
  it("defines the word", async () => {
    const result = await call("define");
    expect(result.isError).toBeFalsy();
    expect(data(result)).toMatchObject({ word: "tachtien", pronunciation: { ipa: "tɑxtin" }, definition: "Ontelbaar veel." });
    expect(data(result)).not.toHaveProperty("mentions");
  });
  it("returns all examples, or one at random", async () => {
    expect(data(await call("examples")).examples).toHaveLength(2);
    expect(data(await call("examples", { random: true })).examples).toHaveLength(1);
  });
  it("filters mentions by source", async () => {
    expect(data(await call("mentions")).mentions).toHaveLength(14);
    const press = data(await call("mentions", { source: "press" })).mentions;
    expect(press).toHaveLength(4);
    expect(press.every((m) => m.source === "press")).toBe(true);
  });
  it("tachtienifies text", async () => {
    expect(data(await call("tachtienify", { text: "heel veel bier, ongeveer 30" }))).toEqual({
      text: "tachtien bier, tachtien",
      replacements: 2,
      replaced: [{ text: "heel veel", index: 0 }, { text: "ongeveer 30", index: 16 }],
    });
  });
  it("judges amounts given as number or text", async () => {
    expect(data(await call("is_tachtien", { amount: 18 })).isTachtien).toBe(false);
    expect(data(await call("is_tachtien", { amount: "ontelbaar veel" })).isTachtien).toBe(true);
    expect(data(await call("is_tachtien", { amount: "ongeveer honderd" })).isTachtien).toBe(true);
  });
  it("returns structuredContent equal to the text result for every tool", async () => {
    const calls = [["define"], ["examples", { random: true }], ["mentions"], ["tachtienify", { text: "heel veel" }], ["is_tachtien", { amount: 3 }]];
    for (const [name, args] of calls) {
      const result = await call(name, args);
      expect(result.isError, name).toBeFalsy();
      expect(result.structuredContent, name).toEqual(data(result));
    }
  });
  it("accepts browser requests from any origin", async () => {
    const req = rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    req.headers.set("origin", "https://example.com");
    const res = await handleMcp(req, {}, {});
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
  it("reports invalid input as a tool error", async () => {
    const empty = await call("tachtienify", { text: "" });
    expect(empty.isError).toBe(true);
    expect(empty.content[0].text).toMatch(/^Input validation error/);
    expect((await call("mentions", { source: "facebook" })).isError).toBe(true);
  });
  it("lists and reads the entry resource", async () => {
    const { result: list } = await send("resources/list");
    expect(list.resources).toEqual([expect.objectContaining({ uri: "tachtien://entry", mimeType: "text/markdown" })]);
    const { result } = await send("resources/read", { uri: "tachtien://entry" });
    expect(result.contents[0]).toMatchObject({ uri: "tachtien://entry", mimeType: "text/markdown" });
    expect(result.contents[0].text).toMatch(/^# tach·tien/);
  });
  it("lists the three prompts", async () => {
    const { result } = await send("prompts/list");
    expect(result.prompts.map((p) => p.name).sort()).toEqual(["herschrijf", "uitleg", "zin"]);
    const herschrijf = result.prompts.find((p) => p.name === "herschrijf");
    expect(herschrijf.arguments).toEqual([expect.objectContaining({ name: "tekst", required: true })]);
  });
  it("explains the word with the entry embedded, in Dutch or English", async () => {
    const { result } = await send("prompts/get", { name: "uitleg", arguments: {} });
    expect(result.messages[0].content).toMatchObject({ type: "resource", resource: { uri: "tachtien://entry" } });
    expect(result.messages[1].content.text).toMatch(/^Leg me/);
    const en = (await send("prompts/get", { name: "uitleg", arguments: { taal: "English" } })).result;
    expect(en.messages[1].content.text).toMatch(/^Explain/);
  });
  it("rewrites with the tachtienify result in the prompt", async () => {
    const { result } = await send("prompts/get", { name: "herschrijf", arguments: { tekst: "Ik las ongeveer honderd mails" } });
    expect(result.messages[0].content.text).toContain("Ik las tachtien mails");
    expect(result.messages[0].content.text).toContain('"ongeveer honderd"');
    const none = (await send("prompts/get", { name: "herschrijf", arguments: { tekst: "18 mails" } })).result;
    expect(none.messages[0].content.text).toContain("geen vage");
  });
  it("asks for a sentence in the style of the examples", async () => {
    const { result } = await send("prompts/get", { name: "zin", arguments: { onderwerp: "mails" } });
    expect(result.messages[0].content.text).toContain("Tachtien Bloody Mary's graag!");
    expect(result.messages[0].content.text).toContain("over mails");
  });
  it("completes prompt arguments", async () => {
    const complete = async (name, argument, value) =>
      (await send("completion/complete", { ref: { type: "ref/prompt", name }, argument: { name: argument, value } })).result.completion.values;
    expect(await complete("uitleg", "taal", "e")).toEqual(["English"]);
    expect(await complete("zin", "onderwerp", "K")).toEqual(["kopstootjes", "katers"]);
  });
});
