import { describe, it, expect } from "vitest";
import { tachtienify, isTachtien } from "../src/playful.js";

describe("tachtienify", () => {
  it("replaces a Dutch vague amount", () => {
    expect(tachtienify("Ik heb heel veel bier gedronken")).toEqual({ text: "Ik heb tachtien bier gedronken", replacements: 1 });
  });
  it("replaces Dutch and English in one text and keeps a capital", () => {
    expect(tachtienify("Honderden mensen en a lot of beers")).toEqual({ text: "Tachtien mensen en tachtien beers", replacements: 2 });
    expect(tachtienify("Thousands of reasons").text).toBe("Tachtien reasons");
  });
  it("counts repeated matches", () => {
    expect(tachtienify("Countless, countless nights")).toEqual({ text: "Tachtien, tachtien nights", replacements: 2 });
  });
  it("allows any whitespace inside a phrase", () => {
    expect(tachtienify("een\n  heleboel kopstootjes").text).toBe("tachtien kopstootjes");
  });
  it("matches whole words only", () => {
    expect(tachtienify("tigmaal en notig")).toEqual({ text: "tigmaal en notig", replacements: 0 });
    expect(tachtienify("tig keer").text).toBe("tachtien keer");
  });
  it("leaves exact numbers alone", () => {
    expect(tachtienify("80 biertjes en 18 shotjes")).toEqual({ text: "80 biertjes en 18 shotjes", replacements: 0 });
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
  it("rejects anything else", () => {
    expect(isTachtien("een paar")).toEqual({ isTachtien: false, reason: expect.any(String) });
    expect(isTachtien(NaN).isTachtien).toBe(false);
  });
});
