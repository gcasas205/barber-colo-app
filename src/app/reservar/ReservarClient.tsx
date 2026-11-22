"use client";

import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { APPOINTMENT_POLICY, changeTiming } from "@/modules/appointments";
import type { Service } from "@/modules/pricing";
import { computeAvailability, snapshotInput, type ScheduleSnapshot } from "@/modules/schedule";
import { formatPesos, localDateOf, serverClock, type LocalDate } from "@/shared/kernel";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { Field, TextInput } from "@/ui/Field";
import { Segmented } from "@/ui/Segmented";
import { BookingView } from "../_reservar/BookingView";
import { hour, turnosError, when } from "../_reservar/turno-text";
import { FieldError, FormAlert } from "../_sesion/FormBits";
import { errorText } from "../_sesion/messages";
import { bookAction, rescheduleAction, type TurnoResult } from "../turnos/actions";
import type { TurnoView } from "../turnos/turno-view";

const TICK_MS = 30_000;

/** Una persona de la cuenta para la que se puede reservar (spec 004b): el cliente y sus personas a cargo. */
export type Member = { customerId: string; name: string; isSelf: boolean };
export type ContactNeeds = { needed: boolean; name: string; phone: string };

/**
 * Spec 004c, RF-9 a RF-13: Reservar (o cambiar el horario de un turno). Como la página de horarios de la 001,
 * calcula en el dispositivo con la foto de la agenda; reservar y reprogramar van al servidor, que decide con su
 * propia hora. El resumen queda fijo abajo (celular) o en una columna (computadora). Al terminar, vuelve a Inicio.
 */
export function ReservarClient({
  services,
  snapshot,
  members,
  turnos,
  turno,
  contact,
}: {
  services: Service[];
  snapshot: ScheduleSnapshot;
  members: Member[];
  /** Los turnos futuros de la cuenta (quién ya tiene uno). */
  turnos: TurnoView[];
  /** Con un turno: cambiar su horario (RF-13). */
  turno: TurnoView | null;
  contact: ContactNeeds;
}) {
  const [nowMs, setNowMs] = useState(snapshot.serverNow);
  useEffect(() => {
    const now = serverClock(snapshot.serverNow);
    const id = setInterval(() => setNowMs(now().getTime()), TICK_MS);
    return () => clearInterval(id);
  }, [snapshot.serverNow]);
  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const rescheduling = !!turno;
  const busy = useMemo(() => new Map(turnos.map((t) => [t.customerId, t])), [turnos]);
  const [forId, setForId] = useState(() => members.find((m) => !busy.has(m.customerId))?.customerId ?? null);
  const forMember = members.find((m) => m.customerId === forId) ?? null;
  const [serviceId, setServiceId] = useState(turno?.serviceId ?? services[0]?.id ?? "");
  const [selection, setSelection] = useState<{ day: LocalDate | null; weekOf: LocalDate | null }>({
    day: turno ? localDateOf(new Date(turno.start)) : null,
    weekOf: null,
  });
  const [selected, setSelected] = useState<number | null>(null);

  // Al reprogramar, el horario propio cuenta como libre (caso 6 de la 004) y el servicio no cambia.
  const service: Service = turno
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

  // RF-14: nadie de la cuenta puede reservar.
  if (!rescheduling && !forMember) {
    return (
      <section aria-labelledby="titulo-reservar" className="flex flex-col items-start gap-4">
        <h1 id="titulo-reservar" className="text-[28px] font-bold leading-tight">
          Reservá tu turno
        </h1>
        <p className="text-[17px]">
          {members.length > 1
            ? "Todos en tu cuenta ya tienen un turno. Para sacar otro, primero cancelá uno."
            : "Ya tenés un turno reservado. Para sacar otro, primero cancelá el que tenés."}
        </p>
        <Link href="/turnos" className="font-bold underline decoration-2 underline-offset-4">
          Ver mis turnos
        </Link>
      </section>
    );
  }

  const who = turno ? (turno.isSelf ? null : turno.customerName) : forMember && !forMember.isSelf ? forMember.name : null;
  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
      <section aria-labelledby="titulo-reservar" className="flex min-w-0 flex-col gap-7">
        <div className="flex flex-col gap-2">
          <h1 id="titulo-reservar" className="text-[28px] font-bold leading-tight">
            {rescheduling ? (who ? `Elegí el horario nuevo de ${who}` : "Elegí el horario nuevo") : "Reservá tu turno"}
          </h1>
          {rescheduling ? (
            <p className="text-tinta-suave">
              Hoy: {when(turno.start).toLowerCase()}.{" "}
              <Link href="/turnos" className="font-bold text-tinta underline decoration-2 underline-offset-4">
                Dejarlo como está
              </Link>
            </p>
          ) : null}
        </div>
        {!rescheduling && members.length > 1 ? (
          <section aria-labelledby="titulo-para-quien" className="flex flex-col gap-3">
            <h2 id="titulo-para-quien" className="text-[20px] font-bold">
              ¿Para quién es?
            </h2>
            <Segmented
              label="¿Para quién es?"
              value={forId}
              onChange={(id) => (setForId(id), setSelected(null))}
              options={members.map((m) => {
                const t = busy.get(m.customerId);
                return {
                  value: m.customerId,
                  label: m.isSelf ? "Para mí" : `Para ${m.name}`,
                  disabled: !!t,
                  hint: t ? `Ya tiene turno: ${when(t.start).toLowerCase()}` : undefined,
                };
              })}
            />
          </section>
        ) : null}
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
      </section>
      <Summary
        key={`${forId}-${service.id}`}
        service={service}
        start={selected}
        turno={turno}
        forMember={forMember && !forMember.isSelf ? forMember : null}
        now={now}
        contact={rescheduling ? { needed: false, name: "", phone: "" } : contact}
        onTaken={() => setSelected(null)}
      />
    </div>
  );
}

