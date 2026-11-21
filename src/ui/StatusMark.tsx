import { Check, CircleAlert, Clock3, Hourglass, Minus, X } from "lucide-react";
import { cx } from "./cx";

export type AppointmentStatus =
  | "pending_approval"
  | "booked"
  | "confirmed"
  | "unconfirmed"
  | "attended"
  | "no_show"
  | "cancelled"
  | "cancelled_late";

/**
 * Estado de un turno: color + ícono + palabra. El color nunca va solo (daltonismo, sol en la pantalla).
 */
const STATUS: Record<AppointmentStatus, { label: string; icon: typeof Check; tone: string }> = {
  pending_approval: { label: "Por aprobar", icon: Hourglass, tone: "bg-espera-fondo text-espera" },
  booked: { label: "Reservado", icon: Clock3, tone: "bg-neutro-fondo text-neutro" },
  confirmed: { label: "Confirmado", icon: Check, tone: "bg-ok-fondo text-ok" },
  unconfirmed: { label: "Sin confirmar", icon: CircleAlert, tone: "bg-espera-fondo text-espera" },
  attended: { label: "Asistió", icon: Check, tone: "bg-ok-fondo text-ok" },
  no_show: { label: "Faltó", icon: X, tone: "bg-alerta-fondo text-alerta" },
  cancelled: { label: "Cancelado", icon: Minus, tone: "bg-neutro-fondo text-neutro" },
  cancelled_late: { label: "Canceló tarde", icon: Minus, tone: "bg-alerta-fondo text-alerta" },
};

export function StatusMark({ status, className }: { status: AppointmentStatus; className?: string }) {
  const { label, icon: Icon, tone } = STATUS[status];
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[14px] font-bold leading-none",
        tone,
        className,
      )}
    >
      <Icon aria-hidden size={15} strokeWidth={2.75} />
      {label}
    </span>
  );
}
