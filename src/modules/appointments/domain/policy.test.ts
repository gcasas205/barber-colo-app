import { describe, expect, it } from "vitest";
import { changeTiming, customerCanReschedule, initialStatus, isUpcoming, validateBarberReason } from "./policy";

const at = (hhmm: string, day = "2026-11-25") => new Date(`${day}T${hhmm}:00-03:00`);
const appt = (start: string, bookedAt: string, extra: Partial<{ end: string; reschedules: number }> = {}) => ({
  start: at(start),
  end: at(extra.end ?? start.replace(/^(\d\d)/, (h) => String(Number(h) + 1).padStart(2, "0"))),
  bookedAt: at(bookedAt),
  customerReschedules: extra.reschedules ?? 0,
});

describe("initialStatus (RF-8, RN-31, caso 8)", () => {
  it("con menos de 1 h nace Confirmado; con 1 h o más, Reservado", () => {
    expect(initialStatus(at("16:00"), at("15:20"))).toBe("confirmed");
    expect(initialStatus(at("16:00"), at("15:00"))).toBe("reserved");
    expect(initialStatus(at("16:00"), at("13:00"))).toBe("reserved");
  });
});

describe("changeTiming (RF-14, RF-15, RF-17, RF-19)", () => {
  it("caso 5: exactamente 4 h antes no es tarde", () => {
    expect(changeTiming(appt("16:00", "09:00"), at("12:00"))).toBe("on_time");
    expect(changeTiming(appt("16:00", "09:00"), at("12:01"))).toBe("late");
  });

  it("caso 4: dentro de los 10 min siguientes a reservar no es tarde, aunque falten menos de 4 h", () => {
    expect(changeTiming(appt("11:00", "08:00"), at("08:09"))).toBe("on_time");
    expect(changeTiming(appt("11:00", "08:00"), at("08:10"))).toBe("on_time");
    expect(changeTiming(appt("11:00", "08:00"), at("08:11"))).toBe("late");
  });

  it("caso 3: reservado a las 15:20 para las 16:00, cancelar a las 15:25 está en el margen", () => {
    expect(changeTiming(appt("16:00", "15:20"), at("15:25"))).toBe("on_time");
  });

  it("RF-19: desde el inicio ya no se puede", () => {
    expect(changeTiming(appt("16:00", "09:00"), at("16:00"))).toBe("started");
  });
});

describe("isUpcoming (clarificación 2)", () => {
  it("cuenta mientras no terminó", () => {
    const a = appt("16:00", "09:00", { end: "16:30" });
    expect(isUpcoming(a, at("16:29"))).toBe(true);
    expect(isUpcoming(a, at("16:30"))).toBe(false);
  });
});

describe("customerCanReschedule (RF-18, RF-19, caso 7)", () => {
  it("hasta 2 veces y antes de empezar", () => {
    expect(customerCanReschedule(appt("16:00", "09:00", { reschedules: 1 }), at("10:00"))).toEqual({ ok: true, value: undefined });
    expect(customerCanReschedule(appt("16:00", "09:00", { reschedules: 2 }), at("10:00"))).toEqual({ ok: false, error: "RESCHEDULE_LIMIT" });
    expect(customerCanReschedule(appt("16:00", "09:00"), at("16:00"))).toEqual({ ok: false, error: "STARTED" });
  });
});

describe("validateBarberReason (RF-24, RF-25)", () => {
  it("obligatorio, de 3 a 200 caracteres, sin espacios de más", () => {
    expect(validateBarberReason("  Me enfermé  ")).toEqual({ ok: true, value: "Me enfermé" });
    expect(validateBarberReason("ok")).toEqual({ ok: false, error: "REASON_LENGTH" });
    expect(validateBarberReason("x".repeat(201))).toEqual({ ok: false, error: "REASON_LENGTH" });
  });
});
