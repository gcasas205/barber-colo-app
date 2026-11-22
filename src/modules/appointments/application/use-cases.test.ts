import { describe, expect, it } from "vitest";
import type { Actor } from "@/modules/identity";
import type { Interval, WeeklyRange } from "@/modules/schedule";
import { localDate } from "@/shared/kernel";
import type { AgendaItem, Appointment, AppointmentEvent, AppointmentsDeps, ServiceInfo } from "./ports";
import {
  barberFreeStarts,
  book,
  cancelByBarber,
  cancelByCustomer,
  dismissBarberNotice,
  getDayAgenda,
  getMyAppointment,
  rescheduleByBarber,
  rescheduleByCustomer,
} from "./use-cases";

const at = (hhmm: string, day = "2026-11-25") => new Date(`${day}T${hhmm}:00-03:00`);
const ranges: WeeklyRange[] = [1, 2, 3, 4, 5, 6].flatMap((d) => [
  { weekday: d as WeeklyRange["weekday"], opensAt: 600, closesAt: 780 },
  { weekday: d as WeeklyRange["weekday"], opensAt: 840, closesAt: 1200 },
]);
const services: ServiceInfo[] = [
  { id: "1", name: "Corte", durationMinutes: 30, priceCents: 1_800_000, active: true },
  { id: "3", name: "Claritos", durationMinutes: 120, priceCents: 7_000_000, active: true },
  { id: "9", name: "Viejo", durationMinutes: 30, priceCents: 100, active: false },
];

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** Turnos en memoria, con la misma garantía que la restricción de exclusión de la base. */
function memory() {
  const state = {
    appts: [] as Appointment[],
    events: [] as (AppointmentEvent & { id: string; seen?: Date })[],
    blocks: [] as Interval[],
    seen: new Map<string, Map<string, Date>>(),
    customers: new Map([
      ["c1", { name: "Lucas", nickname: "el de la moto", phone: "+5491138163491", isGuest: false }],
      ["c2", { name: "Ana", nickname: null, phone: "+5491100000000", isGuest: true }],
    ]),
    config: { stepMinutes: 15, minNoticeMinutes: 30, maxAdvanceDays: 30 },
  };
  const active = (a: Appointment) => a.status === "reserved" || a.status === "confirmed";
  const deps: AppointmentsDeps = {
    transaction: (fn) =>
      fn({
        lockScheduleShared: async () => {},
        lockCustomer: async (id) => state.customers.has(id),
        slotContext: async (range, exclude) => ({
          ranges,
          config: state.config,
          occupations: [...state.blocks, ...state.appts.filter((a) => active(a) && a.id !== exclude)].filter((o) => overlaps(o, range)),
        }),
        service: async (id) => services.find((s) => s.id === id) ?? null,
        upcomingFor: async (c, now) => state.appts.find((a) => a.customerId === c && active(a) && a.end > now) ?? null,
        get: async (id) => {
          const a = state.appts.find((x) => x.id === id);
          return a ? { ...a } : null;
        },
        insert: async (a) => {
          if (state.appts.some((x) => active(x) && overlaps(x, a.period))) return "OVERLAP";
          const id = `a${state.appts.length + 1}`;
          const s = services.find((x) => x.id === a.serviceId)!;
          state.appts.push({ id, customerId: a.customerId, serviceId: a.serviceId, serviceName: s.name, ...a.period, status: a.status, priceCents: a.priceCents, customerReschedules: 0, bookedAt: a.bookedAt });
          return id;
        },
        move: async (id, period, status, n) => {
          if (state.appts.some((x) => x.id !== id && active(x) && overlaps(x, period))) return "OVERLAP";
          Object.assign(state.appts.find((x) => x.id === id)!, { ...period, status, customerReschedules: n });
          return "ok";
        },
        setStatus: async (id, status) => void (state.appts.find((x) => x.id === id)!.status = status),
        addEvent: async (e) => void state.events.push({ ...e, id: String(state.events.length + 1) }),
        unseenBarberNotice: async (c) => {
          const e = [...state.events].reverse().find((x) => x.actor === "barber" && !x.seen && state.appts.find((a) => a.id === x.appointmentId)?.customerId === c);
          if (!e || e.kind === "booked") return null;
          return { eventId: e.id, kind: e.kind, serviceName: state.appts.find((a) => a.id === e.appointmentId)!.serviceName, fromStart: e.from!.start, toStart: e.to?.start ?? null, reason: e.reason! };
        },
        markNoticeSeen: async (id, _c, when) => void (state.events.find((e) => e.id === id)!.seen = when),
        agenda: async (range) =>
          state.appts
            .filter((a) => overlaps(a, range))
            .map((a): AgendaItem => {
              const last = [...state.events].reverse().find((e) => e.appointmentId === a.id && e.actor === "customer" && e.kind !== "cancelled");
              return { ...a, customer: state.customers.get(a.customerId)!, lastCustomerChangeAt: last?.at ?? null };
            }),
        agendaSeen: async (u) => new Map(state.seen.get(u) ?? []) as never,
        setAgendaSeen: async (u, day, when) => void state.seen.set(u, new Map(state.seen.get(u) ?? []).set(day, when)),
      }),
  };
  return { state, deps };
}

