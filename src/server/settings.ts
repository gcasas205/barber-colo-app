import "server-only";
import type { ServiceAdminDeps } from "@/modules/pricing";
import { createServiceAdmin } from "@/modules/pricing/infrastructure/service-admin";
import type { ScheduleAdminDeps, SettingsArea } from "@/modules/schedule";
import { createScheduleAdmin } from "@/modules/schedule/infrastructure/schedule-admin";
import { database, type Database } from "@/shared/db/client";

/** RF-27: una tabla de auditoría para los dos módulos. */
function settingsAudit(db: Database) {
  return {
    async record(change: { area: SettingsArea; userId: string; detail: Record<string, unknown> }) {
      await db
        .insertInto("app.settings_changes")
        .values({ area: change.area, changed_by: change.userId, detail: JSON.stringify(change.detail) })
        .execute();
    },
  };
}

/**
 * Cada caso de uso de Ajustes corre en una transacción que empieza bloqueando la fila de ajustes
 * (clarificación 6): dos cambios a la vez (paso y servicios, dos pestañas) se ordenan y cada uno valida
 * con los valores del momento.
 */
export function scheduleAdminDeps(db: Database = database()): ScheduleAdminDeps {
  return {
    transaction: (fn) =>
      db.transaction().execute((tx) => {
        const services = createServiceAdmin(tx);
        return fn({
          admin: createScheduleAdmin(tx),
          audit: settingsAudit(tx),
          activeServices: async () =>
            (await services.listAll()).filter((s) => s.active).map((s) => ({ name: s.name, durationMinutes: s.durationMinutes })),
        });
      }),
  };
}

export function serviceAdminDeps(db: Database = database()): ServiceAdminDeps {
  return {
    transaction: (fn) =>
      db.transaction().execute((tx) => {
        const schedule = createScheduleAdmin(tx);
        return fn({
          admin: createServiceAdmin(tx),
          audit: settingsAudit(tx),
          currentStep: async () => (await schedule.lockSettings()).config.stepMinutes,
        });
      }),
  };
}