/** RF-10, RF-11: lo que se está por reservar, siempre a la vista, con el botón. */
function Summary({
  service,
  start,
  turno,
  forMember,
  now,
  contact,
  onTaken,
}: {
  service: Service;
  start: number | null;
  turno: TurnoView | null;
  forMember: Member | null;
  now: Date;
  contact: ContactNeeds;
  onTaken: () => void;
}) {
  const [name, setName] = useState(contact.name);
  const [phone, setPhone] = useState(contact.phone);
  const [askContact, setAskContact] = useState(false);
  const [result, setResult] = useState<TurnoResult | null>(null);
  const [lateAsked, setLateAsked] = useState(false);
  const [pending, run] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  // Otro horario: lo que dijo el servidor del anterior ya no vale (los datos cargados se conservan).
  const [shownFor, setShownFor] = useState(start);
  if (shownFor !== start) {
    setShownFor(start);
    setResult(null);
    setLateAsked(false);
  }
  const late = !!turno && (lateAsked || changeTiming({ start: new Date(turno.start), bookedAt: new Date(turno.bookedAt) }, now) === "late");
  const fields = result && !result.ok ? (result.fields ?? {}) : {};
  const formError =
    result && !result.ok && result.error !== "CONTACT" && result.error !== "CONFIRM_LATE"
      ? result.error === "HAS_UPCOMING" && forMember
        ? `${forMember.name} ya tiene un turno reservado. Para sacarle otro, primero cancelá el que tiene.`
        : turnosError(result.error)
      : null;
  const showContact = contact.needed && (askContact || !!result);
  const price = turno ? turno.priceCents : service.priceCents;
  const forWho = turno ? (turno.isSelf ? "para vos" : `para ${turno.customerName}`) : forMember ? `para ${forMember.name}` : "para vos";

  useEffect(() => {
    if (askContact) nameRef.current?.focus();
  }, [askContact]);

  function submit() {
    if (start === null) return;
    if (contact.needed && !askContact && !turno) return setAskContact(true); // RF-11: primero, los datos
    run(async () => {
      const r = turno
        ? await rescheduleAction(turno.id, start, late)
        : await bookAction({ serviceId: service.id, start, name, phone, forCustomerId: forMember?.customerId });
      // RF-12, RF-13: si sale bien, la acción lleva a Inicio (que arma el mensaje con sus propios datos).
      setResult(r);
      if (r.ok) return;
      if (r.confirmLate) setLateAsked(true);
      if (r.error === "SLOT_TAKEN") onTaken();
    });
  }

  return (
    <aside
      aria-labelledby="titulo-tu-reserva"
      className={cx(
        "sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 -mx-4 flex flex-col gap-3 border-t-2 border-linea bg-chapa px-4 py-3 shadow-[0_-10px_20px_-16px_rgb(14_23_41/0.5)]",
        "lg:top-32 lg:bottom-auto lg:mx-0 lg:rounded-[var(--radius-chapa)] lg:border-0 lg:p-5 lg:shadow-[var(--shadow-chapa-clara)]",
      )}
    >
      <h2 id="titulo-tu-reserva" className="sr-only lg:not-sr-only lg:text-[20px] lg:font-bold">
        {turno ? "El cambio" : "Tu reserva"}
      </h2>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0">
          <span className="font-bold">{service.name}</span>
          {" · "}
          {start === null ? (
            <span className="font-bold">elegí un horario</span>
          ) : (
            <span className="cifra font-bold">
              {when(start)} a {hour(start + service.durationMinutes * 60_000)}
            </span>
          )}
          <span className="text-tinta-suave"> · {forWho}</span>
        </p>
        <p className="cifra shrink-0 text-[20px]">{formatPesos(price)}</p>
      </div>
      {showContact ? (
        <div className="flex flex-col gap-2 border-t-2 border-linea pt-3">
          <p>Para reservar necesitamos tu nombre y tu celular. Es una sola vez.</p>
          <Field label="Tu nombre">
            <TextInput ref={nameRef} autoComplete="given-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!fields.name} aria-describedby="error-nombre" />
          </Field>
          <FieldError id="error-nombre">{errorText(fields.name)}</FieldError>
          <Field label="Tu celular" hint="Con código de área, por ejemplo 11 3816-3491">
            <TextInput type="tel" inputMode="tel" autoComplete="tel-national" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!fields.phone} aria-describedby="error-celular" />
          </Field>
          <FieldError id="error-celular">{errorText(fields.phone)}</FieldError>
        </div>
      ) : null}
      {late && start !== null ? (
        <p role="alert" className="inline-flex items-start gap-2 rounded-[var(--radius-control)] bg-alerta-fondo p-3 font-bold shadow-[inset_0_0_0_2px_var(--alerta)]">
          <TriangleAlert aria-hidden size={20} strokeWidth={2.5} className="mt-0.5 shrink-0 text-alerta" />
          Faltan menos de {APPOINTMENT_POLICY.lateThresholdMinutes / 60} horas: el cambio va a quedar registrado como reprogramación tarde.
        </p>
      ) : null}
      {formError ? <FormAlert title="No se pudo">{formError}</FormAlert> : null}
      <Button variant="principal" disabled={start === null || pending} onClick={submit} className="w-full">
        {pending ? "Guardando…" : turno ? (late ? "Cambiar igual" : "Cambiar horario") : "Reservar"}
      </Button>
      <p className="hidden text-[14px] text-tinta-suave lg:block">
        Podés cancelar o cambiar el horario sin problema hasta {APPOINTMENT_POLICY.lateThresholdMinutes / 60} horas antes.
      </p>
    </aside>
  );
}
