import { describe, expect, it } from "vitest";
import { TO_COLO, whatsappHref } from "./whatsapp";

describe("whatsappHref", () => {
  it("sin texto abre el chat vacío; con texto, lo completa", () => {
    expect(whatsappHref("+5491138163491")).toBe("https://wa.me/5491138163491");
    expect(whatsappHref("+5491138163491", TO_COLO)).toBe("https://wa.me/5491138163491?text=Hola%20Colo%2C%20quer%C3%ADa%20pedir%20un%20turno.");
  });
});
