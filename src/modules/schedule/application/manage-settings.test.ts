import { describe, expect, it } from "vitest";
import type { Actor } from "@/modules/identity";
import { localDate } from "@/shared/kernel";
import type { WeeklyRange } from "../domain/schedule";
import { addBlock, changeStep, getScheduleSettings, removeBlock, saveBookingRules, saveContact, saveWeeklyRanges } from "./manage-settings";
import type { BlockRecord, ScheduleAdminDeps, ScheduleSettings, SettingsArea } from "./ports";

const colo: Actor = { kind: "barber", userId: "colo", demo: false };
const coloDemo: Actor = { kind: "barber", userId: "colo-demo", demo: true };
const cliente: Actor = { kind: "customer", userId: "c1", customerId: "c1", profileComplete: true, demo: false };
const invitado: Actor = { kind: "guest", userId: "g1", customerId: "g1" };
const nadie: Actor = { kind: "none", reason: "no_session" };

function memory() {
  const state = {
    settings: { config: { stepMinutes: 15, minNoticeMinutes: 30, maxAdvanceDays: 30 }, contactWhatsapp: "+5491138163491" } as ScheduleSettings,
    ranges: [{ weekday: 1, opensAt: 600, closesAt: 780 }] as WeeklyRange[],
    blocks: [] as BlockRecord[],
    services: [{ name: "Corte", durationMinutes: 30 }],
    audit: [] as { area: SettingsArea; userId: string }[],
    locks: 0,
  };
  const deps: ScheduleAdminDeps = {
    transaction: (fn) =>
      fn({
        admin: {
          lockSettings: async () => (state.locks++, structuredClone(state.settings)),
          weeklyRanges: async () => [...state.ranges],
          replaceWeeklyRanges: async (r) => void (state.ranges = r),
          updateStep: async (s) => void (state.settings.config.stepMinutes = s),
          updateBookingRules: async (r) => void Object.assign(state.settings.config, r),
          updateContact: async (w) => void (state.settings.contactWhatsapp = w),
          insertBlock: async (b, notice) => {
            const id = String(state.blocks.length + 1);
            state.blocks.push({ id, ...b, notice });
            return id;
          },
          deleteBlock: async (id) => {
            const before = state.blocks.length;
            state.blocks = state.blocks.filter((b) => b.id !== id);
            return state.blocks.length < before;
          },
          currentBlocks: async (now) => state.blocks.filter((b) => b.end > now),
        },
        audit: { record: async (c) => void state.audit.push(c) },
        activeServices: async () => state.services,
      }),
  };
  return { state, deps };
}

const now = new Date("2026-11-21T23:00:00Z");

describe("permisos (RF-2, RF-28)", () => {
  it.each([cliente, invitado, nadie])("$kind no puede leer ni cambiar nada", async (actor) => {
    const { state, deps } = memory();
    expect(await getScheduleSettings(deps, actor, now)).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await saveWeeklyRanges(deps, actor, [])).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await changeStep(deps, actor, 30)).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await saveBookingRules(deps, actor, { minNoticeMinutes: 0, maxAdvanceDays: 7 })).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await saveContact(deps, actor, "+5491100000000")).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await removeBlock(deps, actor, "1")).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(state.ranges).toHaveLength(1);
    expect(state.audit).toEqual([]);
  });

  it("Colo demo cambia todo, como Colo, y queda registrado quién fue (RF-27)", async () => {
    const { state, deps } = memory();
    expect((await changeStep(deps, coloDemo, 30)).ok).toBe(true);
    expect(state.settings.config.stepMinutes).toBe(30);
    expect(state.audit).toEqual([expect.objectContaining({ area: "paso", userId: "colo-demo" })]);
  });
});

describe("franjas y paso", () => {
  it("guarda todas las franjas juntas y con el paso del momento (RF-5, RF-6)", async () => {
    const { state, deps } = memory();
    const next: WeeklyRange[] = [
      { weekday: 7, opensAt: 600, closesAt: 780 },
      { weekday: 2, opensAt: 610, closesAt: 780 },
    ];
    expect(await saveWeeklyRanges(deps, colo, next)).toEqual({ ok: false, error: [{ code: "RANGE_NOT_ON_STEP", weekday: 2 }] });
    expect(state.ranges).toEqual([{ weekday: 1, opensAt: 600, closesAt: 780 }]);
    expect((await saveWeeklyRanges(deps, colo, next.slice(0, 1))).ok).toBe(true);
    expect(state.ranges).toEqual(next.slice(0, 1));
    expect(state.locks).toBe(2);
  });

  it("caso 1: no cambia el paso si un servicio activo queda desalineado (RF-9)", async () => {
    const { state, deps } = memory();
    expect(await changeStep(deps, colo, 20)).toEqual({ ok: false, error: { services: ["Corte"], weekdays: [] } });
    expect(state.settings.config.stepMinutes).toBe(15);
  });
});

describe("reserva y contacto (RF-22 a RF-24)", () => {
  it("caso 12 y 13: guarda días a futuro y anticipación válidos", async () => {
    const { state, deps } = memory();
    expect((await saveBookingRules(deps, colo, { minNoticeMinutes: 0, maxAdvanceDays: 7 })).ok).toBe(true);
    expect(state.settings.config).toMatchObject({ minNoticeMinutes: 0, maxAdvanceDays: 7 });
  });

  it("rechaza un WhatsApp sin normalizar", async () => {
    const { deps } = memory();
    expect(await saveContact(deps, colo, "11 3816-3491")).toEqual({ ok: false, error: "WHATSAPP_INVALID" });
  });
});

describe("bloqueos (RF-10 a RF-13)", () => {
  it("carga uno de días con aviso y otro de horas superpuesto (caso 5), y se borran", async () => {
    const { state, deps } = memory();
    const days = await addBlock(deps, colo, { kind: "days", first: localDate("2026-11-25"), last: localDate("2026-11-25") }, " Feriado ", now);
    const hours = await addBlock(deps, colo, { kind: "hours", day: localDate("2026-11-25"), from: 600, to: 660 }, "", now);
    expect(days.ok && hours.ok).toBe(true);
    expect(state.blocks.map((b) => b.notice)).toEqual(["Feriado", null]);
    expect((await getScheduleSettings(deps, colo, now)).ok && state.blocks).toHaveLength(2);
    expect((await removeBlock(deps, colo, "1")).ok).toBe(true);
    expect(await removeBlock(deps, colo, "1")).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("caso 7: rechaza un bloqueo que ya terminó, sin guardar ni auditar", async () => {
    const { state, deps } = memory();
    const result = await addBlock(deps, colo, { kind: "hours", day: localDate("2026-11-21"), from: 540, to: 600 }, "", now);
    expect(result).toEqual({ ok: false, error: "BLOCK_IN_PAST" });
    expect(state.blocks).toEqual([]);
    expect(state.audit).toEqual([]);
  });
});
