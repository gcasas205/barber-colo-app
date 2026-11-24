import { describe, expect, it } from "vitest";
import { validateDependent, withDemoMark } from "./dependent";

describe("validateDependent (spec 004b)", () => {
  it("acepta nombre y cumpleaños opcional", () => {
    expect(validateDependent({ name: "  Tomi ", birthday: null })).toEqual({ ok: true, value: { name: "Tomi", birthday: null } });
    expect(validateDependent({ name: "Tomi", birthday: { day: 29, month: 2 } })).toMatchObject({ ok: true });
  });
  it("marca los errores por campo", () => {
    expect(validateDependent({ name: "T", birthday: { day: 31, month: 4 } })).toEqual({
      ok: false,
      error: { name: "NAME_LENGTH", birthday: "BIRTHDAY_INVALID" },
    });
  });
  it("caso 5: la marca (demo) no se duplica ni cuenta para el largo", () => {
    expect(validateDependent({ name: "Tomás (demo)", birthday: null })).toMatchObject({ ok: true, value: { name: "Tomás" } });
    expect(withDemoMark("Tomás", true)).toBe("Tomás (demo)");
    expect(withDemoMark("Tomás", false)).toBe("Tomás");
  });
});

describe("errores por separado (ub-mode)", () => {
  it("un nombre inválido frena aunque el cumpleaños esté bien, y al revés", () => {
    expect(validateDependent({ name: "A", birthday: { day: 3, month: 5 } })).toEqual({ ok: false, error: { name: "NAME_LENGTH" } });
    expect(validateDependent({ name: "Tomi", birthday: { day: 31, month: 4 } })).toEqual({ ok: false, error: { birthday: "BIRTHDAY_INVALID" } });
  });
});
