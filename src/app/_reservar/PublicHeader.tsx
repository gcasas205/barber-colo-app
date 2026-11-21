import { Badge } from "@/ui/brand/Badge";
import { ThemeControl } from "../_tema/ThemeControl";

/** Chapa superior de la página pública: insignia, nombre y tema; sin avisos ni menú (no hay sesión). */
export function PublicHeader() {
  return (
    <header className="bg-esmalte text-sobre-esmalte shadow-[0_8px_18px_-12px_rgb(14_23_41/0.6)]">
      <div className="mx-auto flex min-h-[72px] w-full max-w-3xl items-center gap-3 px-4 lg:px-8">
        <Badge size={48} />
        <p className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="letras-chapa text-[19px]">El Colo</span>
          <span className="text-[14px] font-bold text-sobre-esmalte-suave">Barbería y Peluquería</span>
        </p>
        <ThemeControl />
      </div>
    </header>
  );
}
