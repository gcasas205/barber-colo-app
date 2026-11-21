import { describe, expect, it } from "vitest";
import { claimPhone } from "./phone-claim";

describe("claimPhone: qué pasa con un teléfono según a quién pertenece", () => {
  describe("un cliente con cuenta carga o cambia su teléfono", () => {
    it("libre → se lo queda", () => expect(claimPhone("account", null)).toBe("free"));
    it("ya es suyo → nada que hacer", () =>
      expect(claimPhone("account", { kind: "holder", isSelf: true })).toBe("own"));
    it("de otra cuenta → rechazado (RF-11)", () =>
      expect(claimPhone("account", { kind: "holder", isSelf: false })).toBe("taken_by_account"));
    it("de un invitado → se unen (RF-12)", () =>
      expect(claimPhone("account", { kind: "guest", isSelf: false })).toBe("guest_to_merge"));
  });

  describe("alguien entra como invitado", () => {
    it("libre → invitado nuevo", () => expect(claimPhone("guest", null)).toBe("free"));
    it("de una cuenta → rechazado, protege al titular (RF-16)", () =>
      expect(claimPhone("guest", { kind: "holder", isSelf: false })).toBe("taken_by_account"));
    it("de un invitado → es el mismo cliente (RF-17)", () =>
      expect(claimPhone("guest", { kind: "guest", isSelf: false })).toBe("same_guest"));
  });
});
