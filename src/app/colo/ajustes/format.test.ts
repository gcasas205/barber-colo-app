import { describe, expect, it } from "vitest";
import { describeBlock, noticeLabel, timeOptions } from "./format";

describe("formato de Ajustes", () => {
  it("las opciones de hora llegan hasta las 24:00", () => {
    const opts = timeOptions(30);
    expect(opts).toHaveLength(49);
    expect(opts.at(-1)).toEqual({ value: 1440, label: "24:00" });
  });

  it("describe bloqueos de un día, de varios días y de horas", () => {
    expect(describeBlock(new Date("2026-11-25T03:00:00Z"), new Date("2026-11-26T03:00:00Z"))).toBe("Miércoles 25 de noviembre, todo el día");
    expect(describeBlock(new Date("2026-12-24T03:00:00Z"), new Date("2026-12-26T03:00:00Z"))).toBe(
      "Del jueves 24 de diciembre al viernes 25 de diciembre",
    );
    expect(describeBlock(new Date("2026-11-25T13:00:00Z"), new Date("2026-11-25T14:00:00Z"))).toBe("Miércoles 25 de noviembre, de 10:00 a 11:00");
    expect(describeBlock(new Date("2026-11-25T21:00:00Z"), new Date("2026-11-26T03:00:00Z"))).toBe("Miércoles 25 de noviembre, de 18:00 a 24:00");
  });

  it("anticipación en palabras", () => {
    expect(noticeLabel(0)).toBe("Sin anticipación");
    expect(noticeLabel(30)).toBe("30 min");
    expect(noticeLabel(90)).toBe("1 h 30 min");
    expect(noticeLabel(1440)).toBe("24 h");
  });
});
