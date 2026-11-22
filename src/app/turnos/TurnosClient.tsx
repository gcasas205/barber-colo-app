"use client";

import { CalendarCheck2, CalendarClock, CircleCheck, Clock3, Megaphone, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { APPOINTMENT_POLICY, changeTiming } from "@/modules/appointments";
import type { Service } from "@/modules/pricing";
import { computeAvailability, snapshotInput, type ScheduleSnapshot } from "@/modules/schedule";
import { formatDayLong, formatMinute, formatPesos, localDateOf, minuteOfDayOf, serverClock, type LocalDate } from "@/shared/kernel";
import { Button } from "@/ui/Button";
import { Field, TextInput } from "@/ui/Field";
import { Plate } from "@/ui/Plate";
import { BookingView } from "../_reservar/BookingView";
import { FieldError, FormAlert } from "../_sesion/FormBits";
import { errorText } from "../_sesion/messages";
import { bookAction, cancelAction, dismissNoticeAction, rescheduleAction, type TurnoResult } from "./actions";
import type { TurnoView } from "./turno-view";

const TICK_MS = 30_000;

export type MyTurno = TurnoView;
export type NoticeView = { eventId: string; kind: "cancelled" | "rescheduled"; serviceName: string; fromStart: number; toStart: number | null; reason: string };
export type ContactNeeds = { needed: boolean; name: string; phone: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "Miércoles 25 de noviembre, 16:00". */
export const when = (ms: number) => `${cap(formatDayLong(localDateOf(new Date(ms))))}, ${formatMinute(minuteOfDayOf(new Date(ms)))}`;
const hour = (ms: number) => formatMinute(minuteOfDayOf(new Date(ms)));

/** Textos de los errores de Turnos (RNF-5). */
const MESSAGES: Record<string, string> = {
  SLOT_TAKEN: "Ese horario se acaba de ocupar. Elegí otro.",
  HAS_UPCOMING: "Ya tenés un turno reservado. Para sacar otro, primero cancelá el que tenés.",
  SERVICE_UNAVAILABLE: "Ese servicio ya no se ofrece. Elegí otro.",
  RESCHEDULE_LIMIT: `Ya cambiaste este turno ${APPOINTMENT_POLICY.maxCustomerReschedules} veces. Podés cancelarlo y reservar de nuevo.`,
  STARTED: "El turno ya empezó: no se puede cambiar desde la app. Escribile a Colo.",
  NOT_FOUND: "Ese turno ya no está activo.",
  PHONE_HAS_ACCOUNT: "Ese celular ya tiene una cuenta. Ingresá con ella para reservar.",
};
const turnosError = (code: string) => MESSAGES[code] ?? errorText(code) ?? errorText("TRY_AGAIN")!;

/**
 * Pantalla de turnos (spec 004). Como la página de horarios de la 001, calcula en el dispositivo con la foto
 * de la agenda; reservar, cancelar y reprogramar van al servidor, que decide con su propia hora (caso 16).
 */
export function TurnosClient({
  services,
  snapshot,
  turno,
  notice,
  contact,
}: {
  services: Service[];
  snapshot: ScheduleSnapshot;
  turno: MyTurno | null;
  notice: NoticeView | null;
  contact: ContactNeeds;
}) {
  const [nowMs, setNowMs] = useState(snapshot.serverNow);
  useEffect(() => {
    const now = serverClock(snapshot.serverNow);
    const id = setInterval(() => setNowMs(now().getTime()), TICK_MS);
    return () => clearInterval(id);
  }, [snapshot.serverNow]);
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const [rescheduling, setRescheduling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // RNF-1: el resultado de la acción se muestra enseguida; la pantalla se actualiza de fondo y, cuando llega
  // el turno nuevo del servidor (otro objeto), manda ese.
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [override, setOverride] = useState<{ base: MyTurno | null; turno: MyTurno | null } | null>(null);
  const current = override && override.base === turno ? override.turno : turno;
  const settle = (next: MyTurno | null, text: string) => {
    setOverride({ base: turno, turno: next });
    setRescheduling(false);
    setMessage(text);
    startRefresh(() => router.refresh());
  };

  return (
    <div className="flex flex-col gap-7">
      {message ? (
        <p role="status" className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-ok-fondo px-4 py-3 font-bold text-ok">
          <CircleCheck aria-hidden size={20} strokeWidth={2.5} /> {message}
        </p>
      ) : null}
      {notice ? <BarberNotice notice={notice} /> : null}
      {current && !rescheduling ? (
        <TurnoCard
          key={current.id + current.start}
          turno={current}
          now={now}
          onReschedule={() => (setMessage(null), setRescheduling(true))}
          onDone={(text) => settle(null, text)}
        />
      ) : (
        <Picker
          key={current && rescheduling ? `re-${current.id}` : "book"}
          services={services}
          snapshot={snapshot}
          now={now}
          turno={rescheduling ? current : null}
          contact={contact}
          onCancel={() => setRescheduling(false)}
          onDone={(text, next) => settle(next, text)}
        />
      )}
    </div>
  );
}

/** RF-20: lo que hizo Colo, hasta que el cliente lo cierra. */
function BarberNotice({ notice }: { notice: NoticeView }) {
  const [pending, run] = useTransition();
  return (
    <Plate className="flex flex-col items-start gap-3 p-5 shadow-[inset_0_0_0_2px_var(--alerta)]" role="alert">
      <p className="inline-flex items-start gap-2 text-[18px] font-bold">
        <Megaphone aria-hidden size={22} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alerta" />
        {notice.kind === "cancelled"
          ? `Colo canceló tu turno de ${notice.serviceName} del ${formatDayLong(localDateOf(new Date(notice.fromStart)))} a las ${hour(notice.fromStart)}.`
          : `Colo pasó tu turno de ${notice.serviceName} al ${formatDayLong(localDateOf(new Date(notice.toStart!)))} a las ${hour(notice.toStart!)}.`}
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

/** RF-13 a RF-15, RF-18, RF-19: "Tu turno", con cancelar y cambiar de horario. */
function TurnoCard({ turno, now, onReschedule, onDone }: { turno: MyTurno; now: Date; onReschedule: () => void; onDone: (text: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [lateAsked, setLateAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, run] = useTransition();
  const timing = changeTiming({ start: new Date(turno.start), bookedAt: new Date(turno.bookedAt) }, now);
  const late = lateAsked || timing === "late";
  const started = timing === "started";
  const limit = turno.customerReschedules >= APPOINTMENT_POLICY.maxCustomerReschedules;

  function cancel() {
    run(async () => {
      const r: TurnoResult = await cancelAction(turno.id, late);
      if (r.ok) return onDone(r.late ? "Cancelaste tu turno. Quedó registrado como cancelación tarde." : "Cancelaste tu turno.");
      if (r.confirmLate) return setLateAsked(true);
      setError(turnosError(r.error));
    });
  }

  return (
    <section aria-labelledby="titulo-tu-turno" className="flex flex-col gap-3">
      <h1 id="titulo-tu-turno" className="text-[28px] font-bold leading-tight">
        Tu turno
      </h1>
      <Plate tone="esmalte" className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[22px] font-bold">{turno.serviceName}</p>
            <p className="text-[18px]">{cap(formatDayLong(localDateOf(new Date(turno.start))))}</p>
            <p className="cifra text-[24px]">
              {hour(turno.start)} a {hour(turno.end)}
            </p>
          </div>
          <p className="cifra shrink-0 text-[22px]">{formatPesos(turno.priceCents)}</p>
        </div>
        <p className="inline-flex items-center gap-2 font-bold text-sobre-esmalte-suave">
          {turno.status === "confirmed" ? (
            <>
              <CalendarCheck2 aria-hidden size={20} strokeWidth={2.5} /> Confirmado
            </>
          ) : (
            <>
              <Clock3 aria-hidden size={20} strokeWidth={2.5} /> Reservado
            </>
          )}
        </p>
      </Plate>

      {error ? <FormAlert title="No se pudo">{error}</FormAlert> : null}
      {started ? (
        <p className="text-tinta-suave">{MESSAGES.STARTED}</p>
      ) : confirming ? (
        <div role="alert" className="flex flex-col gap-3 rounded-[var(--radius-control)] bg-alerta-fondo p-4 shadow-[inset_0_0_0_2px_var(--alerta)]">
          <p className="inline-flex items-start gap-2 font-bold">
            <TriangleAlert aria-hidden size={20} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alerta" />
            {late
              ? `Faltan menos de ${APPOINTMENT_POLICY.lateThresholdMinutes / 60} horas: va a quedar registrado como cancelación tarde. ¿Cancelás igual?`
              : "¿Cancelás el turno? El horario queda libre para otra persona."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="principal" disabled={pending} onClick={cancel}>
              {pending ? "Cancelando…" : "Sí, cancelar"}
            </Button>
            <Button variant="secundario" disabled={pending} onClick={() => setConfirming(false)}>
              No, mantenerlo
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="esmalte" disabled={limit} onClick={onReschedule}>
              <CalendarClock aria-hidden size={20} strokeWidth={2.5} /> Cambiar horario
            </Button>
            <Button variant="secundario" onClick={() => (setError(null), setConfirming(true))}>
              Cancelar turno
            </Button>
          </div>
          {limit ? <p className="text-[15px] text-tinta-suave">{MESSAGES.RESCHEDULE_LIMIT}</p> : null}
        </div>
      )}
    </section>
  );
}

/** RF-6 a RF-12 (reservar) y RF-16, RF-17 (elegir el horario nuevo). */
function Picker({
  services,
  snapshot,
  now,
  turno,
  contact,
  onCancel,
  onDone,
}: {
  services: Service[];
  snapshot: ScheduleSnapshot;
  now: Date;
  turno: MyTurno | null;
  contact: ContactNeeds;
  onCancel: () => void;
  onDone: (text: string, turno: MyTurno | null) => void;
}) {
  const rescheduling = !!turno;
  const [serviceId, setServiceId] = useState(turno?.serviceId ?? services[0]!.id);
  const [selection, setSelection] = useState<{ day: LocalDate | null; weekOf: LocalDate | null }>({
    day: turno ? localDateOf(new Date(turno.start)) : null,
    weekOf: null,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  // Al reprogramar, el horario propio cuenta como libre (caso 6) y el servicio no cambia.
  const service = rescheduling
    ? (services.find((s) => s.id === turno.serviceId) ?? {
        id: turno.serviceId,
        slug: "",
        name: turno.serviceName,
        description: "",
        durationMinutes: Math.round((turno.end - turno.start) / 60_000),
        priceCents: turno.priceCents,
        countsForBenefits: false,
        position: 0,
      })
    : (services.find((s) => s.id === serviceId) ?? services[0]!);
  const own = useMemo(
    () => (turno ? { ...snapshot, occupations: snapshot.occupations.filter(([s, e]) => !(s === turno.start && e === turno.end)) } : snapshot),
    [snapshot, turno],
  );
  const availability = useMemo(
    () => computeAvailability(snapshotInput(own, service.durationMinutes, now), selection, snapshot.contactWhatsapp),
    [own, service.durationMinutes, now, selection, snapshot.contactWhatsapp],
  );

  useEffect(() => {
    if (selected) confirmRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  return (
    <section aria-labelledby="titulo-reservar" className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 id="titulo-reservar" className="text-[28px] font-bold leading-tight">
          {rescheduling ? "Elegí el horario nuevo" : "Reservá tu turno"}
        </h1>
        {rescheduling ? (
          <Button variant="texto" className="self-start" onClick={onCancel}>
            Volver a mi turno
          </Button>
        ) : (
          <p className="text-tinta-suave">Elegí el servicio, el día y el horario.</p>
        )}
      </div>
      <BookingView
        services={services}
        service={service}
        availability={availability}
        today={localDateOf(now)}
        notices={snapshot.notices}
        selectedStart={selected}
        serviceLocked={rescheduling}
        actions={{
          onService: (id) => (setServiceId(id), setSelected(null)),
          onDay: (day) => (setSelection({ day, weekOf: null }), setSelected(null)),
          onWeek: (weekOf) => (setSelection({ day: null, weekOf }), setSelected(null)),
          onStart: (start) => setSelected(start.getTime()),
        }}
      />
      {selected ? (
        <div ref={confirmRef}>
          <Confirm
            key={selected}
            service={service}
            start={selected}
            turno={turno}
            now={now}
            contact={rescheduling ? { needed: false, name: "", phone: "" } : contact}
            onTaken={() => setSelected(null)}
            onDone={onDone}
          />
        </div>
      ) : null}
    </section>
  );
}

function Confirm({
  service,
  start,
  turno,
  now,
  contact,
  onTaken,
  onDone,
}: {
  service: Service;
  start: number;
  turno: MyTurno | null;
  now: Date;
  contact: ContactNeeds;
  onTaken: () => void;
  onDone: (text: string, turno: MyTurno | null) => void;
}) {
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone);
  const [result, setResult] = useState<TurnoResult | null>(null);
  const [lateAsked, setLateAsked] = useState(false);
  const [pending, run] = useTransition();
  const end = start + service.durationMinutes * 60_000;
  const late = !!turno && (lateAsked || changeTiming({ start: new Date(turno.start), bookedAt: new Date(turno.bookedAt) }, now) === "late");
  const fields = result && !result.ok ? (result.fields ?? {}) : {};
  const formError = result && !result.ok && result.error !== "CONTACT" && result.error !== "CONFIRM_LATE" ? turnosError(result.error) : null;

  function submit() {
    run(async () => {
      const r = turno ? await rescheduleAction(turno.id, start, late) : await bookAction({ serviceId: service.id, start, name, phone });
      setResult(r);
      if (r.ok) return onDone(turno ? `Listo: tu turno pasó al ${when(start).toLowerCase()}.` : "¡Listo! Reservaste tu turno.", r.turno ?? null);
      if (r.confirmLate) setLateAsked(true);
      if (r.error === "SLOT_TAKEN") onTaken();
    });
  }

  return (
    <Plate className="flex flex-col gap-4 p-5" aria-labelledby="titulo-confirmar">
      <h2 id="titulo-confirmar" className="text-[20px] font-bold">
        {turno ? "Pasar tu turno a" : "Tu reserva"}
      </h2>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[18px] font-bold">{service.name}</p>
          <p>{cap(formatDayLong(localDateOf(new Date(start))))}</p>
          <p className="cifra text-[22px]">
            {hour(start)} a {hour(end)}
          </p>
        </div>
        <p className="cifra shrink-0 text-[20px]">{formatPesos(turno ? turno.priceCents : service.priceCents)}</p>
      </div>
      {contact.needed ? (
        <div className="flex flex-col gap-3 border-t-2 border-linea pt-4">
          <p>Para reservar necesitamos tu nombre y tu celular. Es una sola vez.</p>
          <Field label="Tu nombre">
            <TextInput autoComplete="given-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!fields.name} aria-describedby="error-nombre" />
          </Field>
          <FieldError id="error-nombre">{errorText(fields.name)}</FieldError>
          <Field label="Tu celular" hint="Con código de área, por ejemplo 11 3816-3491">
            <TextInput type="tel" inputMode="tel" autoComplete="tel-national" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!fields.phone} aria-describedby="error-celular" />
          </Field>
          <FieldError id="error-celular">{errorText(fields.phone)}</FieldError>
        </div>
      ) : null}
      {late ? (
        <p role="alert" className="inline-flex items-start gap-2 rounded-[var(--radius-control)] bg-alerta-fondo p-3 font-bold shadow-[inset_0_0_0_2px_var(--alerta)]">
          <TriangleAlert aria-hidden size={20} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alerta" />
          Faltan menos de {APPOINTMENT_POLICY.lateThresholdMinutes / 60} horas: el cambio va a quedar registrado como reprogramación tarde.
        </p>
      ) : null}
      {formError ? <FormAlert title="No se pudo">{formError}</FormAlert> : null}
      <Button variant="principal" disabled={pending} onClick={submit} className="w-full sm:w-auto">
        {pending ? "Guardando…" : turno ? (late ? "Cambiar igual" : "Cambiar horario") : "Reservar"}
      </Button>
    </Plate>
  );
}
