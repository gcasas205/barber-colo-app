import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import type { Service } from "@/modules/pricing";
import { weekNotices, type Availability, type BlockNotice, type DayNotice, type Start } from "@/modules/schedule";
import {
  dayOfMonth,
  daysBetween,
  formatDayLong,
  formatDayShort,
  formatDuration,
  formatMinute,
  formatPesos,
  weekdayShort,
  type LocalDate,
} from "@/shared/kernel";
import { Plate } from "@/ui/Plate";
import { cx } from "@/ui/cx";
import { ContactLink } from "./ContactLink";

// En oscuro el esmalte queda cerca del fondo de las chapas: lo elegido suma un borde interior claro.
const SELECTED =
  "bg-esmalte text-sobre-esmalte shadow-[var(--shadow-chapa-control)] dark:ring-2 dark:ring-inset dark:ring-sobre-esmalte-suave";
const IDLE = "bg-chapa text-tinta shadow-[var(--shadow-chapa-clara)] hover:shadow-[inset_0_0_0_2px_var(--esmalte-200)]";
const FOCUS = "focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-poste";

/** Lo que puede hacer el visitante. El estado vive en BookingClient (RF-15: la dirección no cambia). */
export type BookingActions = {
  onService: (serviceId: string) => void;
  onDay: (day: LocalDate) => void;
  onWeek: (weekOf: LocalDate) => void;
};

export type BookingViewProps = {
  services: Service[];
  service: Service;
  availability: Availability;
  today: LocalDate;
  actions: BookingActions;
  /** Bloqueos con aviso para los clientes (spec 003, RF-14). */
  notices?: BlockNotice[];
};

