import { describe, it, expect } from "vitest";
import { entry, entryMarkdown, MENTION_SOURCES } from "../src/entry.js";

describe("entry", () => {
  it("holds the definition from tachtien.nl", () => {
    expect(entry).toMatchObject({
      word: "tachtien",
      syllables: "tach·tien",
      partOfSpeech: "hoofdtelwoord",
      pronunciation: { ipa: "tɑxtin" },
      definition: "Ontelbaar veel.",
      url: "https://tachtien.nl/",
    });
    expect(entry.origin.year).toBe(2014);
    expect(entry.origin.text).toContain("Julia van den Bergh");
  });
  it("has two example dialogues", () => {
    expect(entry.examples).toHaveLength(2);
    expect(entry.examples[0].lines[0]).toBe("Kater?");
    expect(entry.examples[1].lines).toEqual(["Tachtien Bloody Mary's graag!"]);
  });
  it("has 14 mentions with a known source and an http(s) or null url", () => {
    expect(entry.mentions).toHaveLength(14);
    const count = (s) => entry.mentions.filter((m) => m.source === s).length;
    expect([count("twitter"), count("press"), count("cityguys")]).toEqual([4, 4, 6]);
    for (const m of entry.mentions) {
      expect(MENTION_SOURCES).toContain(m.source);
      expect(m.title).toBeTruthy();
      if (m.url !== null) expect(m.url).toMatch(/^https?:\/\//);
    }
    expect(entry.mentions.filter((m) => m.url === null)).toHaveLength(1);
  });
  it("is frozen", () => {
    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry.mentions[0])).toBe(true);
  });
});

describe("entryMarkdown", () => {
  it("renders every part of the entry", () => {
    const md = entryMarkdown();
    expect(md.startsWith("# tach·tien (hoofdtelwoord)\n")).toBe(true);
    expect(md).toContain("tɑxtin");
    expect(md).toContain("Ontelbaar veel.");
    for (const ex of entry.examples) for (const line of ex.lines) expect(md).toContain(line);
    for (const m of entry.mentions) expect(md).toContain(m.title);
    expect(md).toContain("[Metro nieuws](https://www.metronieuws.nl/");
  });
});
