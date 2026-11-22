import type { DemoKind } from "@/modules/identity";
import type { CustomerRow, CustomersStore, CustomersTx, ListCursor } from "./ports";
import { PhoneConflictError } from "./ports";

/** Implementación en memoria para los tests de los casos de uso. Imita las reglas de la base. */
export function memoryStore() {
  const customers = new Map<string, CustomerRow & { linkedTo: string | null; anonymized?: boolean }>();
  const devices = new Map<string, string>();
  const demo = new Map<string, { kind: DemoKind; customerId: string | null }>();
  const attempts: { ipHash: string; at: Date }[] = [];
  const phoneChanges: { customerId: string; oldPhone: string | null; newPhone: string; changedBy: string }[] = [];
  const upcoming = new Set<string>(); // ids con turno futuro (lo arma el test)
  let seq = 0;
  let clock = Date.parse("2026-11-21T12:00:00Z");
  const nextId = () => `c${++seq}`;

  const active = () => [...customers.values()].filter((c) => !c.linkedTo && !c.anonymized);
  const tx: CustomersTx = {
    lockPhoneOwner: async (phone) => active().find((c) => c.phone === phone) ?? null,
    getCustomer: async (id) => customers.get(id) ?? null,
    updateProfile: async (id, p) => {
      if (active().some((c) => c.id !== id && c.phone === p.phone)) throw new PhoneConflictError();
      Object.assign(customers.get(id)!, { fullName: p.fullName, phone: p.phone, birthday: p.birthday });
    },
    linkGuest: async (guestId, holderId) => void (customers.get(guestId)!.linkedTo = holderId),
    recordPhoneChange: async (c) => void phoneChanges.push(c),
    countGuestAttempts: async (ipHash, since) => attempts.filter((a) => a.ipHash === ipHash && a.at >= since).length,
    recordGuestAttempt: async (ipHash, at) => void attempts.push({ ipHash, at }),
    createGuest: async ({ fullName, phone }) => {
      if (active().some((c) => c.phone === phone)) throw new PhoneConflictError();
      const id = nextId();
      customers.set(id, { id, role: "guest", accountUserId: null, fullName, phone, birthday: null, nickname: null, isDemo: false, createdAt: new Date(clock++), linkedTo: null });
      return id;
    },
    addGuestDevice: async (authUserId, customerId) => void devices.set(authUserId, customerId),
    findDemoAccount: async (authUserId) => demo.get(authUserId) ?? null,
    saveDemoAccount: async (authUserId, kind, customerId) => void demo.set(authUserId, { kind, customerId }),
    createDemoHolder: async (authUserId, fullName) => {
      const id = nextId();
      customers.set(id, { id, role: "holder", accountUserId: authUserId, fullName, phone: null, birthday: null, nickname: null, isDemo: true, createdAt: new Date(clock++), linkedTo: null });
      return id;
    },
    listCustomers: async (limit, after: ListCursor | null) =>
      active()
        .filter((c) => c.role !== "dependent")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (b.id < a.id ? -1 : 1))
        .filter((c) => !after || c.createdAt < after.createdAt || (c.createdAt.getTime() === after.createdAt.getTime() && c.id < after.id))
        .slice(0, limit),
    setNickname: async (id, nickname) => {
      const c = customers.get(id);
      if (!c) return false;
      c.nickname = nickname;
      return true;
    },
    lockHolder: async (account) => active().find((c) => c.role === "holder" && c.accountUserId === account) ?? null,
    listDependents: async (account) => active().filter((c) => c.role === "dependent" && c.accountUserId === account),
    createDependent: async (d) => {
      const id = nextId();
      customers.set(id, { id, role: "dependent", accountUserId: d.accountUserId, fullName: d.fullName, phone: null, birthday: d.birthday, nickname: null, isDemo: d.isDemo, createdAt: new Date(clock++), linkedTo: null });
      return id;
    },
    updateDependent: async (id, d) => void Object.assign(customers.get(id)!, { fullName: d.fullName, birthday: d.birthday }),
    lockDependent: async (account, id) => active().find((c) => c.id === id && c.role === "dependent" && c.accountUserId === account) ?? null,
    hasUpcomingAppointment: async (id) => upcoming.has(id),
    anonymize: async (id) => void Object.assign(customers.get(id)!, { anonymized: true, fullName: "Cliente dado de baja", birthday: null, nickname: null }),
  };
  const store: CustomersStore = { transaction: (fn) => fn(tx) };
  return { store, customers, devices, demo, attempts, phoneChanges, tx, upcoming };
}
