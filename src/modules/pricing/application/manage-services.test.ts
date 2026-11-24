import { describe, expect, it } from "vitest";
import type { Actor } from "@/modules/identity";
import { normalizeServiceName } from "../domain/service";
import { deactivateService, listAllServices, moveServiceOrder, reactivateService, saveService } from "./manage-services";
import type { AdminService, ServiceAdminDeps, ServiceInput } from "./ports";

const colo: Actor = { kind: "barber", userId: "colo", demo: false };
const cliente: Actor = { kind: "customer", userId: "c1", customerId: "c1", profileComplete: true, demo: false };

const svc = (id: string, name: string, durationMinutes: number, position: number, active = true): AdminService => ({
  id,
  slug: name.toLowerCase(),
  name,
  description: "",
  durationMinutes,
  priceCents: 1_800_000,
  countsForBenefits: true,
  position,
  active,
});

function memory(step = 15) {
  const state = {
    services: [svc("1", "Corte", 30, 1), svc("2", "Completo", 30, 2), svc("3", "Claritos", 120, 3)],
    audit: [] as unknown[],
  };
  // Igual que el índice único de la base: nombre repetido entre los que se ofrecen.
  const clash = (name: string, except: string | null) =>
    state.services.some((s) => s.active && s.id !== except && normalizeServiceName(s.name) === normalizeServiceName(name));
  const deps: ServiceAdminDeps = {
    transaction: (fn) =>
      fn({
        currentStep: async () => step,
        audit: { record: async (c) => void state.audit.push(c) },
        admin: {
          listAll: async () =>
            [...state.services].sort((a, b) => Number(b.active) - Number(a.active) || a.position - b.position).map((s) => ({ ...s })),
          insert: async (input: ServiceInput, position: number) => {
            if (clash(input.name, null)) return "NAME_TAKEN";
            const id = String(state.services.length + 1);
            state.services.push({ ...svc(id, input.name, input.durationMinutes, position), ...input });
            return id;
          },
          update: async (id, input) => {
            const s = state.services.find((x) => x.id === id);
            if (!s) return "NOT_FOUND";
            if (s.active && clash(input.name, id)) return "NAME_TAKEN";
            Object.assign(s, input);
            return "ok";
          },
          setActive: async (id, active, position) => {
            const s = state.services.find((x) => x.id === id);
            if (!s) return "NOT_FOUND";
            if (active && clash(s.name, id)) return "NAME_TAKEN";
            s.active = active;
            if (position !== null) s.position = position;
            return "ok";
          },
          setOrder: async (ids) => ids.forEach((id, i) => void (state.services.find((s) => s.id === id)!.position = i + 1)),
        },
      }),
  };
  const offered = () => state.services.filter((s) => s.active).sort((a, b) => a.position - b.position).map((s) => s.name);
  return { state, deps, offered };
}

const nuevo: ServiceInput = { name: "Barba", description: "Perfilado", durationMinutes: 15, priceCents: 900_000, countsForBenefits: false };

