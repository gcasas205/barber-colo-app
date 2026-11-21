import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatArPhone, getOwnProfile } from "@/modules/customers";
import { getActor } from "@/server/auth/actor";
import { queries } from "@/server/composition";
import { customersStore } from "@/server/customers";
import { Button } from "@/ui/Button";
import { Plate } from "@/ui/Plate";
import { BrandLoader } from "@/ui/brand/BrandLoader";
import { DemoBanner } from "../_sesion/DemoBanner";
import { SessionScreen } from "../_sesion/SessionScreen";
import { signOut } from "../ingresar/actions";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Mi perfil · El Colo", robots: { index: false } };

export default function PerfilPage() {
  return (
    <Suspense
      fallback={
        <SessionScreen>
          <BrandLoader label="Cargando tu perfil…" />
        </SessionScreen>
      }
    >
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  await connection();
  const actor = await getActor();
  if (actor.kind === "none") redirect("/ingresar");
  if (actor.kind === "barber") redirect("/colo");
  const [profile, contact] = await Promise.all([getOwnProfile({ store: customersStore() }, actor), queries().contactWhatsapp()]);
  if (!profile) redirect("/ingresar");
  const demo = actor.kind === "customer" && actor.demo;
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
        <h1 className="text-[28px] font-bold leading-tight">Hola, {profile.fullName}</h1>
        <Plate className="flex flex-col gap-3 p-5">
          <p className="font-bold">Entraste como invitado</p>
          <p>
            Celular: <span className="cifra">{profile.phone ? formatArPhone(profile.phone) : "—"}</span>
          </p>
          <p className="text-tinta-suave">Como invitado no acumulás visitas para los descuentos. Podés crear tu cuenta cuando quieras.</p>
        </Plate>
        {salir}
      </SessionScreen>
    );
  }

  return (
    <SessionScreen banner={demo ? <DemoBanner /> : null}>
      <h1 className="text-[28px] font-bold leading-tight">{actor.profileComplete ? "Mi perfil" : "Completá tu perfil"}</h1>
      <ProfileForm
        complete={actor.profileComplete}
        contact={contact}
        defaults={{
          name: profile.fullName,
          phone: profile.phone ? formatArPhone(profile.phone) : "",
          birthDay: profile.birthday?.day ?? null,
          birthMonth: profile.birthday?.month ?? null,
        }}
      />
      {salir}
    </SessionScreen>
  );
}
