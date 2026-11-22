import type { Metadata } from "next";
import { ChevronLeft, LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getMyAppointments } from "@/modules/appointments";
import { DEPENDENTS_LIMIT, formatArPhone, getOwnProfile, listDependents } from "@/modules/customers";
import { appointmentsDeps } from "@/server/appointments";
import { formatDayLong, formatMinute, localDateOf, minuteOfDayOf } from "@/shared/kernel";
import { getActor } from "@/server/auth/actor";
import { queries } from "@/server/composition";
import { customersStore } from "@/server/customers";
import { Button } from "@/ui/Button";
import { Plate } from "@/ui/Plate";
import { DemoBanner } from "../_sesion/DemoBanner";
import { SessionScreen } from "../_sesion/SessionScreen";
import { signOut } from "../ingresar/actions";
import { Dependents, type DependentItem } from "./Dependents";
import { ProfileForm } from "./ProfileForm";

/**
 * RNF-4: ruta bloqueante, renderizada entera en cada pedido. La CSP con nonce no es compatible con el
 * prerenderizado parcial (los scripts del armazón prerenderizado no tendrían el nonce).
 */
export const instant = false;

export const metadata: Metadata = { title: "Mi perfil · El Colo", robots: { index: false } };

export default async function PerfilPage() {
  await connection(); // RNF-4: ver `instant` arriba
  // Sin <Suspense>: la ruta es bloqueante y el servidor la arma entera (menos de 30 ms). Un indicador de
  // carga solo agregaría la demora con la que React reemplaza un fallback por el contenido.
  return <Profile />;
}

async function Profile() {
  const actor = await getActor();
  if (actor.kind === "none") redirect("/");
  if (actor.kind === "barber") redirect("/colo");
  const now = new Date();
  const [profile, contact, dependents, mine] = await Promise.all([
    getOwnProfile({ store: customersStore() }, actor),
    queries().contactWhatsapp(),
    listDependents({ store: customersStore() }, actor), // 004b: solo titulares
    getMyAppointments(appointmentsDeps(), actor, now),
  ]);
  const items: DependentItem[] = dependents.map((d) => ({
    id: d.id,
    name: d.name.replace(/ \(demo\)$/, ""),
    birthDay: d.birthday?.day ?? null,
    birthMonth: d.birthday?.month ?? null,
  }));
  // RF-6 de la 004b: el turno futuro de cada persona a cargo, para mostrarlo antes de quitarla.
  const upcoming = Object.fromEntries(
    mine.appointments.filter((a) => !a.isSelf).map((a) => [a.customerId, `${formatDayLong(localDateOf(a.start))} a las ${formatMinute(minuteOfDayOf(a.start))}`]),
  );
  if (!profile && actor.kind !== "guest") redirect("/");
  const demo = actor.kind === "customer" && actor.demo;
  const back = (
    <Link href="/turnos" className="inline-flex items-center gap-1 self-start font-bold underline decoration-2 underline-offset-4">
      <ChevronLeft aria-hidden size={20} strokeWidth={2.5} /> Volver a los turnos
    </Link>
  );
  const salir = (
    <form action={signOut}>
      <Button type="submit" variant="texto">
        <LogOut aria-hidden size={20} strokeWidth={2.5} /> Salir
      </Button>
    </form>
  );

  if (actor.kind === "guest") {
    return (
      <SessionScreen>
        {back}
        <h1 className="text-[28px] font-bold leading-tight">{profile ? `Hola, ${profile.fullName}` : "Hola"}</h1>
        <Plate className="flex flex-col gap-3 p-5">
          <p className="font-bold">Entraste como invitado</p>
          {profile ? (
            <p>
              Celular: <span className="cifra">{profile.phone ? formatArPhone(profile.phone) : "—"}</span>
            </p>
          ) : (
            <p>Tu nombre y tu celular te los pedimos cuando reserves el primer turno.</p>
          )}
          <p className="text-tinta-suave">Como invitado no acumulás visitas para los descuentos. Podés crear tu cuenta cuando quieras.</p>
        </Plate>
        {salir}
      </SessionScreen>
    );
  }

  return (
    <SessionScreen banner={demo ? <DemoBanner /> : null}>
      {back}
      <h1 className="text-[28px] font-bold leading-tight">Mi perfil</h1>
      <ProfileForm
        complete={actor.profileComplete}
        contact={contact}
        defaults={{
          name: profile?.fullName ?? "",
          phone: profile?.phone ? formatArPhone(profile.phone) : "",
          birthDay: profile?.birthday?.day ?? null,
          birthMonth: profile?.birthday?.month ?? null,
        }}
      />
      {actor.customerId && actor.profileComplete ? <Dependents items={items} upcoming={upcoming} limit={DEPENDENTS_LIMIT} /> : null}
      {salir}
    </SessionScreen>
  );
}
