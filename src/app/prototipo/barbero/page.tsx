import { BarChart3, CalendarDays, Check, Settings, Sun, UsersRound, X } from "lucide-react";
import { AppHeader } from "@/ui/AppHeader";
import { AppShell } from "@/ui/AppShell";
import { Button } from "@/ui/Button";
import { Plate } from "@/ui/Plate";
import { PoleBand } from "@/ui/PoleBand";
import { StatusMark } from "@/ui/StatusMark";
import { cx } from "@/ui/cx";
import { TODAY, pesos } from "../_data";

const NAV = [
  { href: "/prototipo/barbero", label: "Hoy", icon: Sun, current: true },
  { href: "#agenda", label: "Agenda", icon: CalendarDays },
  { href: "#clientes", label: "Clientes", icon: UsersRound },
  { href: "#numeros", label: "Números", icon: BarChart3 },
  { href: "/prototipo/ajustes", label: "Ajustes", icon: Settings },
];

const NOW = "16:00";

export default function BarberToday() {
  const now = TODAY.find((r) => r.time === NOW)!;
  const later = TODAY.filter((r) => r.time > NOW);
  const earlier = TODAY.filter((r) => r.time < NOW);
  const expected = TODAY.filter((r) => r.status !== "no_show").reduce((sum, r) => sum + r.price, 0);
  const billed = TODAY.filter((r) => r.status === "attended").reduce((sum, r) => sum + r.price, 0);

  return (
    <AppShell nav={NAV}>
      <AppHeader title="Hoy · Jue 26" unread={2}>
        <p className="mx-auto w-full max-w-6xl px-4 pb-4 text-[16px] text-sobre-esmalte-suave lg:px-8 lg:pb-5 lg:text-[18px]">
          <span className="cifra text-[20px] text-sobre-esmalte lg:text-[24px]">{TODAY.length}</span> turnos ·{" "}
          <span className="cifra text-[20px] text-sobre-esmalte lg:text-[24px]">{pesos(billed)}</span> cobrado de{" "}
          <span className="cifra text-[20px] text-sobre-esmalte lg:text-[24px]">{pesos(expected)}</span>
        </p>
      </AppHeader>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 content-start gap-7 px-4 pb-8 pt-6 lg:grid-cols-2 lg:items-start lg:gap-10 lg:px-8 lg:pt-10">
        <div className="flex flex-col gap-7">
        <Plate tone="esmalte" aria-labelledby="ahora" className="overflow-hidden">
          <PoleBand className="h-3" />
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h1 id="ahora" className="text-[24px] font-bold leading-tight">
                  Ahora: {now.name}
                </h1>
                <p className="text-[18px] font-bold text-sobre-esmalte-suave">{now.service}</p>
              </div>
              <p className="cifra text-[34px] leading-none">{now.time}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusMark status={now.status} />
              <span className="text-[15px] text-sobre-esmalte-suave">
                Cobrar <span className="cifra text-[17px] text-sobre-esmalte">{pesos(now.price)}</span> · {now.discount}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Button variant="principal">
                <Check aria-hidden size={22} strokeWidth={2.75} />
                Asistió
              </Button>
              <Button variant="secundario">
                <X aria-hidden size={20} strokeWidth={2.75} />
                Faltó
              </Button>
            </div>
          </div>
        </Plate>

        <section aria-labelledby="decidir" className="flex flex-col gap-3">
          <h2 id="decidir" className="text-[20px] font-bold">
            Para decidir
          </h2>
          <Plate className="flex flex-col gap-3 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <p>
                <span className="font-bold">Lucas Gómez</span> no confirmó su turno de{" "}
                <span className="cifra">17:00</span>.
              </p>
              <StatusMark status="unconfirmed" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="esmalte">Mantener</Button>
              <Button variant="secundario">Liberar</Button>
            </div>
          </Plate>
          <Plate className="flex flex-col gap-3 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <p>
                <span className="font-bold">Nicolás Vera</span> pidió el <span className="cifra">sáb 28 · 11:00</span>.
                Tiene 3 faltas seguidas.
              </p>
              <StatusMark status="pending_approval" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="esmalte">Aprobar</Button>
              <Button variant="secundario">Rechazar</Button>
            </div>
          </Plate>
        </section>

        </div>

        <div className="flex flex-col gap-7">
        <section aria-labelledby="despues" className="flex flex-col gap-3">
          <h2 id="despues" className="text-[20px] font-bold">
            Después
          </h2>
          <Plate as="ol" className="divide-y divide-linea">
            {later.map((r) => (
              <Row key={r.time} {...r} />
            ))}
          </Plate>
        </section>

        <section aria-labelledby="antes" className="flex flex-col gap-3">
          <h2 id="antes" className="text-[20px] font-bold">
            Más temprano
          </h2>
          <Plate as="ol" className="divide-y divide-linea">
            {earlier.map((r) => (
              <Row key={r.time} {...r} muted />
            ))}
          </Plate>
        </section>
        <p className="text-[14px] text-tinta-suave">Datos de ejemplo.</p>
        </div>
      </main>
    </AppShell>
  );
}

function Row({
  time,
  name,
  service,
  forWhom,
  status,
  price,
  muted,
}: (typeof TODAY)[number] & { muted?: boolean }) {
  return (
    <li className="flex min-h-[72px] items-center gap-4 px-5 py-3">
      <span className={cx("cifra w-[58px] shrink-0 text-[21px]", muted && "text-tinta-suave")}>{time}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate font-bold">{name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-tinta-suave">
          <StatusMark status={status} />
          <span>
            {service} · <span className="cifra text-[15px]">{pesos(price)}</span>
          </span>
          {forWhom ? <span>Reservó {forWhom}</span> : null}
        </span>
      </span>
    </li>
  );
}
