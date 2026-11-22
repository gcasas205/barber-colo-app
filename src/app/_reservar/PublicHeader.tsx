import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/ui/brand/Badge";
import { ThemeControl } from "../_tema/ThemeControl";

/** Chapa superior: insignia, nombre, el acceso que corresponda a la sesión y el tema. */
export function PublicHeader({ session }: { session?: ReactNode }) {
  return (
    <header className="bg-esmalte text-sobre-esmalte shadow-[0_8px_18px_-12px_rgb(14_23_41/0.6)]">
      <div className="mx-auto flex min-h-[72px] w-full max-w-3xl items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-8">
        <Link href="/" aria-label="El Colo, inicio" className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste">
          <Badge size={44} />
        </Link>
        <p className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="letras-chapa text-[19px]">El Colo</span>
          <span className="hidden text-[14px] font-bold text-sobre-esmalte-suave sm:block">Barbería y Peluquería</span>
        </p>
        {session}
        <ThemeControl />
      </div>
    </header>
  );
}
