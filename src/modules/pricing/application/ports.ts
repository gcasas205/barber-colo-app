import type { Service } from "../domain/service";

/** Catálogo de servicios (docs/diseno/03-backend.md, puerto ServiceCatalog). */
export interface ServiceCatalog {
  /** Servicios activos, en el orden en que se muestran. */
  listActive(): Promise<Service[]>;
}

/** Servicio con su estado, para la lista de Ajustes (RF-15). */
export type AdminService = Service & { active: boolean };

/** Lo que Colo carga o edita de un servicio (RF-16). */
export type ServiceInput = {
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  countsForBenefits: boolean;
};

/** Escritura del catálogo. Vive dentro de una transacción (clarificación 6). */
export interface ServiceAdmin {
  /** Todos: primero los que se ofrecen por posición, después los sacados (RF-15). */
  listAll(): Promise<AdminService[]>;
  /** Devuelve el id, o "NAME_TAKEN" si lo frena el índice único de la base. */
  insert(input: ServiceInput, position: number): Promise<string | "NAME_TAKEN">;
  update(id: string, input: ServiceInput): Promise<"ok" | "NAME_TAKEN" | "NOT_FOUND">;
  setActive(id: string, active: boolean, position: number | null): Promise<"ok" | "NAME_TAKEN" | "NOT_FOUND">;
  /** Reescribe las posiciones 1, 2, 3… en ese orden (clarificación 9). */
  setOrder(ids: string[]): Promise<void>;
}

export interface ServicesAudit {
  record(change: { area: "servicios"; userId: string; detail: Record<string, unknown> }): Promise<void>;
}

export type ServiceAdminTx = {
  admin: ServiceAdmin;
  audit: ServicesAudit;
  /** Paso de la agenda (lo da Agenda), bloqueando la fila de ajustes hasta el fin de la transacción. */
  currentStep(): Promise<number>;
};
export type ServiceAdminDeps = { transaction<T>(fn: (tx: ServiceAdminTx) => Promise<T>): Promise<T> };
