import "server-only";
import { getAvailability, getScheduleSnapshot, type AvailabilityQuery } from "@/modules/schedule";
import { listServices } from "@/modules/pricing";
import { createServiceCatalog } from "@/modules/pricing/infrastructure/service-repository";
import {
  createBlockOccupations,
  createScheduleRepository,
} from "@/modules/schedule/infrastructure/schedule-repository";
import { database, type Database } from "@/shared/db/client";

/** Arma los casos de uso con sus repositorios. Es el único lugar que conoce la infraestructura. */
export function queries(db: Database = database()) {
  const catalog = createServiceCatalog(db);
  const schedule = createScheduleRepository(db);
  const occupations = createBlockOccupations(db);
  return {
    listServices: () => listServices({ catalog }),
    contactWhatsapp: async () => (await schedule.settings()).contactWhatsapp,
    getAvailability: (query: AvailabilityQuery) => getAvailability({ schedule, occupations }, query),
    getScheduleSnapshot: (now: Date) => getScheduleSnapshot({ schedule, occupations }, now),
  };
}
