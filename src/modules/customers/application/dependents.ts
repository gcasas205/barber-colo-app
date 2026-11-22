import type { Actor } from "@/modules/identity";
import { err, ok, type Result } from "@/shared/kernel";
import { DEPENDENTS_LIMIT, validateDependent, withDemoMark, type DependentErrors, type DependentInput } from "../domain/dependent";
import type { Birthday } from "../domain/profile";
import type { CustomersStore, CustomersTx } from "./ports";

export type DependentView = { id: string; name: string; birthday: Birthday | null };
type Deps = { store: CustomersStore };
const NOT_ALLOWED = err("NOT_ALLOWED" as const);

/** Solo un cliente con cuenta (titular) tiene personas a cargo (respuesta de Gonzalo del 2026-11-22). */
const accountOf = (actor: Actor) => (actor.kind === "customer" && actor.customerId ? actor.userId : null);
const view = (r: { id: string; fullName: string; birthday: Birthday | null }): DependentView => ({ id: r.id, name: r.fullName, birthday: r.birthday });

/** La persona a cargo `id`, si es de esta cuenta (RF-7). */
async function ownDependent(tx: CustomersTx, account: string, id: string) {
  return (await tx.listDependents(account)).find((d) => d.id === id) ?? null;
}

/** RF-1. */
export async function listDependents(deps: Deps, actor: Actor): Promise<DependentView[]> {
  const account = accountOf(actor);
  if (!account) return [];
  return deps.store.transaction(async (tx) => (await tx.listDependents(account)).map(view));
}

/** RF-2, RF-3, RNF-1: se bloquea la fila del titular, así dos pedidos a la vez no pasan de 5. */
export async function addDependent(
  deps: Deps,
  actor: Actor,
  input: DependentInput,
): Promise<Result<DependentView, "NOT_ALLOWED" | "LIMIT" | { fields: DependentErrors }>> {
  const account = accountOf(actor);
  if (!account) return NOT_ALLOWED;
  const valid = validateDependent(input);
  if (!valid.ok) return err({ fields: valid.error });
  return deps.store.transaction(async (tx) => {
    const holder = await tx.lockHolder(account);
    if (!holder) return NOT_ALLOWED;
    if ((await tx.listDependents(account)).length >= DEPENDENTS_LIMIT) return err("LIMIT" as const);
    const fullName = withDemoMark(valid.value.name, holder.isDemo);
    const id = await tx.createDependent({ accountUserId: account, fullName, birthday: valid.value.birthday, isDemo: holder.isDemo });
    return ok({ id, name: fullName, birthday: valid.value.birthday });
  });
}

/** RF-4. */
export async function updateDependent(
  deps: Deps,
  actor: Actor,
  id: string,
  input: DependentInput,
): Promise<Result<DependentView, "NOT_ALLOWED" | { fields: DependentErrors }>> {
  const account = accountOf(actor);
  if (!account) return NOT_ALLOWED;
  const valid = validateDependent(input);
  if (!valid.ok) return err({ fields: valid.error });
  return deps.store.transaction(async (tx) => {
    const current = await ownDependent(tx, account, id);
    if (!current) return NOT_ALLOWED;
    const fullName = withDemoMark(valid.value.name, current.isDemo);
    await tx.updateDependent(id, { fullName, birthday: valid.value.birthday });
    return ok({ id, name: fullName, birthday: valid.value.birthday });
  });
}

/** RF-5, RF-6: no se quita a quien tiene un turno futuro activo (se mira en la misma transacción). */
export async function removeDependent(
  deps: Deps,
  actor: Actor,
  id: string,
  now: Date,
): Promise<Result<void, "NOT_ALLOWED" | "HAS_UPCOMING">> {
  const account = accountOf(actor);
  if (!account) return NOT_ALLOWED;
  return deps.store.transaction(async (tx) => {
    if (!(await tx.lockDependent(account, id))) return NOT_ALLOWED;
    if (await tx.hasUpcomingAppointment(id, now)) return err("HAS_UPCOMING" as const);
    await tx.anonymize(id);
    return ok(undefined);
  });
}
