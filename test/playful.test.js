import { describe, it, expect } from "vitest";
import { tachtienify, isTachtien, APPROX_MIN } from "../src/playful.js";

describe("tachtienify", () => {
  it("replaces a Dutch vague amount", () => {
    expect(tachtienify("Ik heb heel veel bier gedronken")).toEqual({
      text: "Ik heb tachtien bier gedronken",
      replacements: 1,
      replaced: [{ text: "heel veel", index: 7 }],
    });
  });
  it("replaces Dutch and English in one text and keeps a capital", () => {
    expect(tachtienify("Honderden mensen en a lot of beers")).toMatchObject({ text: "Tachtien mensen en tachtien beers", replacements: 2 });
    expect(tachtienify("Thousands of reasons").text).toBe("Tachtien reasons");
    expect(tachtienify("About one hundred people came")).toMatchObject({ text: "Tachtien people came", replaced: [{ text: "About one hundred", index: 0 }] });
  });
  it("counts repeated matches", () => {
    expect(tachtienify("Countless, countless nights")).toMatchObject({ text: "Tachtien, tachtien nights", replacements: 2 });
  });
  it("allows any whitespace inside a phrase", () => {
    expect(tachtienify("een\n  heleboel kopstootjes").text).toBe("tachtien kopstootjes");
  });
  it("matches whole words only", () => {
    expect(tachtienify("tigmaal en notig")).toEqual({ text: "tigmaal en notig", replacements: 0, replaced: [] });
    expect(tachtienify("tig keer").text).toBe("tachtien keer");
  });
  it("keeps all caps and does not capitalise mid-sentence", () => {
    expect(tachtienify("Ik drink HEEL VEEL bier").text).toBe("Ik drink TACHTIEN bier");
    expect(tachtienify("A lot of beers").text).toBe("Tachtien beers");
  });
  it("leaves exact numbers alone", () => {
    expect(tachtienify("80 biertjes en 18 shotjes")).toMatchObject({ text: "80 biertjes en 18 shotjes", replacements: 0 });
  });
  it("knows the newer vague amounts", () => {
    expect(tachtienify("Een boel mails, massa's mensen en a bunch of tweets").text).toBe("Tachtien mails, tachtien mensen en tachtien tweets");
    expect(tachtienify("hundreds of thousands of fans").text).toBe("tachtien fans");
  });
  it("replaces large estimates, marker included, and reports where", () => {
    expect(tachtienify("We waren met ongeveer honderd man en ~200 gasten")).toEqual({
      text: "We waren met tachtien man en tachtien gasten",
      replacements: 2,
      replaced: [{ text: "ongeveer honderd", index: 13 }, { text: "~200", index: 37 }],
    });
    expect(tachtienify("About two hundred people, 100+ tweets").text).toBe("Tachtien people, tachtien tweets");
    expect(tachtienify("ONGEVEER HONDERD").text).toBe("TACHTIEN");
  });
  it("leaves small estimates, years and times alone", () => {
    for (const t of ["zo'n vijf koekjes", "rond 2014", "rond 20:00", "ongeveer 3,5 liter", "Bijna 100% bleef"]) {
      expect(tachtienify(t).text, t).toBe(t);
    }
  });
});

describe("isTachtien", () => {
  it("calls 18 achttien and 80 tachtig, as number, digits or word", () => {
    for (const a of [18, "18", "achttien"]) {
      expect(isTachtien(a).isTachtien).toBe(false);
      expect(isTachtien(a).reason).toContain("achttien");
    }
    for (const a of [80, " 80 ", "Tachtig"]) {
      expect(isTachtien(a).isTachtien).toBe(false);
      expect(isTachtien(a).reason).toContain("tachtig");
    }
  });
  it("says any other exact number was counted", () => {
    expect(isTachtien(3)).toEqual({ isTachtien: false, reason: expect.stringContaining("geteld") });
    expect(isTachtien("1,5").reason).toContain("1,5");
    expect(isTachtien(-2).isTachtien).toBe(false);
  });
  it("accepts infinity and vague amounts", () => {
    for (const a of [Infinity, "Infinity", "∞", "heel veel", "Heel veel biertjes!", "Tachtien", "geen idee", "te veel om te tellen", "a lot"]) {
      expect(isTachtien(a), String(a)).toMatchObject({ isTachtien: true });
    }
  });
  it("finds a number inside a phrase, in digits or words", () => {
    expect(isTachtien("18 biertjes").reason).toContain("achttien");
    expect(isTachtien("tachtig man").reason).toContain("tachtig");
    for (const a of ["honderd", "een miljoen", "two thousand", "tweehonderdvijftig", "eenentwintig", "tweeëntwintig", "one hundred"]) {
      expect(isTachtien(a), a).toEqual({ isTachtien: false, reason: expect.stringContaining("geteld") });
    }
  });
  it("reads thousands separators and compound number words", () => {
    expect(isTachtien("1.000").reason).toContain("1.000");
    expect(isTachtien("achtentachtig").reason).toContain("geteld");
    expect(isTachtien("tenten")).toEqual({ isTachtien: false, reason: expect.stringContaining("tellen") });
  });
  it(`accepts estimates of ${APPROX_MIN} or more`, () => {
    for (const a of ["ongeveer honderd", "Zo'n 60 man", "rond de vijftig", "~100", "100+", "50ish", "honderd of zo",
      "ongeveer 1.000 mensen", "about two hundred", "ruim vijfenvijftig", "ongeveer 80", "meer dan 50", "bijna honderd",
      "ongeveer een miljoen", "about a hundred", "about one hundred", "roughly one million", "about one thousand people", "ongeveer 2000 mensen", "meer dan 2000 bezoekers", "rond 1500 man", "around 2000 people"]) {
      expect(isTachtien(a), a).toEqual({ isTachtien: true, reason: expect.stringContaining("geschat") });
    }
  });
  it("rejects small estimates, negated estimates and years", () => {
    for (const a of ["zo'n 18 man", "ongeveer 3,5 liter", "zo'n 30 man", "meer dan 49", "rond de twintig"]) {
      expect(isTachtien(a), a).toEqual({ isTachtien: false, reason: expect.stringContaining("niet veel") });
    }
    expect(isTachtien("niet ongeveer honderd").reason).toContain("zelf");
    for (const a of ["rond 2014", "Around 2010", "circa 1900"]) expect(isTachtien(a).reason, a).toContain("jaartal");
  });
  it("respects negation before a vague amount", () => {
    for (const a of ["niet heel veel", "not a lot", "nee, zeker geen tachtien", "nooit talloze"]) {
      expect(isTachtien(a), a).toEqual({ isTachtien: false, reason: expect.stringContaining("zelf") });
    }
    // The negation is part of these phrases, not in front of them.
    expect(isTachtien("geen idee").isTachtien).toBe(true);
    expect(isTachtien("weet ik niet").isTachtien).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isTachtien("een paar")).toEqual({ isTachtien: false, reason: expect.any(String) });
    expect(isTachtien(NaN).isTachtien).toBe(false);
  });
});
