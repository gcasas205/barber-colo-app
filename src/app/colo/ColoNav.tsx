import { CalendarDays, LogOut, Settings, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { signOut, signOutEverywhere } from "../ingresar/actions";

const TABS = [
  { href: "/colo", label: "Agenda", icon: CalendarDays },
  { href: "/colo/clientes", label: "Clientes", icon: Users },
  { href: "/colo/ajustes", label: "Ajustes", icon: Settings },
] as const;

/** Spec 004, RF-21: el panel abre en la agenda; Clientes y Ajustes son secciones. */
export function ColoNav({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Panel de Colo">
      <ul className="grid grid-cols-3 gap-2">
        {TABS.map(({ href, label, icon: Icon }) => (
          <li key={href} className="flex">
            <Link
              href={href}
              aria-current={href === current ? "page" : undefined}
              className={cx(
                "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] px-2 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste",
                href === current ? "bg-esmalte text-sobre-esmalte" : "bg-chapa shadow-[inset_0_0_0_2px_var(--linea)]",
              )}
            >
              <Icon aria-hidden size={20} strokeWidth={2.5} /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Salir, al pie del panel (RF-5 y RF-5b de la 002). */
export function ColoSignOut() {
  return (
    <div className="flex flex-col items-start gap-1 border-t-2 border-linea pt-4">
      <form action={signOut}>
        <Button type="submit" variant="texto">
          <LogOut aria-hidden size={20} strokeWidth={2.5} /> Salir
        </Button>
      </form>
      <form action={signOutEverywhere}>
        <Button type="submit" variant="texto">
          <LogOut aria-hidden size={20} strokeWidth={2.5} /> Salir de todos los dispositivos
        </Button>
      </form>
    </div>
  );
}