/** Página pública de horarios libres (spec 001). Presentación pura: recibe todo calculado. */
export function BookingView({ services, service, availability, today, actions, notices = [] }: BookingViewProps) {
  const a = availability;
  return (
    <>
      <section aria-labelledby="titulo-servicio" className="flex flex-col gap-3">
        <h2 id="titulo-servicio" className="text-[20px] font-bold">
          Servicio
        </h2>
        <ul className="grid gap-2 sm:grid-cols-3">
          {services.map((s) => {
            const selected = s.id === service.id;
            return (
              <li key={s.id} className="flex">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => actions.onService(s.id)}
                  className={cx(
                    "flex min-h-[64px] w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-4 py-3 text-left sm:flex-col sm:items-start",
                    selected ? SELECTED : IDLE,
                    FOCUS,
                  )}
                >
                  <span className="flex flex-col">
                    <span className="text-[18px] font-bold">{s.name}</span>
                    <span className={cx("text-[15px]", selected ? "text-sobre-esmalte-suave" : "text-tinta-suave")}>
                      {s.description} · {formatDuration(s.durationMinutes)}
                    </span>
                  </span>
                  <span className="cifra shrink-0 text-[19px]">{formatPesos(s.priceCents)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {a.noRoomInWindow ? (
        <Plate className="flex flex-col items-start gap-3 p-5" aria-live="polite">
          <h2 className="text-[20px] font-bold">
            No hay lugar para {service.name.toLowerCase()} en los próximos {daysBetween(a.window.first, a.window.last)} días
          </h2>
          <p className="text-tinta-suave">Escribile a Colo y vemos si se puede hacer un hueco.</p>
          {[...new Set(notices.map((n) => n.text))].map((text) => (
            <p key={text} className="inline-flex items-center gap-2 font-bold">
              <Megaphone aria-hidden size={20} strokeWidth={2.5} /> Aviso de Colo: {text}
            </p>
          ))}
          <ContactLink number={a.contactWhatsapp} />
        </Plate>
      ) : (
        <>
          <WeekPicker availability={a} actions={actions} />
          <WeekNotices items={weekNotices(a.week.map((d) => d.date), notices)} />
          <DaySlots availability={a} service={service} today={today} actions={actions} />
        </>
      )}
    </>
  );
}

function WeekPicker({ availability: a, actions }: { availability: Availability; actions: BookingActions }) {
  const arrow = cx(
    "grid h-12 w-12 place-items-center rounded-[var(--radius-control)] bg-chapa text-tinta shadow-[var(--shadow-chapa-clara)]",
    FOCUS,
  );
  const disabledArrow = "grid h-12 w-12 place-items-center rounded-[var(--radius-control)] text-tinta-suave opacity-40";
  return (
    <section aria-labelledby="titulo-dia" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-dia" className="text-[20px] font-bold">
          Día
        </h2>
        <div className="flex gap-2">
          {a.previousWeek ? (
            <button type="button" onClick={() => actions.onWeek(a.previousWeek!)} aria-label="Semana anterior" className={arrow}>
              <ChevronLeft aria-hidden size={24} strokeWidth={2.5} />
            </button>
          ) : (
            <span aria-hidden className={disabledArrow}>
              <ChevronLeft size={24} strokeWidth={2.5} />
            </span>
          )}
          {a.nextWeek ? (
            <button type="button" onClick={() => actions.onWeek(a.nextWeek!)} aria-label="Semana siguiente" className={arrow}>
              <ChevronRight aria-hidden size={24} strokeWidth={2.5} />
            </button>
          ) : (
            <span aria-hidden className={disabledArrow}>
              <ChevronRight size={24} strokeWidth={2.5} />
            </span>
          )}
        </div>
      </div>
      <ul className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {a.week.map((d) => {
          const selected = d.date === a.day;
          const full = d.count === 0;
          const status = !d.inWindow ? "fuera de fecha" : full ? "sin lugar" : `${d.count} horarios libres`;
          const body = (
            <>
              <span className="letras-chapa text-[13px]">{weekdayShort(d.date)}</span>
              <span className="cifra text-[22px] leading-none sm:text-[26px]">{dayOfMonth(d.date)}</span>
              <span className={cx("text-[13px] font-bold leading-tight", selected ? "text-sobre-esmalte-suave" : "text-tinta-suave")}>
                {!d.inWindow ? "—" : full ? "Sin lugar" : `${d.count} libres`}
              </span>
            </>
          );
          const box = "flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-[var(--radius-chapa)] px-1 py-3 text-center";
          return (
            <li key={d.date} className="flex">
              {d.inWindow && (!full || selected) ? (
                <button
                  type="button"
                  onClick={() => actions.onDay(d.date)}
                  aria-pressed={selected}
                  aria-label={`${formatDayLong(d.date)}, ${status}`}
                  className={cx(box, "w-full", selected ? SELECTED : IDLE, FOCUS)}
                >
                  {body}
                </button>
              ) : (
                // RF-5: fuera de la ventana o sin lugar, no se puede elegir.
                <span
                  role="img"
                  aria-label={`${formatDayLong(d.date)}, ${status}`}
                  className={cx(box, "w-full text-tinta-suave", d.inWindow && "shadow-[inset_0_0_0_2px_var(--linea)]")}
                >
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** RF-14: los avisos de Colo para los días de la semana que se está viendo. */
function WeekNotices({ items }: { items: DayNotice[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Avisos de Colo" className="flex flex-col gap-2 rounded-[var(--radius-chapa)] bg-chapa px-4 py-3 shadow-[inset_0_0_0_2px_var(--linea)]">
      <h3 className="inline-flex items-center gap-2 text-[15px] font-bold">
        <Megaphone aria-hidden size={18} strokeWidth={2.5} /> Avisos de Colo
      </h3>
      <ul className="flex flex-col gap-1">
        {items.map((n) => (
          <li key={`${n.date}-${n.kind === "hours" ? n.from : "dia"}-${n.text}`} className="text-[15px]">
            <span className="font-bold">{capitalize(formatDayShort(n.date))}</span> ·{" "}
            {n.kind === "closed" ? `Cerrado: ${n.text}` : `${formatMinute(n.from)} a ${formatMinute(n.to)}: ${n.text}`}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Agrupa los inicios por franja, en orden (RF-7). */
function byRange(starts: Start[]) {
  const groups: { opensAt: number; closesAt: number; starts: Start[] }[] = [];
  for (const s of starts) {
    const last = groups.at(-1);
    if (last && last.opensAt === s.range.opensAt) last.starts.push(s);
    else groups.push({ ...s.range, starts: [s] });
  }
  return groups;
}

function DaySlots({
  availability: a,
  service,
  today,
  actions,
}: {
  availability: Availability;
  service: Service;
  today: LocalDate;
  actions: BookingActions;
}) {
  const dayName = a.day === today ? `Hoy, ${formatDayLong(a.day)}` : capitalize(formatDayLong(a.day));
  return (
    <section aria-labelledby="titulo-horarios" className="flex flex-col gap-4" aria-live="polite">
      <h2 id="titulo-horarios" className="text-[20px] font-bold">
        {dayName} · {service.name.toLowerCase()} de {formatDuration(service.durationMinutes)}
      </h2>
      {a.starts.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-tinta-suave">Ese día no hay lugar para {service.name.toLowerCase()}.</p>
          {a.nextDayWithRoom && (
            <button
              type="button"
              onClick={() => actions.onDay(a.nextDayWithRoom!)}
              className={cx("inline-flex min-h-[52px] items-center rounded-[var(--radius-control)] px-5 font-bold", SELECTED, FOCUS)}
            >
              Ver el {formatDayLong(a.nextDayWithRoom)}
            </button>
          )}
        </div>
      ) : (
        byRange(a.starts).map((g) => (
          <div key={g.opensAt} className="flex flex-col gap-2">
            <h3 className="text-[15px] font-bold text-tinta-suave">
              De {formatMinute(g.opensAt)} a {formatMinute(g.closesAt)}
            </h3>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
              {g.starts.map((s) => (
                <li
                  key={s.label}
                  className="cifra grid min-h-[56px] place-items-center rounded-[var(--radius-control)] bg-chapa text-[21px] text-tinta shadow-[var(--shadow-chapa-clara)]"
                >
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
