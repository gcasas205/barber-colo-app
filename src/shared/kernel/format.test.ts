import { describe, expect, it } from "vitest";
import { formatDuration } from "./duration";
import { formatMinute, parseMinute } from "./minutes";
import { formatPesos } from "./money";
import { err, ok } from "./result";

describe("formatPesos (RF-3)", () => {
  it.each([
    [1_800_000, "$ 18.000"],
    [2_000_000, "$ 20.000"],
    [7_000_000, "$ 70.000"],
    [123_456_700, "$ 1.234.567"],
    [100, "$ 1"],
    [0, "$ 0"],
    [1_800_050, "$ 18.000,50"],
    [5, "$ 0,05"],
  ])("%d centavos → %s", (cents, text) => {
    expect(formatPesos(cents)).toBe(text);
  });

  it("rechaza montos que no son centavos enteros", () => {
    expect(() => formatPesos(10.5)).toThrow();
    expect(() => formatPesos(-100)).toThrow();
  });
});

describe("formatDuration (RF-3)", () => {
  it.each([
    [30, "30 min"],
    [15, "15 min"],
    [60, "1 h"],
    [120, "2 h"],
    [90, "1 h 30 min"],
    [135, "2 h 15 min"],
  ])("%d minutos → %s", (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });

  it("rechaza duraciones no positivas o con decimales", () => {
    expect(() => formatDuration(0)).toThrow();
    expect(() => formatDuration(12.5)).toThrow();
  });
});

describe("minutos del día", () => {
  it("formatea y lee HH:MM", () => {
    expect(formatMinute(600)).toBe("10:00");
    expect(formatMinute(9 * 60 + 5)).toBe("09:05");
    expect(formatMinute(1440)).toBe("24:00");
    expect(parseMinute("14:30")).toBe(870);
    expect(parseMinute("24:00")).toBe(1440);
    expect(parseMinute("24:01")).toBeNull();
    expect(parseMinute("9:00")).toBeNull();
    expect(parseMinute("10:60")).toBeNull();
  });
});

describe("Result", () => {
  it("distingue éxito de error", () => {
    const good = ok(3);
    const bad = err("PRICE_NOT_POSITIVE");
    expect(good.ok && good.value).toBe(3);
    expect(!bad.ok && bad.error).toBe("PRICE_NOT_POSITIVE");
  });
});
