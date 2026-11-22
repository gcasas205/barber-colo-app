import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/ui/brand/Badge";
import { cx } from "@/ui/cx";
import { ThemeControl } from "../_tema/ThemeControl";
import { SECTIONS, type Area, type SectionHref } from "./sections";
import { SectionNav } from "./SectionNav";

const WIDTH = { angosto: "max-w-xl", medio: "max-w-3xl", ancho: "max-w-6xl" } as const;

/**
 * Spec 004c: marco de las pantallas con sesión, como el prototipo (DESIGN.md, navegación y layout).
 * - Celular: chapa superior con la insignia y la sección, contenido y barra inferior de esmalte (RF-1, RF-4).
 * - Computadora (≥ 1024 px): riel lateral de esmalte con la marca y las secciones; el contenido usa el ancho (RF-2).
 */
export function AppFrame({
  area,
  current,
  banner,
  width = "medio",
  children,
}: {
  area: Area;
  current: SectionHref;
  banner?: ReactNode;
  width?: keyof typeof WIDTH;
  children: ReactNode;
}) {
  const title = SECTIONS[area].find((s) => s.href === current)?.label ?? "";
  const home = SECTIONS[area][0].href;
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 bg-esmalte px-4 py-6 text-sobre-esmalte-suave shadow-[8px_0_24px_-18px_rgb(14_23_41/0.6)] lg:flex">
        <Link href={home} className="flex items-center gap-3 rounded-[var(--radius-control)] px-2 text-sobre-esmalte focus-visible:outline-3 focus-visible:outline-poste">
          <Badge size={52} />
          <span className="flex flex-col leading-tight">
            <span className="letras-chapa text-[18px]">El Colo</span>
            <span className="text-[13px] font-bold text-sobre-esmalte-suave">Barbería y Peluquería</span>
          </span>
        </Link>
        <SectionNav area={area} current={current} variant="rail" />
        <div aria-hidden className="poste mt-auto h-2 rounded-full opacity-90" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20">
          {banner}
          <header className="bg-esmalte text-sobre-esmalte shadow-[0_8px_18px_-12px_rgb(14_23_41/0.6)]">
            <div className={cx("mx-auto flex min-h-[64px] w-full items-center gap-3 px-4 lg:min-h-[72px] lg:px-8", WIDTH.ancho)}>
              <Link href={home} aria-label="El Colo, inicio" className="shrink-0 rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste lg:hidden">
                <Badge size={40} />
              </Link>
              <p className="letras-chapa min-w-0 flex-1 truncate text-[17px] lg:text-[20px]">{title}</p>
              <ThemeControl />
            </div>
          </header>
        </div>
        <main className={cx("mx-auto flex w-full flex-1 flex-col gap-7 px-4 pb-12 pt-6 lg:px-8 lg:pt-10", WIDTH[width])}>{children}</main>
        <div className="sticky bottom-0 z-20 bg-esmalte pb-[env(safe-area-inset-bottom)] text-sobre-esmalte-suave shadow-[0_-8px_18px_-12px_rgb(14_23_41/0.5)] lg:hidden">
          <SectionNav area={area} current={current} variant="bar" />
        </div>
      </div>
    </div>
  );
}
