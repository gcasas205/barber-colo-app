import Link from "next/link";
import { CalendarPlus, Gift, House, Repeat2, Scissors, UserRound } from "lucide-react";
import { AppHeader } from "@/ui/AppHeader";
import { BottomNav } from "@/ui/BottomNav";
import { Button } from "@/ui/Button";
import { Plate } from "@/ui/Plate";
import { StatusMark } from "@/ui/StatusMark";
import { Tally } from "@/ui/Tally";
import { pesos } from "../_data";

const NAV = [
  { href: "/prototipo/cliente", label: "Inicio", icon: House, current: true },
  { href: "/prototipo/reservar", label: "Reservar", icon: CalendarPlus },
  { href: "#mis-turnos", label: "Mis turnos", icon: Scissors },
  { href: "#perfil", label: "Perfil", icon: UserRound },
];

export default function ClientHome() {
  return (
    <>
      <AppHeader title="El Colo" unread={1} />
      <main className="flex flex-1 flex-col gap-7 px-4 pb-8 pt-6">
        <h1 className="text-[28px] font-bold leading-tight">Hola, Martín</h1>

        <Plate tone="esmalte" aria-labelledby="proximo" className="overflow-hidden">
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <h2 id="proximo" className="text-[17px] font-bold text-sobre-esmalte-suave">
                Tu próximo turno
              </h2>
              <p className="cifra text-[40px] leading-none">Jue 26 · 16:00</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusMark status="booked" />
              <span className="text-[15px] text-sobre-esmalte-suave">Te pedimos confirmar a las 15:00</span>
            </div>
            <p className="text-[16px]">
              <span className="text-sobre-esmalte-suave line-through">{pesos(12000)}</span>{" "}
              <span className="cifra text-[20px]">{pesos(10800)}</span>{" "}
              <span className="text-sobre-esmalte-suave">· 10 % off por tu 4.º corte del mes</span>
            </p>
            <div className="flex gap-3">
              <Button variant="secundario" className="flex-1">
                <Repeat2 aria-hidden size={20} strokeWidth={2.5} />
                Cambiar horario
              </Button>
              <Button variant="texto" className="text-sobre-esmalte">
                Cancelar
              </Button>
            </div>
          </div>
        </Plate>

        <section aria-labelledby="tomi" className="flex flex-col gap-3">
          <h2 id="tomi" className="text-[20px] font-bold">
            Tomi
          </h2>
          <Plate className="flex items-center justify-between gap-3 px-5 py-4">
            <p className="text-tinta-suave">Sin turno reservado. Su último corte fue hace 5 semanas.</p>
          </Plate>
        </section>

        <Link
          href="/prototipo/reservar"
          className="flex min-h-[56px] items-center justify-center gap-2 rounded-[var(--radius-control)] bg-poste text-[18px] font-bold text-white shadow-[0_10px_18px_-10px_rgb(184_38_47/0.8)] transition-colors hover:bg-poste-oscuro"
        >
          <CalendarPlus aria-hidden size={22} strokeWidth={2.5} />
          Reservar turno
        </Link>

        <section aria-labelledby="beneficios" className="flex flex-col gap-3">
          <h2 id="beneficios" className="text-[20px] font-bold">
            Tus beneficios
          </h2>
          <Plate className="flex flex-col divide-y divide-linea">
            <div className="flex flex-col gap-2 px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-bold">4.º corte del mes · 10 % off</p>
                <p className="cifra text-[17px]">3 de 4</p>
              </div>
              <Tally done={3} total={4} />
              <p className="text-[15px] text-tinta-suave">Tu próximo corte de noviembre ya tiene el descuento.</p>
            </div>
            <div className="flex flex-col gap-2 px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-bold">Corte n.º 10 · 15 % off</p>
                <p className="cifra text-[17px]">7 de 10</p>
              </div>
              <Tally done={7} total={10} />
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <Gift aria-hidden size={22} className="shrink-0 text-poste" strokeWidth={2.25} />
              <p className="text-[16px]">
                <span className="font-bold">Cumpleaños · 15 % off.</span>{" "}
                <Link href="#perfil" className="underline decoration-2 underline-offset-4">
                  Cargá tu cumpleaños
                </Link>
              </p>
            </div>
          </Plate>
        </section>
        <p className="text-[14px] text-tinta-suave">Datos de ejemplo.</p>
      </main>
      <BottomNav items={NAV} />
    </>
  );
}
