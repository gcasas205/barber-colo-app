import "server-only";
import type { AppointmentsDeps } from "@/modules/appointments";
import { createAppointmentsStore } from "@/modules/appointments/infrastructure/appointments-store";
import { createServiceAdmin } from "@/modules/pricing/infrastructure/service-admin";
import { createBlockOccupations, createScheduleRepository } from "@/modules/schedule/infrastructure/schedule-repository";
import { database, type Database } from "@/shared/db/client";
import { sql } from "kysely";

/**
 * Turnos (spec 004). Cada caso de uso corre en una transacción; Agenda y Precios se leen con la misma
 * transacción para que el servidor recalcule los horarios libres con los datos del momento (RF-9).
 */
export function appointmentsDeps(db: Database = database()): AppointmentsDeps {
  return {
    transaction: (fn) =>
      db.transaction().execute((tx) => {
        const store = createAppointmentsStore(tx);
        const schedule = createScheduleRepository(tx);
        const blocks = createBlockOccupations(tx);
        const services = createServiceAdmin(tx);
        return fn({
          ...store,
          // Clarificación 4: compartido entre reservas, exclusivo contra Ajustes (que usa `for update`).
          lockScheduleShared: async () => {
            await sql`select 1 from app.schedule_settings where id = 1 for share`.execute(tx);
          },
          slotContext: async (range, exclude) => {
            const [settings, ranges, blocked, taken] = await Promise.all([
              schedule.settings(),
              schedule.weeklyRanges(),
              blocks.occupations(range),
              store.activeIntervals(range, exclude),
            ]);
            return { ranges, config: settings.config, occupations: [...blocked, ...taken] };
          },
          service: async (id) => {
            const s = (await services.listAll()).find((x) => x.id === id);
            return s ? { id: s.id, name: s.name, durationMinutes: s.durationMinutes, priceCents: s.priceCents, active: s.active } : null;
          },
        });
      }),
  };
}

/** Lapsos ocupados por turnos activos, para la foto de la agenda (sin quién: S-7). */
export function appointmentOccupations(db: Database = database()) {
  const store = createAppointmentsStore(db);
  return (range: { start: Date; end: Date }) => store.activeIntervals(range, null);
}
