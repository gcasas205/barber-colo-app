"use client";

import { CalendarCheck2, Clock3, Megaphone, MessageCircle, Sparkles } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { formatArPhone } from "@/modules/customers";
import { formatMinute, formatPesos, localDateOf, minuteOfDayOf, type LocalDate } from "@/shared/kernel";
import { Button } from "@/ui/Button";
import { Field, TextInput } from "@/ui/Field";
import { Plate } from "@/ui/Plate";
import { cx } from "@/ui/cx";
import { FieldError, FormAlert } from "../_sesion/FormBits";
import { whatsappHref } from "../_reservar/whatsapp";
import { cancelTurnoAction, freeStartsAction, moveTurnoAction, type AgendaResult } from "./agenda-actions";

export type AgendaTurno = {
  id: string;
  serviceName: string;
  start: number;
  end: number;
  status: "reserved" | "confirmed";
  priceCents: number;
  customer: { name: string; nickname: string | null; phone: string | null; isGuest: boolean };
  isNew: boolean;
};
export type AgendaBlock = { start: number; end: number; notice: string | null; allDay: boolean };

const hour = (ms: number) => formatMinute(minuteOfDayOf(new Date(ms)));

/** RF-21 a RF-26: la agenda de un día. */
export function AgendaDay({ day, turnos, blocks }: { day: LocalDate; turnos: AgendaTurno[]; blocks: AgendaBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.length > 0 ? (
        <ul aria-label="Bloqueos del día" className="flex flex-col gap-2">
          {blocks.map((b) => (
            <li key={b.start} className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-espera-fondo px-4 py-3 font-bold shadow-[inset_0_0_0_2px_var(--espera)]">
              <Megaphone aria-hidden size={18} strokeWidth={2.5} />
              {b.allDay ? "Bloqueado todo el día" : `Bloqueado de ${hour(b.start)} a ${localDateOf(new Date(b.end)) === day ? hour(b.end) : "24:00"}`}
              {b.notice ? `: ${b.notice}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {turnos.length === 0 ? (
        <p className="text-tinta-suave">No hay turnos este día.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Turnos del día">
          {turnos.map((t) => (
            <li key={t.id}>
              <TurnoItem t={t} day={day} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TurnoItem({ t, day }: { t: AgendaTurno; day: LocalDate }) {
  const [mode, setMode] = useState<"idle" | "cancel" | "move">("idle");
  const who = t.customer.nickname ? `${t.customer.name} (${t.customer.nickname})` : t.customer.name;
  return (
    <Plate className={cx("flex flex-col gap-3 px-5 py-4", t.isNew && "shadow-[inset_0_0_0_3px_var(--espera)]")}>
      <div className="flex items-start gap-4">
        <p className="cifra shrink-0 text-[22px] leading-tight">
          {hour(t.start)}
          <span className="block text-[15px] text-tinta-suave">a {hour(t.end)}</span>
        </p>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-2 text-[18px] font-bold">
            {who}
            {t.isNew ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-espera-fondo px-2 py-0.5 text-[13px] text-tinta shadow-[inset_0_0_0_2px_var(--espera)]">
                <Sparkles aria-hidden size={14} strokeWidth={2.5} /> Nuevo
              </span>
            ) : null}
            {t.customer.isGuest ? <span className="rounded-full bg-chapa px-2 py-0.5 text-[13px] shadow-[inset_0_0_0_2px_var(--linea)]">Invitado</span> : null}
          </p>
          <p className="text-[15px] text-tinta-suave">
            {t.serviceName} · <span className="cifra">{formatPesos(t.priceCents)}</span>
          </p>
          <p className="inline-flex items-center gap-1.5 text-[15px] font-bold">
            {t.status === "confirmed" ? (
              <>
                <CalendarCheck2 aria-hidden size={16} strokeWidth={2.5} /> Confirmado
              </>
            ) : (
              <>
                <Clock3 aria-hidden size={16} strokeWidth={2.5} /> Reservado
              </>
            )}
          </p>
          {t.customer.phone ? (
            <a
              href={whatsappHref(t.customer.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 self-start font-bold underline decoration-2 underline-offset-4"
            >
              <MessageCircle aria-hidden size={18} strokeWidth={2.5} /> {formatArPhone(t.customer.phone)}
            </a>
          ) : null}
        </div>
      </div>
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secundario" onClick={() => setMode("move")}>
            Mover
          </Button>
          <Button variant="texto" onClick={() => setMode("cancel")}>
            Cancelar
          </Button>
        </div>
      ) : (
        <ChangeForm t={t} day={day} mode={mode} onClose={() => setMode("idle")} />
      )}
    </Plate>
  );
}

/** RF-24 y RF-25: el motivo es obligatorio y le llega al cliente. */
function ChangeForm({ t, day, mode, onClose }: { t: AgendaTurno; day: LocalDate; mode: "cancel" | "move"; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [moveDay, setMoveDay] = useState<string>(day);
  const [starts, setStarts] = useState<{ start: number; label: string }[] | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [result, setResult] = useState<AgendaResult | null>(null);
  const [pending, run] = useTransition();
  const reasonId = useId();

  const loadStarts = (d: string) =>
    run(async () => {
      setTarget(null);
      setStarts(await freeStartsAction(t.id, d));
    });

  return (
    <div className="flex flex-col gap-3 border-t-2 border-linea pt-3">
      {mode === "move" ? (
        <>
          <div className="flex items-end gap-2">
            <Field label="Día nuevo">
              <TextInput type="date" value={moveDay} onChange={(e) => setMoveDay(e.target.value)} />
            </Field>
            <Button variant="secundario" disabled={pending || !moveDay} onClick={() => loadStarts(moveDay)}>
              Ver horarios
            </Button>
          </div>
          {starts ? (
            starts.length === 0 ? (
              <p className="text-tinta-suave">Ese día no hay horarios libres para {t.serviceName.toLowerCase()}.</p>
            ) : (
              <ul className="grid grid-cols-4 gap-2" aria-label="Horarios libres">
                {starts.map((s) => (
                  <li key={s.start} className="flex">
                    <button
                      type="button"
                      aria-pressed={target === s.start}
                      onClick={() => setTarget(s.start)}
                      className={cx(
                        "cifra min-h-[48px] w-full rounded-[var(--radius-control)] text-[18px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste",
                        target === s.start ? "bg-esmalte text-sobre-esmalte" : "bg-chapa shadow-[inset_0_0_0_2px_var(--linea)]",
                      )}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </>
      ) : null}
      <Field label={mode === "cancel" ? "Motivo de la cancelación" : "Motivo del cambio"} hint="Le llega al cliente.">
        <TextInput value={reason} maxLength={220} onChange={(e) => setReason(e.target.value)} aria-describedby={reasonId} />
      </Field>
      <FieldError id={reasonId}>{null}</FieldError>
      {result && !result.ok ? <FormAlert title="No se guardó">{result.error}</FormAlert> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={mode === "cancel" ? "principal" : "esmalte"}
          disabled={pending || (mode === "move" && !target)}
          onClick={() =>
            run(async () => {
              const r = mode === "cancel" ? await cancelTurnoAction(t.id, reason) : await moveTurnoAction(t.id, target, reason);
              setResult(r);
              if (r.ok) onClose();
            })
          }
        >
          {pending ? "Guardando…" : mode === "cancel" ? "Cancelar el turno" : "Mover el turno"}
        </Button>
        <Button variant="texto" disabled={pending} onClick={onClose}>
          Volver
        </Button>
      </div>
    </div>
  );
}
