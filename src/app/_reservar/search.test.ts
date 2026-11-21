import { describe, expect, it } from "vitest";
import { bookingHref, parseBookingSearch } from "./search";

describe("parseBookingSearch (S-6)", () => {
  it("lee servicio, día y semana válidos", () => {
    expect(parseBookingSearch({ servicio: "corte", dia: "2026-11-26", semana: "2026-11-23" })).toEqual({
      servicio: "corte",
      dia: "2026-11-26",
      semana: "2026-11-23",
    });
  });

  it("ignora valores inválidos en lugar de fallar", () => {
    expect(
      parseBookingSearch({ servicio: "<script>", dia: "2026-02-30", semana: "mañana", otro: "x" }),
    ).toEqual({});
    expect(parseBookingSearch({ servicio: "a".repeat(200) })).toEqual({});
  });

  it("si un parámetro viene repetido, toma el primero", () => {
    expect(parseBookingSearch({ servicio: ["completo", "corte"] })).toEqual({ servicio: "completo" });
  });
});

describe("bookingHref", () => {
  it("arma la dirección solo con lo que hay", () => {
    expect(bookingHref({})).toBe("/");
    expect(bookingHref({ servicio: "corte" })).toBe("/?servicio=corte");
    expect(bookingHref({ servicio: "corte", dia: "2026-11-26" as never })).toBe("/?servicio=corte&dia=2026-11-26");
  });
});
