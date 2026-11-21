import { FlaskConical, UserRound, UserRoundCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { CustomerListItem } from "@/modules/customers";
import { formatArPhone } from "@/modules/customers";

/** Un cliente en la lista de Colo (RF-19, RF-20): sobrenombre primero, nombre al lado. */
export function CustomerCard({ customer: c, editor }: { customer: CustomerListItem; editor?: ReactNode }) {
  const account = c.role === "holder";
  return (
    <article className="flex flex-col gap-2 rounded-[var(--radius-chapa)] bg-chapa p-4 shadow-[var(--shadow-chapa-clara)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="min-w-0 text-[18px] font-bold">
          {c.nickname ? (
            <>
              {c.nickname} <span className="font-normal text-tinta-suave">· {c.fullName}</span>
            </>
          ) : (
            c.fullName
          )}
        </h3>
        {/* Estado con ícono y palabra (DESIGN.md): cuenta o invitado. */}
        <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-tinta-suave">
          {account ? <UserRoundCheck aria-hidden size={18} strokeWidth={2.5} /> : <UserRound aria-hidden size={18} strokeWidth={2.5} />}
          {account ? "Cuenta" : "Invitado"}
          {c.isDemo ? (
            <>
              {" · "}
              <FlaskConical aria-hidden size={16} strokeWidth={2.5} /> Prueba
            </>
          ) : null}
        </span>
      </div>
      <p className="cifra text-[17px]">{c.phone ? formatArPhone(c.phone) : "Sin celular todavía"}</p>
      {editor}
    </article>
  );
}
