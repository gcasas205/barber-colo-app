import type { Service } from "../domain/service";

/** Catálogo de servicios (docs/diseno/03-backend.md, puerto ServiceCatalog). */
export interface ServiceCatalog {
  /** Servicios activos, en el orden en que se muestran. */
  listActive(): Promise<Service[]>;
}
