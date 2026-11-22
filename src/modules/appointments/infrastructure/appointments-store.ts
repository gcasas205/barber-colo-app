import { sql } from "kysely";
import type { Interval } from "@/modules/schedule";
import type { Database } from "@/shared/db/client";
import { guarded } from "@/shared/db/guarded";
import type { AppointmentStatus } from "../domain/policy";
import type {
  AgendaItem,
  Appointment,
  AppointmentsTx,
  BarberNotice,
} from "../application/ports";

const range = (i: Interval) =>
  sql<string>`tstzrange(${i.start}, ${i.end}, '[)')`;
const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
/** La restricción de exclusión frenó el turno (RF-12). */
const isOverlap = (e: unknown) => (e as { code?: string }).code === "23P01";

const ACTIVE = ["reserved", "confirmed"] as const;

type Row = {
  id: string;
  customer_id: string;
  service_id: number;
  service_name: string;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  price_cents: number;
  customer_reschedules: number;
  booked_at: Date;
};
const toAppointment = (r: Row): Appointment => ({
  id: r.id,
  customerId: r.customer_id,
  serviceId: String(r.service_id),
  serviceName: r.service_name,
  start: new Date(r.start),
  end: new Date(r.end),
  status: r.status,
  priceCents: r.price_cents,
  customerReschedules: r.customer_reschedules,
  bookedAt: new Date(r.booked_at),
});

/**
 * Turnos (spec 004). `db` es la transacción que abre `src/server/appointments.ts`. Lee clientes y servicios
 * solo para mostrar (nombre del servicio, datos del cliente en la agenda) y para bloquear la fila del cliente.
 */
export function createAppointmentsStore(db: Database): Omit<
  AppointmentsTx,
  "lockScheduleShared" | "slotContext" | "service"
