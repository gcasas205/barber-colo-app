import { describe, expect, it } from "vitest";
import { formatArPhone, normalizeArPhone } from "./phone";

const BA = "+5491138163491";

describe("normalizeArPhone (RF-10, caso límite 3)", () => {
  it.each([
    ["11 3816-3491", BA],
    ["1138163491", BA],
    ["(11) 3816-3491", BA],
    ["011 3816-3491", BA],
    ["011 15 3816-3491", BA],
    ["11 15 3816-3491", BA],
    ["+54 9 11 3816-3491", BA],
    ["+54 11 3816-3491", BA],
    ["+5491138163491", BA],
    ["54 9 11 3816 3491", BA],
    ["+54 9 11 15 3816-3491", BA],
    ["  11.3816.3491  ", BA],
    ["351 15 512-3456", "+5493515123456"],
    ["0351 512-3456", "+5493515123456"],
    ["221 15 456-7890", "+5492214567890"],
    ["2966 15 12-3456", "+5492966123456"],
    ["+54 9 2966 12-3456", "+5492966123456"],
  ])("%j → %s", (raw, e164) => {
    expect(normalizeArPhone(raw)).toEqual({ ok: true, value: e164 });
  });

  it.each([
    ["4555-1234", "sin código de área"],
    ["15 3816-3491", "sin código de área (15 no es un área)"],
    ["11 3816-349", "faltan dígitos"],
    ["11 3816-34911", "sobran dígitos"],
    ["", "vacío"],
    ["once treinta y ocho", "letras"],
    ["0800 333 1234", "no es geográfico"],
  ])("rechaza %j (%s)", (raw) => {
    expect(normalizeArPhone(raw)).toEqual({ ok: false, error: "PHONE_INVALID" });
  });

  it.each(["+598 99 123 456", "+1 415 555 0100", "0034 612 345 678"])("marca %j como del exterior", (raw) => {
    expect(normalizeArPhone(raw)).toEqual({ ok: false, error: "PHONE_FOREIGN" });
  });
});

describe("formatArPhone", () => {
  it("muestra el número como lo anota una persona", () => {
    expect(formatArPhone(BA)).toBe("11 3816-3491");
    expect(formatArPhone("+5493515123456")).toBe("351 512-3456");
    expect(formatArPhone("+5492966123456")).toBe("2966 12-3456");
  });
});

describe("bordes del celular (ub-mode)", () => {
  it("con letras no es un número, aunque los dígitos alcancen", () => {
    expect(normalizeArPhone("11 3816-3491 casa")).toEqual({ ok: false, error: "PHONE_INVALID" });
  });

  it("54 sin el 9 y sin el +, con 12 dígitos, también es Argentina", () => {
    expect(normalizeArPhone("54 11 3816-3491")).toEqual({ ok: true, value: "+5491138163491" });
  });
});

it("el 15 de un número de Buenos Aires va justo después del 11: en otro lugar no se saca", () => {
  expect(normalizeArPhone("114151586834")).toEqual({ ok: false, error: "PHONE_INVALID" });
});
