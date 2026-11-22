"use client";

import { CalendarCheck2, CalendarClock, CalendarPlus, CircleCheck, Clock3, Megaphone, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { APPOINTMENT_POLICY, changeTiming } from "@/modules/appointments";
import { formatDayLong, formatDayShort, formatPesos, localDateOf, serverClock } from "@/shared/kernel";
import { Button } from "@/ui/Button";
import { Plate } from "@/ui/Plate";
import { cap, hour, of, TURNO_MESSAGES, turnosError, when } from "../_reservar/turno-text";
import { FormAlert } from "../_sesion/FormBits";
import { cancelAction, dismissNoticeAction, type TurnoResult } from "./actions";
import type { TurnoView } from "./turno-view";

const TICK_MS = 30_000;

export type NoticeView = {
  eventId: string;
  kind: "cancelled" | "rescheduled";
  serviceName: string;
  fromStart: number;
  toStart: number | null;
  reason: string;
  /** Spec 004b, RF-14: de quién era el turno. */
  customerName: string;
  isSelf: boolean;
};
/** Las personas de la cuenta, para mostrar a quien no tiene turno (spec 004c, RF-7). */
export type Person = { customerId: string; name: string; isSelf: boolean };
/** Lo que se acaba de hacer en Reservar (RF-12, RF-13): Inicio arma el mensaje con sus propios datos. */
export type Done = { kind: "reserva" | "cambio"; turnoId: string } | null;

const RESERVAR =
  "inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-poste px-5 text-[18px] font-bold text-white shadow-[0_8px_16px_-10px_rgb(184_38_47/0.8)] transition-transform hover:bg-poste-oscuro active:scale-[0.98] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-poste lg:max-w-md";

/**
 * Spec 004c, RF-5 a RF-8: Inicio del cliente, como el prototipo. Saludo, aviso de Colo, una chapa por turno de la
 * cuenta (con cambiar y cancelar, reglas de la 004), las personas sin turno y "Reservar turno".
 */
export function InicioClient({
  name,
  turnos,
  people,
  notice,
  done,
  serverNow,
}: {
  name: string | null;
  turnos: TurnoView[];
  people: Person[];
  notice: NoticeView | null;
  done: Done;
  serverNow: number;
}) {
  const [nowMs, setNowMs] = useState(serverNow);
  useEffect(() => {
    const now = serverClock(serverNow);
    const id = setInterval(() => setNowMs(now().getTime()), TICK_MS);
    return () => clearInterval(id);
  }, [serverNow]);
  const now = useMemo(() => new Date(nowMs), [nowMs]);

  // RNF-1 de la 004: al cancelar, se ve enseguida; la pantalla se actualiza de fondo y, cuando llegan los turnos
  // nuevos del servidor (otro arreglo), mandan esos.
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [override, setOverride] = useState<{ base: TurnoView[]; turnos: TurnoView[] } | null>(null);
  const current = override && override.base === turnos ? override.turnos : turnos;
  const [message, setMessage] = useState<string | null>(null);
  // Next reusa la pantalla de Inicio ya abierta: el mensaje se arma cada vez que llega uno nuevo de Reservar.
  const doneKey = done ? `${done.kind}:${done.turnoId}` : null;
  const [shownDone, setShownDone] = useState<string | null>(null);
  if (doneKey && doneKey !== shownDone) {
    setShownDone(doneKey);
    setMessage(doneText(done, turnos));
  }
  // El mensaje de Reservar vive en la dirección: se limpia para que no vuelva a salir al recargar.
  useEffect(() => {
    if (done) window.history.replaceState(null, "", "/turnos");
  }, [done]);

  const busy = new Set(current.map((t) => t.customerId));
  const free = people.filter((p) => !busy.has(p.customerId));
  const several = people.length > 1;

  return (
    <div className="flex flex-col gap-7">
      <h1 className="text-[28px] font-bold leading-tight">{name ? `Hola, ${name}` : "Hola"}</h1>
      {message ? (
        <p role="status" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-ok-fondo px-4 py-3 font-bold text-ok">
          <CircleCheck aria-hidden size={20} strokeWidth={2.5} /> {message}
        </p>
      ) : null}
      {notice ? <BarberNotice notice={notice} /> : null}

      <div className="grid gap-7 lg:grid-cols-2 lg:items-start">
        {current.length === 0 && !several ? (
          <Plate className="p-5">
            <p className="text-[17px]">No tenés turnos reservados.</p>
          </Plate>
        ) : null}
        {current.map((t) => (
          <TurnoCard
            key={t.id + t.start}
            turno={t}
            now={now}
            title={t.isSelf ? "Tu próximo turno" : `Turno de ${t.customerName}`}
            onCancelled={(text) => {
              setOverride({ base: turnos, turnos: current.filter((x) => x.id !== t.id) });
              setMessage(text);
              startRefresh(() => router.refresh());
            }}
          />
        ))}
        {several
          ? free.map((p) => (
              <section key={p.customerId} aria-label={p.isSelf ? "Vos" : p.name} className="flex flex-col gap-3">
                <h2 className="text-[20px] font-bold">{p.isSelf ? "Vos" : p.name}</h2>
                <Plate className="p-5">
                  <p className="text-tinta-suave">Sin turno reservado.</p>
                </Plate>
              </section>
            ))
          : null}
      </div>

      {free.length > 0 ? (
        <Link href="/reservar" className={RESERVAR}>
          <CalendarPlus aria-hidden size={22} strokeWidth={2.5} /> Reservar turno
        </Link>
      ) : null}
    </div>
  );
}

function doneText(done: Done, turnos: TurnoView[]): string | null {
  if (!done) return null;
  const t = turnos.find((x) => x.id === done.turnoId);
  if (done.kind === "cambio") return t ? `Listo: ${of(t)} pasó al ${when(t.start).toLowerCase()}.` : "Listo: cambiaste el horario.";
  return t && !t.isSelf ? `¡Listo! Reservaste el turno de ${t.customerName}.` : "¡Listo! Reservaste tu turno.";
}

/** RF-20 de la 004: lo que hizo Colo, hasta que el cliente lo cierra. */
function BarberNotice({ notice }: { notice: NoticeView }) {
  const [pending, run] = useTransition();
  return (
    <Plate className="flex flex-col items-start gap-3 p-5 shadow-[inset_0_0_0_2px_var(--alerta)]" role="alert">
      <p className="inline-flex items-start gap-2 text-[18px] font-bold">
        <Megaphone aria-hidden size={22} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alerta" />
        {notice.kind === "cancelled"
          ? `Colo canceló ${of(notice)} de ${notice.serviceName} del ${formatDayLong(localDateOf(new Date(notice.fromStart)))} a las ${hour(notice.fromStart)}.`
          : `Colo pasó ${of(notice)} de ${notice.serviceName} al ${formatDayLong(localDateOf(new Date(notice.toStart!)))} a las ${hour(notice.toStart!)}.`}
      </p>
      <p>
        <span className="font-bold">Motivo:</span> {notice.reason}
      </p>
      <Button variant="secundario" disabled={pending} onClick={() => run(() => dismissNoticeAction(notice.eventId))}>
        Entendido
      </Button>
    </Plate>
  );
}

/** RF-6 (y RF-13 a RF-19 de la 004): la chapa del turno, con cambiar de horario y cancelar. */
function TurnoCard({ turno, now, title, onCancelled }: { turno: TurnoView; now: Date; title: string; onCancelled: (text: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [lateAsked, setLateAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = useTransition();
  const timing = changeTiming({ start: new Date(turno.start), bookedAt: new Date(turno.bookedAt) }, now);
  const late = lateAsked || timing === "late";
  const started = timing === "started";
  const limit = turno.customerReschedules >= APPOINTMENT_POLICY.maxCustomerReschedules;
  const day = localDateOf(new Date(turno.start));

  function cancel() {
    run(async () => {
      const r: TurnoResult = await cancelAction(turno.id, late);
      const what = of(turno);
      if (r.ok) return onCancelled(r.late ? `Cancelaste ${what}. Quedó registrado como cancelación tarde.` : `Cancelaste ${what}.`);
      if (r.confirmLate) return setLateAsked(true);
      setError(turnosError(r.error));
    });
  }

  return (
    <article aria-label={title} className="flex flex-col gap-3">
      <Plate tone="esmalte" className="flex flex-col gap-3 p-5">
        <p className="text-[16px] font-bold text-sobre-esmalte-suave">{title}</p>
        <p className="cifra text-[34px] leading-tight">
          {cap(formatDayShort(day))} · {hour(turno.start)}
        </p>
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-[rgb(243_245_244/0.14)] px-3 py-1 text-[15px] font-bold">
          {turno.status === "confirmed" ? (
            <>
              <CalendarCheck2 aria-hidden size={18} strokeWidth={2.5} /> Confirmado
            </>
          ) : (
            <>
              <Clock3 aria-hidden size={18} strokeWidth={2.5} /> Reservado
            </>
          )}
        </p>
        <p className="text-sobre-esmalte-suave">
          {turno.serviceName} · {hour(turno.start)} a {hour(turno.end)} · <span className="cifra text-sobre-esmalte">{formatPesos(turno.priceCents)}</span>
        </p>
        {started ? (
          <p className="text-sobre-esmalte-suave">{TURNO_MESSAGES.STARTED}</p>
        ) : !confirming ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            {limit ? (
              <p className="text-[15px] text-sobre-esmalte-suave">{TURNO_MESSAGES.RESCHEDULE_LIMIT}</p>
            ) : (
              <Link
                href={`/reservar?cambiar=${encodeURIComponent(turno.id)}`}
                className="inline-flex min-h-[52px] items-center gap-2 rounded-[var(--radius-control)] bg-chapa px-5 font-bold text-tinta shadow-[var(--shadow-chapa-control)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste"
              >
                <CalendarClock aria-hidden size={20} strokeWidth={2.5} /> Cambiar horario
              </Link>
            )}
            <button
              type="button"
              onClick={() => (setError(null), setConfirming(true))}
              className="min-h-[48px] px-1 font-bold underline decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste"
            >
              Cancelar turno
            </button>
          </div>
        ) : null}
      </Plate>

      {error ? <FormAlert title="No se pudo">{error}</FormAlert> : null}
      {confirming && !started ? (
        <div role="alert" className="flex flex-col gap-3 rounded-[var(--radius-control)] bg-alerta-fondo p-4 shadow-[inset_0_0_0_2px_var(--alerta)]">
          <p className="inline-flex items-start gap-2 font-bold">
            <TriangleAlert aria-hidden size={20} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alerta" />
            {late
              ? `Faltan menos de ${APPOINTMENT_POLICY.lateThresholdMinutes / 60} horas: va a quedar registrado como cancelación tarde. ¿Cancelás igual?`
              : "¿Cancelás el turno? El horario queda libre para otra persona."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="esmalte" disabled={pending} onClick={cancel}>
              {pending ? "Cancelando…" : "Sí, cancelar"}
            </Button>
            <Button variant="secundario" disabled={pending} onClick={() => setConfirming(false)}>
              No, mantenerlo
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
