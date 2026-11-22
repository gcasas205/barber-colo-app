import { DEMO_ACCOUNTS, type Actor } from "@/modules/identity";
import { err, ok, type Result } from "@/shared/kernel";
import { normalizeArPhone, type PhoneE164 } from "../domain/phone";
import { claimPhone } from "../domain/phone-claim";
import { validateBirthday, validateName, type Birthday } from "../domain/profile";
import { PhoneConflictError, type CustomerListItem, type CustomerRow, type CustomersStore, type ListCursor } from "./ports";

type Field = "name" | "phone" | "birthday";
/** Errores por campo, para mostrarlos junto a cada uno (RNF-5), o un error del formulario. */
export type FormError = { fields: Partial<Record<Field, string>> } | { form: string };

const owned = (owner: CustomerRow | null, selfId: string | null) =>
  owner ? { kind: owner.role === "guest" ? ("guest" as const) : ("holder" as const), isSelf: owner.id === selfId } : null;

function validateContact(input: { name: string; phone: string }) {
  const fields: Partial<Record<Field, string>> = {};
  const name = validateName(input.name);
  if (!name.ok) fields.name = name.error;
  const phone = normalizeArPhone(input.phone);
  if (!phone.ok) fields.phone = phone.error;
  return { fields, name: name.ok ? name.value : "", phone: phone.ok ? phone.value : ("" as PhoneE164) };
}

/** RF-9 a RF-14: completar o editar el perfil de un cliente con cuenta. */
export async function saveProfile(
  deps: { store: CustomersStore },
  actor: Actor,
  input: { name: string; phone: string; birthday: Birthday | null },
): Promise<Result<{ merged: boolean }, "NOT_ALLOWED" | FormError>> {
  if (actor.kind !== "customer" || !actor.customerId) return err("NOT_ALLOWED");
  const customerId = actor.customerId;
  const { fields, name, phone } = validateContact(input);
  let birthday: Birthday | null = null;
  if (input.birthday) {
    const b = validateBirthday(input.birthday);
    if (b.ok) birthday = b.value;
    else fields.birthday = b.error;
  }
  if (Object.keys(fields).length > 0) return err({ fields });

  try {
    return await deps.store.transaction(async (tx) => {
      const me = await tx.getCustomer(customerId);
      if (!me || me.role !== "holder") return err("NOT_ALLOWED" as const);
      const previousPhone = me.phone; // antes de actualizar: no depender de si `me` es una copia
      const owner = await tx.lockPhoneOwner(phone);
      const claim = claimPhone("account", owned(owner, me.id));
      if (claim === "taken_by_account") return err({ fields: { phone: "PHONE_TAKEN" } });
      // RF-12: el invitado se une a la cuenta. Sus faltas la siguen; sus turnos futuros pasan a la
      // cuenta cuando existan los turnos (spec 004).
      if (claim === "guest_to_merge") await tx.linkGuest(owner!.id, me.id);
      // RF-25: los clientes de prueba conservan la marca "(demo)" aunque cambien el nombre.
      const fullName = me.isDemo && !name.endsWith("(demo)") ? `${name} (demo)` : name;
      await tx.updateProfile(me.id, { fullName, phone, birthday });
      if (previousPhone !== phone) {
        await tx.recordPhoneChange({ customerId: me.id, oldPhone: previousPhone, newPhone: phone, changedBy: actor.userId });
      }
      return ok({ merged: claim === "guest_to_merge" });
    });
  } catch (e) {
    if (e instanceof PhoneConflictError) return err({ fields: { phone: "PHONE_TAKEN" } }); // caso 5
    throw e;
  }
}

/** RF-18b: intentos de ingreso como invitado por conexión y por hora. */
export const GUEST_ATTEMPTS_PER_HOUR = 5;

/** Spec 004, RF-4: entrar como invitado con un toque. Solo se limita por conexión (RF-18b de la 002). */
export async function enterAsGuest(
  deps: { store: CustomersStore; createSession: () => Promise<string> },
  input: { ipHash: string; now: Date },
): Promise<Result<void, { form: "RATE_LIMITED" }>> {
  const allowed = await deps.store.transaction(async (tx) => {
    const recent = await tx.countGuestAttempts(input.ipHash, new Date(input.now.getTime() - 3_600_000));
    await tx.recordGuestAttempt(input.ipHash, input.now);
    return recent < GUEST_ATTEMPTS_PER_HOUR;
  });
  if (!allowed) return err({ form: "RATE_LIMITED" });
  await deps.createSession();
  return ok(undefined);
}

/**
 * Spec 004, RF-7 y RF-11: nombre y celular al reservar, si faltan. Un cliente con cuenta completa su perfil
 * (sin tocar el cumpleaños); un invitado sin datos crea su cliente, o es el mismo que ya usó ese celular
 * (RF-17 de la 002), y el dispositivo queda asociado.
 */
