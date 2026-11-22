import { CalendarDays, CalendarPlus, House, Settings, UserRound, Users, type LucideIcon } from "lucide-react";

export type Area = "cliente" | "colo";

/** Spec 004c, RF-1: las secciones de cada uno. Las direcciones son las de siempre. */
export const SECTIONS = {
  cliente: [
    { href: "/turnos", label: "Inicio", icon: House },
    { href: "/reservar", label: "Reservar", icon: CalendarPlus },
    { href: "/perfil", label: "Mi perfil", icon: UserRound },
  ],
  colo: [
    { href: "/colo", label: "Agenda", icon: CalendarDays },
    { href: "/colo/clientes", label: "Clientes", icon: Users },
    { href: "/colo/ajustes", label: "Ajustes", icon: Settings },
  ],
} as const satisfies Record<Area, readonly { href: string; label: string; icon: LucideIcon }[]>;

export type SectionHref = (typeof SECTIONS)[Area][number]["href"];
