import { redirect } from "next/navigation";

/** Spec 004, RF-3: el ingreso es la pantalla principal; los enlaces viejos siguen andando. */
export default function IngresarPage() {
  redirect("/");
}
