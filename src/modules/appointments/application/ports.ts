import type { Interval, ScheduleConfig, WeeklyRange } from "@/modules/schedule";
import type { LocalDate } from "@/shared/kernel";
import type { ActiveStatus, AppointmentStatus } from "../domain/policy";

export type Appointment = {
  id: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  start: Date;
  end: Date;
  status: AppointmentStatus;
  /** Precio congelado al reservar (RN-06b). */
  priceCents: number;
  customerReschedules: number;
  bookedAt: Date;
};

/** Lo último que hizo Colo con un turno del cliente y el cliente todavía no vio (RF-20). */
export type BarberNotice = {
  eventId: string;
  kind: "cancelled" | "rescheduled";
  serviceName: string;
  fromStart: Date;
  toStart: Date | null;
  reason: string;
};

/** Un turno en la agenda de Colo (RF-22). */
export type AgendaItem = Appointment & {
  customer: { name: string; nickname: string | null; phone: string | null; isGuest: boolean };
  /** Última reserva o reprogramación hecha por el cliente (para "Nuevo"). */
  lastCustomerChangeAt: Date | null;
};

export type ServiceInfo = { id: string; name: string; durationMinutes: number; priceCents: number; active: boolean };

export type AppointmentEvent = {
  appointmentId: string;
  at: Date;
  actor: "customer" | "barber";
  actorUserId: string;
  kind: "booked" | "cancelled" | "rescheduled";
  from: Interval | null;
  to: Interval | null;
  late: boolean;
  reason: string | null;
};

/** Lo que necesita Turnos de Agenda para recalcular los horarios libres en el servidor (RF-9). */
export type SlotContext = { ranges: WeeklyRange[]; config: ScheduleConfig; occupations: Interval[] };

/** Operaciones de turnos dentro de una transacción (clarificación 3 y 4). */
export interface AppointmentsTx {
  /** Bloquea la fila de ajustes en modo compartido: Ajustes espera a las reservas y viceversa. */
  lockScheduleShared(): Promise<void>;
  /** Bloquea la fila del cliente: dos pestañas del mismo cliente se ordenan. */
  lockCustomer(customerId: string): Promise<boolean>;
  /** Franjas, configuración y lapsos ocupados (bloqueos y turnos activos, menos `exclude`) en `range`. */
  slotContext(range: Interval, exclude: string | null): Promise<SlotContext>;
  service(id: string): Promise<ServiceInfo | null>;
  /** El turno activo del cliente que todavía no terminó, si hay. */
  upcomingFor(customerId: string, now: Date): Promise<Appointment | null>;
  /** Con la fila bloqueada. */
  get(id: string): Promise<Appointment | null>;
  /** "OVERLAP" si la restricción de exclusión de la base lo frenó (RF-12). */
  insert(a: { customerId: string; serviceId: string; period: Interval; status: ActiveStatus; priceCents: number; bookedAt: Date }): Promise<
    string | "OVERLAP"
  >;
  move(id: string, period: Interval, status: ActiveStatus, customerReschedules: number): Promise<"ok" | "OVERLAP">;
  setStatus(id: string, status: AppointmentStatus): Promise<void>;
  addEvent(e: AppointmentEvent): Promise<void>;
  unseenBarberNotice(customerId: string): Promise<BarberNotice | null>;
  markNoticeSeen(eventId: string, customerId: string, at: Date): Promise<void>;
  agenda(range: Interval): Promise<AgendaItem[]>;
  /** Cuándo vio Colo por última vez la agenda de cada día. */
  agendaSeen(userId: string): Promise<Map<LocalDate, Date>>;
  setAgendaSeen(userId: string, day: LocalDate, at: Date): Promise<void>;
}

export type AppointmentsDeps = { transaction<T>(fn: (tx: AppointmentsTx) => Promise<T>): Promise<T> };