const lucas: Actor = { kind: "customer", userId: "u1", customerId: "c1", profileComplete: true, demo: true };
const ana: Actor = { kind: "guest", userId: "g1", customerId: "c2" };
const colo: Actor = { kind: "barber", userId: "colo", demo: true };
const morning = at("08:00");

async function booked(m = memory(), actor = lucas, start = at("16:00"), serviceId = "1", now = morning) {
  const r = await book(m.deps, actor, { serviceId, start }, now);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return { ...m, appt: r.value };
}

describe("reservar (RF-7 a RF-12)", () => {
  it("crea el turno con el precio congelado y el estado inicial; queda en el historial", async () => {
    const { state, appt } = await booked();
    expect(appt).toMatchObject({ serviceName: "Corte", status: "reserved", priceCents: 1_800_000, end: at("16:30") });
    expect(state.events).toEqual([expect.objectContaining({ kind: "booked", actor: "customer", actorUserId: "u1" })]);
  });

  it("caso 3: con menos de 1 h nace Confirmado", async () => {
    const { appt } = await booked(memory(), lucas, at("16:00"), "1", at("15:20"));
    expect(appt.status).toBe("confirmed");
  });

  it("RF-7: sin nombre o celular hay que cargarlos antes; Colo no reserva para sí", async () => {
    const { deps } = memory();
    const incompleto: Actor = { ...lucas, profileComplete: false };
    const invitado: Actor = { kind: "guest", userId: "g9", customerId: null };
    for (const actor of [incompleto, invitado]) expect(await book(deps, actor, { serviceId: "1", start: at("16:00") }, morning)).toEqual({ ok: false, error: "NEEDS_CONTACT" });
    expect(await book(deps, colo, { serviceId: "1", start: at("16:00") }, morning)).toEqual({ ok: false, error: "NOT_ALLOWED" });
  });

  it("caso 1 y RF-9: el segundo que pide el mismo horario ve que se ocupó", async () => {
    const m = await booked();
    expect(await book(m.deps, ana, { serviceId: "1", start: at("16:15") }, morning)).toEqual({ ok: false, error: "SLOT_TAKEN" });
  });

  it("caso 2: Claritos no entra a las 15:00 si hay un Corte a las 16:00", async () => {
    const m = await booked();
    expect(await book(m.deps, ana, { serviceId: "3", start: at("15:00") }, morning)).toEqual({ ok: false, error: "SLOT_TAKEN" });
    expect((await book(m.deps, ana, { serviceId: "3", start: at("16:30") }, morning)).ok).toBe(true);
  });

  it("RF-9: fuera de las franjas, en un bloqueo, sin la anticipación o fuera del paso no se reserva", async () => {
    const m = memory();
    m.state.blocks.push({ start: at("10:00"), end: at("11:00") });
    for (const start of [at("13:00"), at("10:30"), at("08:15"), at("16:10")]) {
      expect(await book(m.deps, lucas, { serviceId: "1", start }, morning)).toEqual({ ok: false, error: "SLOT_TAKEN" });
    }
    expect(await book(m.deps, lucas, { serviceId: "1", start: at("08:45", "2026-11-26") }, morning)).toEqual({ ok: false, error: "SLOT_TAKEN" });
  });

  it("un servicio que no se ofrece no se reserva", async () => {
    expect(await book(memory().deps, lucas, { serviceId: "9", start: at("16:00") }, morning)).toEqual({ ok: false, error: "SERVICE_UNAVAILABLE" });
  });

  it("caso 13 y RF-10: con un turno futuro activo no se reserva otro y se muestra el que tiene", async () => {
    const m = await booked();
    const r = await book(m.deps, lucas, { serviceId: "1", start: at("17:00") }, morning);
    expect(r).toEqual({ ok: false, error: { hasUpcoming: expect.objectContaining({ id: m.appt.id }) } });
    // Cuando terminó, ya no frena (clarificación 2).
    expect((await book(m.deps, lucas, { serviceId: "1", start: at("17:00") }, at("16:30"))).ok).toBe(true);
  });
});

