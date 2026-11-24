import { describe, expect, it } from "vitest";
import type { Actor } from "@/modules/identity";
import { memoryStore } from "./memory-store";
import { PhoneConflictError, type CustomersStore } from "./ports";
import { enterAsDemo, enterAsGuest, getOwnProfile, listCustomers, saveContact, saveProfile, setNickname } from "./use-cases";

const now = new Date("2026-11-21T21:00:00Z");
const barber: Actor = { kind: "barber", userId: "colo", demo: true };

async function demoClient(m = memoryStore(), userId = "u-c1") {
  const r = await enterAsDemo({ store: m.store, demoEnabled: true }, { authUserId: userId, email: "cliente1@example.com" });
  if (!r.ok || r.value.kind !== "customer") throw new Error("no");
  const actor: Actor = { kind: "customer", userId, customerId: r.value.customerId, profileComplete: false, demo: true };
  return { m, actor, customerId: r.value.customerId };
}
const guestEntry = (m: ReturnType<typeof memoryStore>, ip = "ip-1", device = `d-${Math.random()}`) =>
  enterAsGuest({ store: m.store, createSession: async () => device }, { ipHash: ip, now });
/** Invitado que entró con un toque y carga sus datos al reservar (spec 004). */
async function guestWithContact(m: ReturnType<typeof memoryStore>, name: string, phone: string, device = `d-${Math.random()}`) {
  const actor: Actor = { kind: "guest", userId: device, customerId: null };
  return saveContact({ store: m.store }, actor, { name, phone });
}

describe("enterAsDemo (RF-22, RF-23, RF-25)", () => {
  it("Colo (demo) queda como barbero, sin ficha de cliente", async () => {
    const m = memoryStore();
    expect(await enterAsDemo({ store: m.store, demoEnabled: true }, { authUserId: "u1", email: "colo@example.com" })).toEqual({ ok: true, value: { kind: "barber" } });
    expect(m.demo.get("u1")).toEqual({ kind: "barber", customerId: null });
  });

  it("un cliente de prueba recibe su ficha marcada '(demo)', una sola vez", async () => {
    const { m, customerId } = await demoClient();
    await enterAsDemo({ store: m.store, demoEnabled: true }, { authUserId: "u-c1", email: "cliente1@example.com" });
    expect([...m.customers.values()]).toHaveLength(1);
    expect(m.customers.get(customerId)).toMatchObject({ fullName: "Cliente de prueba 1 (demo)", isDemo: true, role: "holder" });
  });

  it("con la demo apagada o un correo que no es de prueba, no entra (RF-1c, RF-24)", async () => {
    const m = memoryStore();
    expect(await enterAsDemo({ store: m.store, demoEnabled: false }, { authUserId: "u1", email: "colo@example.com" })).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await enterAsDemo({ store: m.store, demoEnabled: true }, { authUserId: "u1", email: "otro@example.com" })).toEqual({ ok: false, error: "NOT_ALLOWED" });
  });
});

