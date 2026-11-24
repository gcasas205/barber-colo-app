import type { Actor } from "@/modules/identity";
import { err, ok, type Result } from "@/shared/kernel";
import { moveService, validateService, type ServiceError } from "../domain/service";
import type { AdminService, ServiceAdminDeps, ServiceAdminTx, ServiceInput } from "./ports";

const NOT_ALLOWED = err("NOT_ALLOWED" as const);
const clean = (input: ServiceInput): ServiceInput => ({
  ...input,
  name: input.name.trim().replace(/\s+/g, " "),
  description: input.description.trim().replace(/\s+/g, " "),
});
const offered = (list: AdminService[]) => list.filter((s) => s.active);

/** RF-15. */
export async function listAllServices(deps: ServiceAdminDeps, actor: Actor): Promise<Result<AdminService[], "NOT_ALLOWED">> {
  if (actor.kind !== "barber") return NOT_ALLOWED;
  return deps.transaction(async ({ admin }) => ok(await admin.listAll()));
}

/** RF-16, RF-17: alta (sin id) o edición. El nuevo va al final de los que se ofrecen. */
export async function saveService(
  deps: ServiceAdminDeps,
  actor: Actor,
  id: string | null,
  raw: ServiceInput,
): Promise<Result<{ id: string }, "NOT_ALLOWED" | "NOT_FOUND" | ServiceError[]>> {
  if (actor.kind !== "barber") return NOT_ALLOWED;
  const input = clean(raw);
  return deps.transaction(async (tx) => {
    const step = await tx.currentStep();
    const list = await tx.admin.listAll();
    const existing = id ? list.find((s) => s.id === id) : undefined;
    if (id && !existing) return err("NOT_FOUND" as const);
    const rules = draftRules(existing, list, step);
    const valid = validateService(input, rules.step, rules.otherNames);
    if (!valid.ok) return valid;
    return existing ? editService(tx, actor.userId, existing.id, input) : addService(tx, actor.userId, list, input);
  });
}

/** Con qué paso y contra qué nombres se valida. Un servicio sacado no choca con nadie mientras siga sacado (caso 9). */
function draftRules(existing: AdminService | undefined, list: AdminService[], step: number) {
  if (existing?.active === false) return { step: 1, otherNames: [] };
  return { step, otherNames: offered(list).filter((s) => s.id !== existing?.id).map((s) => s.name) };
}

async function editService({ admin, audit }: ServiceAdminTx, userId: string, id: string, input: ServiceInput) {
  const result = await admin.update(id, input);
  if (result !== "ok") return result === "NAME_TAKEN" ? err(["NAME_TAKEN" as const]) : err("NOT_FOUND" as const);
  await audit.record({ area: "servicios", userId, detail: { edited: id, ...input } });
  return ok({ id });
}

async function addService({ admin, audit }: ServiceAdminTx, userId: string, list: AdminService[], input: ServiceInput) {
  const created = await admin.insert(input, offered(list).length + 1);
  if (created === "NAME_TAKEN") return err(["NAME_TAKEN" as const]);
  await audit.record({ area: "servicios", userId, detail: { added: created, ...input } });
  return ok({ id: created });
}

/** RF-18. */
export async function moveServiceOrder(
  deps: ServiceAdminDeps,
  actor: Actor,
  id: string,
  direction: "up" | "down",
): Promise<Result<void, "NOT_ALLOWED">> {
  if (actor.kind !== "barber") return NOT_ALLOWED;
  return deps.transaction(async ({ admin, audit, currentStep }) => {
    await currentStep(); // ordena los cambios de Ajustes entre sí
    const order = offered(await admin.listAll()).map((s) => s.id);
    const next = moveService(order, id, direction);
    if (next === order) return ok(undefined);
    await admin.setOrder(next);
    await audit.record({ area: "servicios", userId: actor.userId, detail: { order: next } });
    return ok(undefined);
  });
}

/** RF-19, RF-21: sacar el último que se ofrece pide confirmación. */
export async function deactivateService(
  deps: ServiceAdminDeps,
  actor: Actor,
  id: string,
  confirmLast: boolean,
): Promise<Result<void, "NOT_ALLOWED" | "NOT_FOUND" | "CONFIRM_LAST">> {
  if (actor.kind !== "barber") return NOT_ALLOWED;
  return deps.transaction(async ({ admin, audit, currentStep }) => {
    await currentStep();
    const list = await admin.listAll();
    const service = list.find((s) => s.id === id);
    if (!service) return err("NOT_FOUND" as const);
    if (!service.active) return ok(undefined);
    const rest = offered(list).filter((s) => s.id !== id);
    if (rest.length === 0 && !confirmLast) return err("CONFIRM_LAST" as const);
    await admin.setActive(id, false, null);
    await admin.setOrder(rest.map((s) => s.id));
    await audit.record({ area: "servicios", userId: actor.userId, detail: { deactivated: id } });
    return ok(undefined);
  });
}

/** RF-20: vuelve al final de los que se ofrecen, si su nombre y su duración siguen valiendo. */
export async function reactivateService(
  deps: ServiceAdminDeps,
  actor: Actor,
  id: string,
): Promise<Result<void, "NOT_ALLOWED" | "NOT_FOUND" | ServiceError[]>> {
  if (actor.kind !== "barber") return NOT_ALLOWED;
  return deps.transaction(async ({ admin, audit, currentStep }) => {
    const step = await currentStep();
    const list = await admin.listAll();
    const service = list.find((s) => s.id === id);
    if (!service) return err("NOT_FOUND" as const);
    if (service.active) return ok(undefined);
    const valid = validateService(service, step, offered(list).map((s) => s.name));
    if (!valid.ok) return valid;
    const result = await admin.setActive(id, true, offered(list).length + 1);
    if (result === "NAME_TAKEN") return err(["NAME_TAKEN" as const]);
    if (result === "NOT_FOUND") return err("NOT_FOUND" as const);
    await audit.record({ area: "servicios", userId: actor.userId, detail: { reactivated: id } });
    return ok(undefined);
  });
}
