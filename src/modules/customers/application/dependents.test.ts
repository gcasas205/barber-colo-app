import { describe, expect, it } from "vitest";
import type { Actor } from "@/modules/identity";
import { addDependent, listDependents, removeDependent, updateDependent } from "./dependents";
import { memoryStore } from "./memory-store";
import { enterAsDemo } from "./use-cases";

const NOW = new Date("2026-11-22T12:00:00Z");

async function holder(m = memoryStore(), userId = "u-c1", email = "cliente1@example.com") {
  const r = await enterAsDemo({ store: m.store, demoEnabled: true }, { authUserId: userId, email });
  if (!r.ok || r.value.kind !== "customer") throw new Error("no");
  const actor: Actor = { kind: "customer", userId, customerId: r.value.customerId, profileComplete: true, demo: true };
  return { m, actor };
}
const tomi = { name: "Tomi", birthday: { day: 3, month: 5 } };

describe("personas a cargo (spec 004b, RF-1 a RF-7)", () => {
  it("el titular agrega, lista y edita; si es de prueba, con la marca (demo) (caso 5)", async () => {
    const { m, actor } = await holder();
    const added = await addDependent({ store: m.store }, actor, tomi);
    expect(added).toEqual({ ok: true, value: { id: expect.any(String), name: "Tomi (demo)", birthday: { day: 3, month: 5 } } });
    const id = added.ok ? added.value.id : "";
    expect(await updateDependent({ store: m.store }, actor, id, { name: "Tomás", birthday: null })).toMatchObject({ ok: true, value: { name: "Tomás (demo)" } });
    expect(await listDependents({ store: m.store }, actor)).toEqual([{ id, name: "Tomás (demo)", birthday: null }]);
    expect(m.customers.get(id)).toMatchObject({ role: "dependent", accountUserId: "u-c1", phone: null, isDemo: true });
  });

  it("caso 3: no pasa de 5", async () => {
    const { m, actor } = await holder();
    for (let i = 0; i < 5; i++) expect((await addDependent({ store: m.store }, actor, { name: `Hijo ${i}`, birthday: null })).ok).toBe(true);
    expect(await addDependent({ store: m.store }, actor, { name: "Sexto", birthday: null })).toEqual({ ok: false, error: "LIMIT" });
  });

  it("valida nombre y cumpleaños por campo", async () => {
    const { m, actor } = await holder();
    expect(await addDependent({ store: m.store }, actor, { name: "T", birthday: { day: 30, month: 2 } })).toEqual({
      ok: false,
      error: { fields: { name: "NAME_LENGTH", birthday: "BIRTHDAY_INVALID" } },
    });
  });

  it("caso 4: no se quita con un turno futuro; sin turno, se anonimiza y deja de verse", async () => {
    const { m, actor } = await holder();
    const added = await addDependent({ store: m.store }, actor, tomi);
    const id = added.ok ? added.value.id : "";
    m.upcoming.add(id);
    expect(await removeDependent({ store: m.store }, actor, id, NOW)).toEqual({ ok: false, error: "HAS_UPCOMING" });
    m.upcoming.delete(id);
    expect(await removeDependent({ store: m.store }, actor, id, NOW)).toEqual({ ok: true, value: undefined });
    expect(await listDependents({ store: m.store }, actor)).toEqual([]);
    expect(m.customers.get(id)).toMatchObject({ anonymized: true, birthday: null, fullName: "Cliente dado de baja" });
  });

  it("RF-7 y caso 6: un invitado, Colo o un titular sobre otra cuenta no cambian nada", async () => {
    const { m, actor } = await holder();
    const added = await addDependent({ store: m.store }, actor, tomi);
    const id = added.ok ? added.value.id : "";
    const otro = await holder(m, "u-c2", "cliente2@example.com");
    const invitado: Actor = { kind: "guest", userId: "g1", customerId: "x" };
    const colo: Actor = { kind: "barber", userId: "colo", demo: true };
    for (const a of [invitado, colo]) {
      expect(await addDependent({ store: m.store }, a, tomi)).toEqual({ ok: false, error: "NOT_ALLOWED" });
      expect(await listDependents({ store: m.store }, a)).toEqual([]);
    }
    expect(await updateDependent({ store: m.store }, otro.actor, id, { name: "Hackeado", birthday: null })).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await removeDependent({ store: m.store }, otro.actor, id, NOW)).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(m.customers.get(id)!.fullName).toBe("Tomi (demo)");
  });
});
