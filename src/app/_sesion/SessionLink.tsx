import { LogIn, UserRound } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { getActor } from "@/server/auth/actor";

const LINK =
  "inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] px-3 text-[15px] font-bold text-sobre-esmalte hover:bg-[rgb(243_245_244/0.12)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-poste";

export function LoginLink() {
  return (
    <Link href="/ingresar" className={LINK}>
      <LogIn aria-hidden size={20} strokeWidth={2.5} />
      Ingresar
    </Link>
  );
}

/** RF-1: en la chapa superior, "Ingresar" o el acceso a la cuenta. Se lee la sesión detrás de Suspense. */
export async function SessionLink() {
  await connection(); // la sesión es de este pedido: nunca del prerenderizado
  let actor;
  try {
    actor = await getActor();
  } catch {
    return <LoginLink />; // sin configuración de Auth o con la base caída: la página pública sigue andando
  }
  if (actor.kind === "none") return <LoginLink />;
  const href = actor.kind === "barber" ? "/colo" : "/perfil";
  return (
    <Link href={href} className={LINK}>
      <UserRound aria-hidden size={20} strokeWidth={2.5} />
      {actor.kind === "barber" ? "Panel" : "Mi perfil"}
    </Link>
  );
}
