import Link from "next/link";
import { Bell, ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "./brand/Badge";

/**
 * Chapa superior: esmalte azul con la insignia y el título en letras de chapa.
 * Con `back`, muestra "Volver" en lugar de la insignia.
 */
export function AppHeader({
  title,
  back,
  unread = 0,
  children,
}: {
  title: string;
  back?: string;
  unread?: number;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 bg-esmalte text-sobre-esmalte shadow-[0_8px_18px_-12px_rgb(14_23_41/0.6)]">
      <div className="mx-auto flex min-h-[64px] w-full max-w-6xl items-center gap-3 px-4 lg:min-h-[72px] lg:px-8">
        {back ? (
          <Link href={back} className="-ml-2 flex min-h-[48px] items-center gap-1 rounded-lg pr-2 font-bold">
            <ChevronLeft aria-hidden size={24} strokeWidth={2.5} />
            Volver
          </Link>
        ) : (
          <span className="lg:hidden">
            <Badge size={40} />
          </span>
        )}
        <p className="letras-chapa min-w-0 flex-1 truncate text-[17px] lg:text-[20px]">{title}</p>
        <Link
          href="#avisos"
          aria-label={unread ? `Avisos, ${unread} sin leer` : "Avisos"}
          className="relative grid h-12 w-12 place-items-center rounded-full hover:bg-[rgb(243_245_244/0.12)]"
        >
          <Bell aria-hidden size={24} strokeWidth={2.25} />
          {unread > 0 && (
            <span className="cifra absolute right-1.5 top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-poste px-1 text-[12px] text-white">
              {unread}
            </span>
          )}
        </Link>
      </div>
      {children}
    </header>
  );
}