describe("saveProfile (RF-9 a RF-14)", () => {
  it("valida y guarda nombre, teléfono y cumpleaños; anota el cambio de teléfono", async () => {
    const { m, actor, customerId } = await demoClient();
    const r = await saveProfile({ store: m.store }, actor, { name: "  Martín  ", phone: "11 3816-3491", birthday: { day: 29, month: 2 } });
    expect(r).toEqual({ ok: true, value: { merged: false } });
    // Es un cliente de prueba: conserva la marca "(demo)" (RF-25).
    expect(m.customers.get(customerId)).toMatchObject({ fullName: "Martín (demo)", phone: "+5491138163491", birthday: { day: 29, month: 2 } });
    expect(m.phoneChanges).toEqual([{ customerId, oldPhone: null, newPhone: "+5491138163491", changedBy: "u-c1" }]);
  });

  it("devuelve todos los errores de los campos juntos", async () => {
    const { m, actor } = await demoClient();
    const r = await saveProfile({ store: m.store }, actor, { name: "A", phone: "4555-1234", birthday: { day: 31, month: 4 } });
    expect(r).toEqual({ ok: false, error: { fields: { name: "NAME_LENGTH", phone: "PHONE_INVALID", birthday: "BIRTHDAY_INVALID" } } });
  });

  it("el cumpleaños es opcional", async () => {
    const { m, actor } = await demoClient();
    expect((await saveProfile({ store: m.store }, actor, { name: "Martín", phone: "1138163491", birthday: null })).ok).toBe(true);
  });

  it("rechaza el teléfono de otra cuenta (RF-11)", async () => {
    const m = memoryStore();
    const a = await demoClient(m, "u-a");
    await saveProfile({ store: m.store }, a.actor, { name: "Martín", phone: "1138163491", birthday: null });
    const r2 = await enterAsDemo({ store: m.store, demoEnabled: true }, { authUserId: "u-b", email: "cliente2@example.com" });
    const b: Actor = { kind: "customer", userId: "u-b", customerId: r2.ok && r2.value.kind === "customer" ? r2.value.customerId : "", profileComplete: false, demo: true };
    expect(await saveProfile({ store: m.store }, b, { name: "Otro", phone: "11 3816 3491", birthday: null })).toEqual({ ok: false, error: { fields: { phone: "PHONE_TAKEN" } } });
  });

  it("con el teléfono de un invitado, lo une a la cuenta (RF-12)", async () => {
    const m = memoryStore();
    await guestWithContact(m, "Lucas", "1138163491");
    const { actor, customerId } = await demoClient(m);
    expect(await saveProfile({ store: m.store }, actor, { name: "Lucas", phone: "1138163491", birthday: null })).toEqual({ ok: true, value: { merged: true } });
    const guest = [...m.customers.values()].find((c) => c.role === "guest")!;
    expect(guest.linkedTo).toBe(customerId);
    expect(m.customers.get(customerId)!.phone).toBe("+5491138163491");
  });

  it("guardar el mismo teléfono no lo registra como cambio", async () => {
    const { m, actor } = await demoClient();
    await saveProfile({ store: m.store }, actor, { name: "Martín", phone: "1138163491", birthday: null });
    await saveProfile({ store: m.store }, actor, { name: "Martín P.", phone: "011 15 3816-3491", birthday: null });
    expect(m.phoneChanges).toHaveLength(1);
  });

  it("solo un cliente con cuenta tiene perfil", async () => {
    const m = memoryStore();
    expect(await saveProfile({ store: m.store }, barber, { name: "Colo", phone: "1138163491", birthday: null })).toEqual({ ok: false, error: "NOT_ALLOWED" });
  });
});

describe("enterAsGuest (spec 004, RF-4: un toque)", () => {
  it("crea la sesión sin pedir datos ni crear el cliente", async () => {
    const m = memoryStore();
    let sessions = 0;
    const r = await enterAsGuest({ store: m.store, createSession: async () => (sessions++, "d") }, { ipHash: "ip", now });
    expect(r).toEqual({ ok: true, value: undefined });
    expect(sessions).toBe(1);
    expect(m.customers.size).toBe(0);
  });

  it("el sexto intento en una hora desde la misma conexión se rechaza y no crea sesión (RF-18b de la 002)", async () => {
    const m = memoryStore();
    for (let i = 0; i < 5; i++) expect((await guestEntry(m, "ip-x")).ok).toBe(true);
    expect(await guestEntry(m, "ip-x")).toEqual({ ok: false, error: { form: "RATE_LIMITED" } });
    expect((await guestEntry(m, "ip-y")).ok).toBe(true);
  });
});