describe("cancelar (RF-14, RF-15, RF-19)", () => {
  it("a tiempo: se cancela y libera el horario", async () => {
    const m = await booked();
    expect(await cancelByCustomer(m.deps, lucas, m.appt.id, false, at("11:00"))).toEqual({ ok: true, value: { late: false } });
    expect(m.state.appts[0]!.status).toBe("cancelled");
    expect((await book(m.deps, ana, { serviceId: "1", start: at("16:00") }, at("11:00"))).ok).toBe(true);
  });

  it("tarde: primero pide confirmar; con la confirmación queda como cancelación tarde", async () => {
    const m = await booked();
    expect(await cancelByCustomer(m.deps, lucas, m.appt.id, false, at("13:00"))).toEqual({ ok: false, error: "CONFIRM_LATE" });
    expect(m.state.appts[0]!.status).toBe("reserved");
    expect(await cancelByCustomer(m.deps, lucas, m.appt.id, true, at("13:00"))).toEqual({ ok: true, value: { late: true } });
    expect(m.state.appts[0]!.status).toBe("cancelled_late");
    expect(m.state.events.at(-1)).toMatchObject({ kind: "cancelled", late: true });
  });

  it("caso 4: dentro de los 10 min siguientes a reservar no es tarde", async () => {
    const m = await booked(memory(), lucas, at("11:00"), "1", at("08:00"));
    expect(await cancelByCustomer(m.deps, lucas, m.appt.id, false, at("08:09"))).toEqual({ ok: true, value: { late: false } });
  });

  it("no se cancela un turno ajeno ni uno que ya empezó", async () => {
    const m = await booked();
    expect(await cancelByCustomer(m.deps, ana, m.appt.id, true, at("11:00"))).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await cancelByCustomer(m.deps, lucas, m.appt.id, true, at("16:05"))).toEqual({ ok: false, error: "STARTED" });
  });
});

describe("reprogramar (RF-16 a RF-18)", () => {
  it("caso 6: a las 16:15 del mismo día (su propio horario cuenta como libre), con el mismo precio", async () => {
    const m = await booked();
    const r = await rescheduleByCustomer(m.deps, lucas, m.appt.id, at("16:15"), false, at("09:00"));
    expect(r.ok && r.value).toMatchObject({ start: at("16:15"), end: at("16:45"), priceCents: 1_800_000, customerReschedules: 1 });
    expect(m.state.events.at(-1)).toMatchObject({ kind: "rescheduled", late: false, from: expect.objectContaining({ start: at("16:00") }) });
  });

  it("caso 8: Confirmado que pasa a dentro de 3 h vuelve a Reservado; a dentro de 40 min, queda Confirmado", async () => {
    const m = await booked(memory(), lucas, at("16:00"), "1", at("15:20"));
    let r = await rescheduleByCustomer(m.deps, lucas, m.appt.id, at("18:30"), true, at("15:30"));
    expect(r.ok && r.value.status).toBe("reserved");
    r = await rescheduleByCustomer(m.deps, lucas, m.appt.id, at("16:15"), true, at("15:35"));
    expect(r.ok && r.value.status).toBe("confirmed");
  });

  it("tarde pide confirmación; caso 7: la tercera vez no se puede", async () => {
    const m = await booked();
    expect(await rescheduleByCustomer(m.deps, lucas, m.appt.id, at("17:00"), false, at("13:00"))).toEqual({ ok: false, error: "CONFIRM_LATE" });
    expect((await rescheduleByCustomer(m.deps, lucas, m.appt.id, at("17:00"), false, at("09:00"))).ok).toBe(true);
    expect((await rescheduleByCustomer(m.deps, lucas, m.appt.id, at("17:30"), false, at("09:00"))).ok).toBe(true);
    expect(await rescheduleByCustomer(m.deps, lucas, m.appt.id, at("18:00"), false, at("09:00"))).toEqual({ ok: false, error: "RESCHEDULE_LIMIT" });
    // Colo sí lo puede mover (no consume el límite).
    expect((await rescheduleByBarber(m.deps, colo, m.appt.id, at("18:00"), "Se me complicó", at("09:00"))).ok).toBe(true);
  });

  it("a un horario ocupado no se mueve", async () => {
    const m = await booked();
    await book(m.deps, ana, { serviceId: "1", start: at("17:00") }, morning);
    expect(await rescheduleByCustomer(m.deps, lucas, m.appt.id, at("17:15"), false, at("09:00"))).toEqual({ ok: false, error: "SLOT_TAKEN" });
  });
});