> & {
  activeIntervals(r: Interval, exclude: string | null): Promise<Interval[]>;
  upcomingActive(now: Date): Promise<{ id: string; start: Date; end: Date; customerName: string; serviceName: string }[]>;
} {
  const base = () =>
    db
      .selectFrom("app.appointments as a")
      .innerJoin("app.services as s", "s.id", "a.service_id")
      .select([
        "a.id",
        "a.customer_id",
        "a.service_id",
        "s.name as service_name",
        sql<Date>`lower(a.period)`.as("start"),
        sql<Date>`upper(a.period)`.as("end"),
        "a.status",
        "a.price_cents",
        "a.customer_reschedules",
        "a.booked_at",
      ]);

  return {
    async activeIntervals(r, exclude) {
      let q = db
        .selectFrom("app.appointments")
        .select([
          sql<Date>`lower(period)`.as("start"),
          sql<Date>`upper(period)`.as("end"),
        ])
        .where("status", "in", ACTIVE)
        .where(sql<boolean>`period && ${range(r)}`);
      if (exclude && isUuid(exclude)) q = q.where("id", "<>", exclude);
      const rows = await q.execute();
      return rows.map((x) => ({
        start: new Date(x.start),
        end: new Date(x.end),
      }));
    },

    /** Spec 004, RF-27: turnos activos que todavía no terminaron, para avisar a Colo en Ajustes. */
    async upcomingActive(now) {
      const rows = await base()
        .innerJoin("app.customers as c", "c.id", "a.customer_id")
        .select("c.full_name")
        .where("a.status", "in", ACTIVE)
        .where(sql<boolean>`upper(a.period) > ${now}`)
        .orderBy(sql`lower(a.period)`)
        .execute();
      return rows.map((r) => ({ id: r.id, start: new Date(r.start), end: new Date(r.end), customerName: r.full_name, serviceName: r.service_name }));
    },

    async lockCustomer(customerId) {
      if (!isUuid(customerId)) return false;
      const row = await db
        .selectFrom("app.customers")
        .select("id")
        .where("id", "=", customerId)
        .where("anonymized_at", "is", null)
        .forUpdate()
        .executeTakeFirst();
      return !!row;
    },

    async upcomingFor(customerId, now) {
      if (!isUuid(customerId)) return null;
      const row = await base()
        .where("a.customer_id", "=", customerId)
        .where("a.status", "in", ACTIVE)
        .where(sql<boolean>`upper(a.period) > ${now}`)
        .orderBy(sql`lower(a.period)`)
        .executeTakeFirst();
      return row ? toAppointment(row as Row) : null;
    },

    async get(id) {
      if (!isUuid(id)) return null;
      const row = await base()
        .where("a.id", "=", id)
        .forUpdate("a")
        .executeTakeFirst();
      return row ? toAppointment(row as Row) : null;
    },

    async insert(a) {
      return guarded(
        db,
        async () => {
          const row = await db
            .insertInto("app.appointments")
            .values({
              customer_id: a.customerId,
              service_id: Number(a.serviceId),
              period: range(a.period),
              status: a.status,
              price_cents: a.priceCents,
              booked_at: a.bookedAt,
            })
            .returning("id")
            .executeTakeFirstOrThrow();
          return row.id;
        },
        (e) => (isOverlap(e) ? ("OVERLAP" as const) : undefined),
      );
    },

    async move(id, period, status, customerReschedules) {
      return guarded(
        db,
        async () => {
          await db
            .updateTable("app.appointments")
            .set({
              period: range(period),
              status,
              customer_reschedules: customerReschedules,
              updated_at: new Date(),
            })
            .where("id", "=", id)
            .execute();
          return "ok" as const;
        },
        (e) => (isOverlap(e) ? ("OVERLAP" as const) : undefined),
      );
    },

    async setStatus(id, status) {
      await db
        .updateTable("app.appointments")
        .set({ status, updated_at: new Date() })
        .where("id", "=", id)
        .execute();
    },

    async addEvent(e) {
      await db
        .insertInto("app.appointment_events")
        .values({
          appointment_id: e.appointmentId,
          at: e.at,
          actor: e.actor,
          actor_user_id: e.actorUserId,
          kind: e.kind,
          from_period: e.from ? range(e.from) : null,
          to_period: e.to ? range(e.to) : null,
          late: e.late,
          reason: e.reason,
        })
        .execute();
    },

    async unseenBarberNotice(customerId): Promise<BarberNotice | null> {
      if (!isUuid(customerId)) return null;
      const row = await db
        .selectFrom("app.appointment_events as e")
        .innerJoin("app.appointments as a", "a.id", "e.appointment_id")
        .innerJoin("app.services as s", "s.id", "a.service_id")
        .select([
          "e.id",
          "e.kind",
          "e.reason",
          "s.name as service_name",
          sql<Date>`lower(e.from_period)`.as("from_start"),
          sql<Date | null>`lower(e.to_period)`.as("to_start"),
        ])
        .where("a.customer_id", "=", customerId)
        .where("e.actor", "=", "barber")
        .where("e.kind", "in", ["cancelled", "rescheduled"])
        .where("e.seen_by_customer_at", "is", null)
        .orderBy("e.at", "desc")
        .executeTakeFirst();
      if (!row || row.kind === "booked") return null;
      return {
        eventId: String(row.id),
        kind: row.kind,
        serviceName: row.service_name,
        fromStart: new Date(row.from_start),
        toStart: row.to_start ? new Date(row.to_start) : null,
        reason: row.reason ?? "",
      };
    },

    async markNoticeSeen(eventId, customerId, at) {
      if (!/^\d{1,18}$/.test(eventId) || !isUuid(customerId)) return;
      // Solo los avisos de turnos del propio cliente.
      await db
        .updateTable("app.appointment_events")
        .set({ seen_by_customer_at: at })
        .where("id", "=", eventId)
        .where("appointment_id", "in", (eb) =>
          eb
            .selectFrom("app.appointments")
            .select("id")
            .where("customer_id", "=", customerId),
        )
        .execute();
    },

    async agenda(r): Promise<AgendaItem[]> {
      const rows = await base()
        .innerJoin("app.customers as c", "c.id", "a.customer_id")
        .select([
          "c.full_name",
          "c.nickname",
          "c.phone_e164",
          "c.role",
          (eb) =>
            eb
              .selectFrom("app.appointment_events as e")
              .select(sql<Date>`max(e.at)`.as("m"))
              .whereRef("e.appointment_id", "=", "a.id")
              .where("e.actor", "=", "customer")
              .where("e.kind", "in", ["booked", "rescheduled"])
              .as("last_customer_change_at"),
        ])
        .where(sql<boolean>`a.period && ${range(r)}`)
        .orderBy(sql`lower(a.period)`)
        .execute();
      return rows.map((x) => ({
        ...toAppointment(x as Row),
        customer: {
          name: x.full_name,
          nickname: x.nickname,
          phone: x.phone_e164,
          isGuest: x.role === "guest",
        },
        lastCustomerChangeAt: x.last_customer_change_at
          ? new Date(x.last_customer_change_at)
          : null,
      }));
    },

    async agendaSeenAt(userId) {
      const row = await db
        .selectFrom("app.agenda_views")
        .select("seen_at")
        .where("auth_user_id", "=", userId)
        .executeTakeFirst();
      return row ? new Date(row.seen_at) : null;
    },

    async setAgendaSeen(userId, at) {
      await db
        .insertInto("app.agenda_views")
        .values({ auth_user_id: userId, seen_at: at })
        .onConflict((oc) =>
          oc.column("auth_user_id").doUpdateSet({ seen_at: at }),
        )
        .execute();
    },
  };
}