describe("saveContact (spec 004, RF-7, RF-11)", () => {
  it("un invitado sin datos crea su cliente y asocia el dispositivo", async () => {
    const m = memoryStore();
    const r = await guestWithContact(m, "Lucas", "11 3816-3491", "dev-1");
    expect(r.ok).toBe(true);
    const id = r.ok ? r.value.customerId : "";
    expect(m.customers.get(id)).toMatchObject({ role: "guest", fullName: "Lucas", phone: "+5491138163491" });
    expect(m.devices.get("dev-1")).toBe(id);
  });

  it("con el teléfono de otro invitado, es el mismo cliente y no cambia el nombre (RF-17 de la 002)", async () => {
    const m = memoryStore();
    const first = await guestWithContact(m, "Lucas", "1138163491");
    const second = await guestWithContact(m, "Otro nombre", "011 15 3816-3491", "dev-2");
    expect(second.ok && first.ok && second.value.customerId === first.value.customerId).toBe(true);
    expect([...m.customers.values()][0]!.fullName).toBe("Lucas");
    expect(m.devices.get("dev-2")).toBe(first.ok ? first.value.customerId : "");
  });

  it("caso 12: con el teléfono de una cuenta, no se guarda y se pide ingresar con esa cuenta", async () => {
    const { m, actor } = await demoClient();
    await saveProfile({ store: m.store }, actor, { name: "Martín", phone: "1138163491", birthday: null });
    expect(await guestWithContact(m, "Impostor", "1138163491")).toEqual({ ok: false, error: { form: "PHONE_HAS_ACCOUNT" } });
  });

  it("valida nombre y teléfono, y marca los del exterior", async () => {
    const m = memoryStore();
    expect(await guestWithContact(m, "L", "+598 99 123 456")).toEqual({ ok: false, error: { fields: { name: "NAME_LENGTH", phone: "PHONE_FOREIGN" } } });
  });

  it("un cliente con cuenta completa nombre y teléfono sin perder el cumpleaños", async () => {
    const { m, actor, customerId } = await demoClient();
    await saveProfile({ store: m.store }, actor, { name: "Martín", phone: "1138163491", birthday: { day: 3, month: 5 } });
    const r = await saveContact({ store: m.store }, actor, { name: "Martín G", phone: "1138163492" });
    expect(r).toEqual({ ok: true, value: { customerId } });
    expect(m.customers.get(customerId)).toMatchObject({ fullName: "Martín G (demo)", phone: "+5491138163492", birthday: { day: 3, month: 5 } });
  });

  it("un invitado que ya tiene cliente no cambia nada; Colo no reserva para sí", async () => {
    const m = memoryStore();
    const first = await guestWithContact(m, "Lucas", "1138163491");
    const id = first.ok ? first.value.customerId : "";
    const again = await saveContact({ store: m.store }, { kind: "guest", userId: "x", customerId: id }, { name: "Otro", phone: "1100000000" });
    expect(again).toEqual({ ok: true, value: { customerId: id } });
    expect(await saveContact({ store: m.store }, barber, { name: "Colo", phone: "1138163491" })).toEqual({ ok: false, error: "NOT_ALLOWED" });
  });
});