describe("Colo (RF-20 a RF-25)", () => {
  it("cancela con motivo y el cliente ve el aviso hasta cerrarlo", async () => {
    const m = await booked();
    expect(await cancelByBarber(m.deps, colo, m.appt.id, "no", at("09:00"))).toEqual({ ok: false, error: "REASON_LENGTH" });
    expect((await cancelByBarber(m.deps, colo, m.appt.id, "Me enfermé", at("09:00"))).ok).toBe(true);
    const mine = await getMyAppointment(m.deps, lucas, at("09:05"));
    expect(mine).toEqual({ appointment: null, notice: expect.objectContaining({ kind: "cancelled", reason: "Me enfermé", fromStart: at("16:00") }) });
    await dismissBarberNotice(m.deps, lucas, mine.notice!.eventId, at("09:06"));
    expect((await getMyAppointment(m.deps, lucas, at("09:07"))).notice).toBeNull();
  });

  it("caso 15: Colo mueve sin la anticipación mínima, pero solo dentro de una franja", async () => {
    const m = await booked();
    expect(await rescheduleByBarber(m.deps, colo, m.appt.id, at("13:15"), "Cambio", at("08:30"))).toEqual({ ok: false, error: "SLOT_TAKEN" });
    expect((await rescheduleByBarber(m.deps, colo, m.appt.id, at("10:00"), "Cambio de planes", at("09:50"))).ok).toBe(true);
    const mine = await getMyAppointment(m.deps, lucas, at("09:51"));
    expect(mine.notice).toMatchObject({ kind: "rescheduled", toStart: at("10:00") });
    expect(mine.appointment?.status).toBe("confirmed");
  });

  it("la agenda marca nuevos los cambios del cliente desde la visita anterior a ese día; solo Colo la ve", async () => {
    const m = await booked();
    const day = localDate("2026-11-25");
    expect(await getDayAgenda(m.deps, lucas, day, at("09:00"))).toEqual({ ok: false, error: "NOT_ALLOWED" });
    // Abrir otro día no lo marca como visto, pero avisa que hay nuevos ahí.
    const other = await getDayAgenda(m.deps, colo, localDate("2026-11-24"), at("09:00", "2026-11-24"));
    expect(other.ok && other.value.newElsewhere).toEqual([{ date: "2026-11-25", count: 1 }]);
    const first = await getDayAgenda(m.deps, colo, day, at("09:00"));
    expect(first.ok && first.value.items.map((i) => [i.customer.nickname, i.isNew])).toEqual([["el de la moto", true]]);
    const again = await getDayAgenda(m.deps, colo, day, at("09:01"));
    expect(again.ok && again.value.items[0]!.isNew).toBe(false);
    await rescheduleByCustomer(m.deps, lucas, m.appt.id, at("17:00"), false, at("09:02"));
    const third = await getDayAgenda(m.deps, colo, day, at("09:03"));
    expect(third.ok && third.value.items[0]!.isNew).toBe(true);
  });

  it("los cancelados no aparecen en la agenda y un cliente no cancela como Colo", async () => {
    const m = await booked();
    expect(await cancelByBarber(m.deps, lucas, m.appt.id, "Motivo", at("09:00"))).toEqual({ ok: false, error: "NOT_ALLOWED" });
    await cancelByCustomer(m.deps, lucas, m.appt.id, false, at("09:00"));
    const agenda = await getDayAgenda(m.deps, colo, localDate("2026-11-25"), at("09:01"));
    expect(agenda.ok && agenda.value.items).toEqual([]);
  });
});

describe("barberFreeStarts (RF-25)", () => {
  it("lista los horarios libres del día para mover el turno, sin el suyo y sin anticipación mínima", async () => {
    const m = await booked();
    const r = await barberFreeStarts(m.deps, colo, m.appt.id, localDate("2026-11-25"), at("09:50"));
    const labels = r.ok ? r.value.map((s) => s.label) : [];
    expect(labels[0]).toBe("10:00");
    expect(labels).not.toContain("16:00");
    expect(labels).toContain("16:15"); // su propio horario no ocupa
    expect(await barberFreeStarts(m.deps, lucas, m.appt.id, localDate("2026-11-25"), at("09:50"))).toEqual({ ok: false, error: "NOT_ALLOWED" });
  });
});