describe("servicios (RF-15 a RF-21)", () => {
  it("un cliente no puede listar ni cambiar servicios (RF-2)", async () => {
    const { state, deps } = memory();
    expect(await listAllServices(deps, cliente)).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await saveService(deps, cliente, null, nuevo)).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await deactivateService(deps, cliente, "1", true)).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(state.services).toHaveLength(3);
  });

  it("agrega uno nuevo al final y edita uno existente (RF-16)", async () => {
    const { state, deps, offered } = memory();
    expect(await saveService(deps, colo, null, { ...nuevo, name: "  Barba  " })).toEqual({ ok: true, value: { id: "4" } });
    expect(offered()).toEqual(["Corte", "Completo", "Claritos", "Barba"]);
    expect(state.services[3]!.position).toBe(4);
    expect((await saveService(deps, colo, "1", { ...nuevo, name: "Corte", priceCents: 1_900_000 })).ok).toBe(true);
    expect(state.services[0]!.priceCents).toBe(1_900_000);
    expect(state.audit).toHaveLength(2);
  });

  it("caso 9: rechaza ' corte ' mientras Corte se ofrece; con Corte sacado, se permite", async () => {
    const { deps } = memory();
    expect(await saveService(deps, colo, null, { ...nuevo, name: " corte " })).toEqual({ ok: false, error: ["NAME_TAKEN"] });
    await deactivateService(deps, colo, "1", false);
    expect((await saveService(deps, colo, null, { ...nuevo, name: " corte " })).ok).toBe(true);
  });

  it("rechaza una duración que no es múltiplo del paso (RF-17)", async () => {
    const { deps } = memory(30);
    expect(await saveService(deps, colo, null, nuevo)).toEqual({ ok: false, error: ["DURATION_NOT_MULTIPLE_OF_STEP"] });
  });

  it("cambia el orden (RF-18)", async () => {
    const { deps, offered } = memory();
    await moveServiceOrder(deps, colo, "3", "up");
    expect(offered()).toEqual(["Corte", "Claritos", "Completo"]);
  });

  it("caso 10 y RF-20: no reactiva un nombre que choca; sí cuando deja de chocar, al final", async () => {
    const { deps, offered } = memory();
    await deactivateService(deps, colo, "1", false);
    await saveService(deps, colo, null, { ...nuevo, name: "Corte" });
    expect(await reactivateService(deps, colo, "1")).toEqual({ ok: false, error: ["NAME_TAKEN"] });
    await deactivateService(deps, colo, "4", false);
    expect((await reactivateService(deps, colo, "1")).ok).toBe(true);
    expect(offered()).toEqual(["Completo", "Claritos", "Corte"]);
  });

  it("RF-20: no reactiva si su duración no es múltiplo del paso actual", async () => {
    const { state, deps } = memory(60);
    state.services[0]!.active = false;
    expect(await reactivateService(deps, colo, "1")).toEqual({ ok: false, error: ["DURATION_NOT_MULTIPLE_OF_STEP"] });
  });

  it("caso 11 y RF-21: sacar el último pide confirmación", async () => {
    const { deps, offered } = memory();
    await deactivateService(deps, colo, "1", false);
    await deactivateService(deps, colo, "2", false);
    expect(await deactivateService(deps, colo, "3", false)).toEqual({ ok: false, error: "CONFIRM_LAST" });
    expect(offered()).toEqual(["Claritos"]);
    expect((await deactivateService(deps, colo, "3", true)).ok).toBe(true);
    expect(offered()).toEqual([]);
  });

  it("los sacados se listan después de los que se ofrecen (RF-15)", async () => {
    const { deps } = memory();
    await deactivateService(deps, colo, "1", false);
    const list = await listAllServices(deps, colo);
    expect(list.ok && list.value.map((s) => [s.name, s.active])).toEqual([
      ["Completo", true],
      ["Claritos", true],
      ["Corte", false],
    ]);
  });

  it("un cliente tampoco puede ordenar ni reactivar", async () => {
    const { deps } = memory();
    expect(await moveServiceOrder(deps, cliente, "3", "up")).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await reactivateService(deps, cliente, "1")).toEqual({ ok: false, error: "NOT_ALLOWED" });
  });

  it("editar o reactivar un servicio que no existe da NOT_FOUND; reactivar uno que se ofrece no hace nada", async () => {
    const { state, deps } = memory();
    expect(await saveService(deps, colo, "99", nuevo)).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await reactivateService(deps, colo, "99")).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(await reactivateService(deps, colo, "1")).toEqual({ ok: true, value: undefined });
    expect(state.audit).toEqual([]);
  });

  it("un servicio sacado se edita sin mirar el paso ni los nombres de los que se ofrecen (caso 9)", async () => {
    const { state, deps } = memory(30);
    state.services[0]!.active = false;
    expect((await saveService(deps, colo, "1", { ...nuevo, name: "Completo", durationMinutes: 45 })).ok).toBe(true);
    expect(state.services[0]!.durationMinutes).toBe(45);
  });

  it("si otro cambio gana la carrera en la base, devuelve el error de la base", async () => {
    const { deps } = memory();
    const raced = (over: Partial<Parameters<Parameters<ServiceAdminDeps["transaction"]>[0]>[0]["admin"]>): ServiceAdminDeps => ({
      transaction: (fn) => deps.transaction((tx) => fn({ ...tx, admin: { ...tx.admin, ...over } })),
    });
    expect(await saveService(raced({ insert: async () => "NAME_TAKEN" }), colo, null, nuevo)).toEqual({ ok: false, error: ["NAME_TAKEN"] });
    expect(await saveService(raced({ update: async () => "NAME_TAKEN" }), colo, "1", nuevo)).toEqual({ ok: false, error: ["NAME_TAKEN"] });
    expect(await saveService(raced({ update: async () => "NOT_FOUND" }), colo, "1", nuevo)).toEqual({ ok: false, error: "NOT_FOUND" });
    await deactivateService(deps, colo, "1", false);
    expect(await reactivateService(raced({ setActive: async () => "NAME_TAKEN" }), colo, "1")).toEqual({ ok: false, error: ["NAME_TAKEN"] });
    expect(await reactivateService(raced({ setActive: async () => "NOT_FOUND" }), colo, "1")).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});
