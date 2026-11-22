import { describe, expect, it } from "vitest";
import { localDate, weekDays } from "@/shared/kernel";
import { weekNotices } from "./notices";

const at = (iso: string) => new Date(iso).getTime();
const week = weekDays(localDate("2026-11-23")); // lunes 23 a domingo 29

describe("weekNotices (RF-14)", () => {
  it("un bloqueo de varios días con aviso aparece como 'cerrado' en cada día de la semana que cubre", () => {
    const out = weekNotices(week, [{ start: at("2026-11-27T03:00:00Z"), end: at("2026-12-05T03:00:00Z"), text: "Vacaciones" }]);
    expect(out).toEqual([
      { date: "2026-11-27", kind: "closed", text: "Vacaciones" },
      { date: "2026-11-28", kind: "closed", text: "Vacaciones" },
      { date: "2026-11-29", kind: "closed", text: "Vacaciones" },
    ]);
  });

  it("un bloqueo de horas aparece con su horario", () => {
    const out = weekNotices(week, [{ start: at("2026-11-25T13:00:00Z"), end: at("2026-11-25T15:00:00Z"), text: "Trámite" }]);
    expect(out).toEqual([{ date: "2026-11-25", kind: "hours", from: 600, to: 720, text: "Trámite" }]);
  });

  it("un bloqueo que termina a las 24:00 de un día pero empezó a la tarde muestra hasta las 24:00", () => {
    const out = weekNotices(week, [{ start: at("2026-11-24T21:00:00Z"), end: at("2026-11-25T03:00:00Z"), text: "Médico" }]);
    expect(out).toEqual([{ date: "2026-11-24", kind: "hours", from: 1080, to: 1440, text: "Médico" }]);
  });

  it("fuera de la semana no aparece nada y se ordena por día y hora", () => {
    const out = weekNotices(week, [
      { start: at("2026-11-26T17:00:00Z"), end: at("2026-11-26T18:00:00Z"), text: "B" },
      { start: at("2026-11-26T13:00:00Z"), end: at("2026-11-26T14:00:00Z"), text: "A" },
      { start: at("2026-12-10T13:00:00Z"), end: at("2026-12-10T14:00:00Z"), text: "Lejos" },
    ]);
    expect(out.map((n) => n.text)).toEqual(["A", "B"]);
  });
});
