import type { Service } from "../domain/service";
import type { ServiceCatalog } from "./ports";

/** RF-1, RF-2: servicios que se pueden reservar, en orden. Los desactivados no aparecen (caso límite 12). */
export async function listServices(deps: { catalog: ServiceCatalog }): Promise<Service[]> {
  const services = await deps.catalog.listActive();
  return [...services].sort((a, b) => a.position - b.position);
}