export async function saveContact(
  deps: { store: CustomersStore },
  actor: Actor,
  input: { name: string; phone: string },
): Promise<Result<{ customerId: string }, "NOT_ALLOWED" | FormError>> {
  if (actor.kind === "customer") {
    if (!actor.customerId) return err("NOT_ALLOWED");
    const id = actor.customerId;
    const me = await deps.store.transaction((tx) => tx.getCustomer(id));
    if (!me) return err("NOT_ALLOWED");
    const saved = await saveProfile(deps, actor, { ...input, birthday: me.birthday });
    return saved.ok ? ok({ customerId: id }) : saved;
  }
  if (actor.kind !== "guest") return err("NOT_ALLOWED");
  if (actor.customerId) return ok({ customerId: actor.customerId }); // ya cargó sus datos

  const { fields, name, phone } = validateContact(input);
  if (Object.keys(fields).length > 0) return err({ fields });
  try {
    return await deps.store.transaction(async (tx) => {
      const owner = await tx.lockPhoneOwner(phone);
      const claim = claimPhone("guest", owned(owner, null));
      if (claim === "taken_by_account") return err({ form: "PHONE_HAS_ACCOUNT" });
      const customerId = claim === "same_guest" ? owner!.id : await tx.createGuest({ fullName: name, phone });
      await tx.addGuestDevice(actor.userId, customerId);
      return ok({ customerId });
    });
  } catch (e) {
    if (e instanceof PhoneConflictError) return err({ form: "TRY_AGAIN" });
    throw e;
  }
}

/** RF-22, RF-23, RF-25: después de entrar con una cuenta de prueba, se asegura su lugar en la app. */
export async function enterAsDemo(
  deps: { store: CustomersStore; demoEnabled: boolean },
  input: { authUserId: string; email: string },
): Promise<Result<{ kind: "barber" } | { kind: "customer"; customerId: string }, "NOT_ALLOWED">> {
  const account = DEMO_ACCOUNTS.find((d) => d.email === input.email.trim().toLowerCase());
  if (!deps.demoEnabled || !account) return err("NOT_ALLOWED");
  return deps.store.transaction(async (tx) => {
    const existing = await tx.findDemoAccount(input.authUserId);
    if (account.kind === "barber") {
      if (!existing) await tx.saveDemoAccount(input.authUserId, "barber", null);
      return ok({ kind: "barber" as const });
    }
    const customerId = existing?.customerId ?? (await tx.createDemoHolder(input.authUserId, `${account.label} (demo)`));
    if (!existing) await tx.saveDemoAccount(input.authUserId, account.kind, customerId);
    return ok({ kind: "customer" as const, customerId });
  });
}

export const CUSTOMERS_PAGE = 50;

/** RF-19: lista de clientes para Colo, de a 50. */
export async function listCustomers(
  deps: { store: CustomersStore },
  actor: Actor,
  after: ListCursor | null,
): Promise<Result<{ items: CustomerListItem[]; next: ListCursor | null }, "NOT_ALLOWED">> {
  if (actor.kind !== "barber") return err("NOT_ALLOWED");
  const rows = await deps.store.transaction((tx) => tx.listCustomers(CUSTOMERS_PAGE + 1, after));
  const items = rows.slice(0, CUSTOMERS_PAGE);
  const last = items.at(-1);
  return ok({ items, next: rows.length > CUSTOMERS_PAGE && last ? { createdAt: last.createdAt, id: last.id } : null });
}

/** RF-20, RF-21: Colo pone, cambia o borra (vacío) el sobrenombre de un cliente. */
export async function setNickname(
  deps: { store: CustomersStore },
  actor: Actor,
  customerId: string,
  raw: string,
): Promise<Result<void, "NOT_ALLOWED" | "NICKNAME_LENGTH" | "NOT_FOUND">> {
  if (actor.kind !== "barber") return err("NOT_ALLOWED");
  const nickname = raw.trim().replace(/\s+/g, " ");
  if (Array.from(nickname).length > 40) return err("NICKNAME_LENGTH");
  const found = await deps.store.transaction((tx) => tx.setNickname(customerId, nickname || null));
  return found ? ok(undefined) : err("NOT_FOUND");
}

export type OwnProfile = {
  kind: "customer" | "guest";
  fullName: string;
  phone: string | null;
  birthday: Birthday | null;
  isDemo: boolean;
};

/** Datos del propio perfil, para la pantalla de perfil (RF-9, RF-13). Nunca incluye el sobrenombre (RF-21). */
export async function getOwnProfile(deps: { store: CustomersStore }, actor: Actor): Promise<OwnProfile | null> {
  if ((actor.kind !== "customer" && actor.kind !== "guest") || !actor.customerId) return null;
  const id = actor.customerId;
  const c = await deps.store.transaction((tx) => tx.getCustomer(id));
  if (!c) return null;
  return { kind: actor.kind, fullName: c.fullName, phone: c.phone, birthday: c.birthday, isDemo: c.isDemo };
}
