import { describe, expect, it } from "vitest";
import { errorText } from "./messages";

describe("errorText", () => {
  it("traduce los códigos de los casos de uso a textos de la spec", () => {
    expect(errorText("CREDENTIALS")).toBe("No pudimos ingresar. Revisá el correo y la contraseña.");
    expect(errorText("PHONE_TAKEN")).toMatch(/Si es tuyo, escribile a Colo/);
    expect(errorText("PHONE_FOREIGN")).toMatch(/no es de Argentina/);
  });
  it("un código desconocido nunca se muestra tal cual", () => {
    expect(errorText("SQL_ERROR_23505")).toBe("No pudimos completar el pedido. Probá de nuevo.");
    expect(errorText(undefined)).toBeUndefined();
  });
});