describe("lista y sobrenombre de Colo (RF-19 a RF-21)", () => {
  it("solo el barbero ve la lista, de la más reciente a la más antigua, de a 50", async () => {
    const m = memoryStore();
    for (let i = 0; i < 55; i++) await guestWithContact(m, `Cliente ${i}`, `11 4000-${String(1000 + i)}`);
    const page1 = await listCustomers({ store: m.store }, barber, null);
    expect(page1.ok && page1.value.items).toHaveLength(50);
    expect(page1.ok && page1.value.items[0]!.fullName).toBe("Cliente 54");
    const page2 = await listCustomers({ store: m.store }, barber, page1.ok ? page1.value.next : null);
    expect(page2.ok && page2.value.items.map((c) => c.fullName)).toEqual(["Cliente 4", "Cliente 3", "Cliente 2", "Cliente 1", "Cliente 0"]);
    expect(page2.ok && page2.value.next).toBeNull();
    const customer: Actor = { kind: "customer", userId: "x", customerId: "c1", profileComplete: true, demo: true };
    expect(await listCustomers({ store: m.store }, customer, null)).toEqual({ ok: false, error: "NOT_ALLOWED" });
  });

  it("los invitados unidos a una cuenta no aparecen aparte", async () => {
    const m = memoryStore();
    await guestWithContact(m, "Lucas", "1138163491");
    const { actor } = await demoClient(m);
    await saveProfile({ store: m.store }, actor, { name: "Lucas", phone: "1138163491", birthday: null });
    const list = await listCustomers({ store: m.store }, barber, null);
    expect(list.ok && list.value.items.map((c) => c.role)).toEqual(["holder"]);
  });

  it("Colo pone, cambia y borra un sobrenombre; nadie más puede", async () => {
    const m = memoryStore();
    const g = await guestWithContact(m, "Lucas", "1138163491");
    const id = g.ok ? g.value.customerId : "";
    expect(await setNickname({ store: m.store }, barber, id, "  el pelado de la moto ")).toEqual({ ok: true, value: undefined });
    expect(m.customers.get(id)!.nickname).toBe("el pelado de la moto");
    await setNickname({ store: m.store }, barber, id, "   ");
    expect(m.customers.get(id)!.nickname).toBeNull();
    expect(await setNickname({ store: m.store }, barber, id, "x".repeat(41))).toEqual({ ok: false, error: "NICKNAME_LENGTH" });
    expect(await setNickname({ store: m.store }, { kind: "guest", userId: "d", customerId: id }, id, "yo")).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await setNickname({ store: m.store }, barber, "no-existe", "x")).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});

describe("getOwnProfile", () => {
  it("devuelve el propio perfil sin el sobrenombre (RF-21)", async () => {
    const m = memoryStore();
    const g = await guestWithContact(m, "Lucas", "1138163491", "dev");
    const id = g.ok ? g.value.customerId : "";
    await setNickname({ store: m.store }, barber, id, "el de la moto");
    const profile = await getOwnProfile({ store: m.store }, { kind: "guest", userId: "dev", customerId: id });
    expect(profile).toEqual({ kind: "guest", fullName: "Lucas", phone: "+5491138163491", birthday: null, isDemo: false });
    expect(JSON.stringify(profile)).not.toContain("moto");
    expect(await getOwnProfile({ store: m.store }, barber)).toBeNull();
  });
});

describe("bordes de perfil y contacto (ub-mode)", () => {
  const failing = (error: Error): CustomersStore => ({ transaction: async () => Promise.reject(error) });

  it("si la base frena el teléfono en la carrera, se pide otro; cualquier otro error sigue de largo", async () => {
    const { actor } = await demoClient();
    const input = { name: "Martín", phone: "1138163491", birthday: null };
    expect(await saveProfile({ store: failing(new PhoneConflictError()) }, actor, input)).toEqual({ ok: false, error: { fields: { phone: "PHONE_TAKEN" } } });
    await expect(saveProfile({ store: failing(new Error("se cayó la base")) }, actor, input)).rejects.toThrow("se cayó la base");

    const guest: Actor = { kind: "guest", userId: "d-1", customerId: null };
    expect(await saveContact({ store: failing(new PhoneConflictError()) }, guest, input)).toEqual({ ok: false, error: { form: "TRY_AGAIN" } });
    await expect(saveContact({ store: failing(new Error("se cayó la base")) }, guest, input)).rejects.toThrow("se cayó la base");
  });

  it("un cliente sin ficha, o con una ficha que no es de titular, no guarda perfil ni contacto", async () => {
    const m = memoryStore();
    const sinFicha: Actor = { kind: "customer", userId: "u-x", customerId: null, profileComplete: false, demo: false };
    const fantasma: Actor = { ...sinFicha, customerId: "no-existe" } as Actor;
    const input = { name: "Martín", phone: "1138163491" };
    expect(await saveProfile({ store: m.store }, sinFicha, { ...input, birthday: null })).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await saveProfile({ store: m.store }, fantasma, { ...input, birthday: null })).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await saveContact({ store: m.store }, sinFicha, input)).toEqual({ ok: false, error: "NOT_ALLOWED" });
    expect(await saveContact({ store: m.store }, fantasma, input)).toEqual({ ok: false, error: "NOT_ALLOWED" });

    const g = await guestWithContact(m, "Ana", "1100000000");
    const comoTitular: Actor = { ...sinFicha, customerId: g.ok ? g.value.customerId : "" } as Actor;
    expect(await saveProfile({ store: m.store }, comoTitular, { ...input, birthday: null })).toEqual({ ok: false, error: "NOT_ALLOWED" });
  });

  it("un cliente con cuenta que carga mal sus datos ve los errores por campo", async () => {
    const { m, actor } = await demoClient();
    expect(await saveContact({ store: m.store }, actor, { name: "A", phone: "1" })).toEqual({ ok: false, error: { fields: { name: "NAME_LENGTH", phone: "PHONE_INVALID" } } });
  });
});
