import { FlaskConical } from "lucide-react";
import { signOut } from "../ingresar/actions";

/** RF-22b: franja fija para que una sesión de prueba nunca se confunda con la app real. */
export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 bg-espera text-[#1d1300]">
      <form action={signOut} className="mx-auto flex min-h-[44px] w-full max-w-3xl items-center justify-between gap-3 px-4 lg:px-8">
        <p className="inline-flex items-center gap-2 text-[15px] font-bold">
          <FlaskConical aria-hidden size={18} strokeWidth={2.5} />
          Modo de prueba
        </p>
        <button type="submit" className="min-h-[44px] px-2 text-[15px] font-bold underline decoration-2 underline-offset-4">
          Salir
        </button>
      </form>
    </div>
  );
}
