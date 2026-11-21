import { describe, expect, it } from "vitest";
import { validateBirthday, validateName } from "./profile";

describe("validateName (RF-10b)", () => {
  it("normaliza espacios y acepta tildes y emojis", () => {
    expect(validateName("  María   José ")).toEqual({ ok: true, value: "María José" });
    expect(validateName("Facu 💈")).toEqual({ ok: true, value: "Facu 💈" });
    expect(validateName("Lu")).toEqual({ ok: true, value: "Lu" });
  });

  it.each(["", "   ", "A", "x".repeat(41), "Juan\nPérez", "Juan\u0000"])("rechaza %j", (raw) => {
    expect(validateName(raw)).toEqual({ ok: false, error: "NAME_LENGTH" });
  });

  it("acepta 40 caracteres justos", () => {
    expect(validateName("x".repeat(40)).ok).toBe(true);
  });
});

describe("validateBirthday", () => {
  it("acepta día y mes válidos, incluido el 29 de febrero", () => {
    expect(validateBirthday({ day: 29, month: 2 })).toEqual({ ok: true, value: { day: 29, month: 2 } });
    expect(validateBirthday({ day: 31, month: 12 }).ok).toBe(true);
  });

  it.each([
    { day: 31, month: 4 },
    { day: 30, month: 2 },
    { day: 0, month: 5 },
    { day: 10, month: 13 },
    { day: 1.5, month: 3 },
  ])("rechaza %j", (b) => {
    expect(validateBirthday(b)).toEqual({ ok: false, error: "BIRTHDAY_INVALID" });
  });
});
