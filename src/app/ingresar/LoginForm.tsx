"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/ui/Button";
import { Field, TextInput } from "@/ui/Field";
import { FormAlert } from "../_sesion/FormBits";
import { errorText } from "../_sesion/messages";
import { signInWithPassword, type LoginState } from "./actions";

/**
 * Cuentas de prueba (D-11, RF-22). Como en Corralap, tocar una completa el formulario. Sus contraseñas
 * son públicas a propósito y solo sirven mientras la demo está activa (DEMO_ENABLED).
 */
const DEMO_USERS = [
  { role: "Colo (barbero)", email: "colo@example.com", password: "colo1234" },
  { role: "Cliente de prueba 1", email: "cliente1@example.com", password: "cliente1234" },
  { role: "Cliente de prueba 2", email: "cliente2@example.com", password: "cliente1234" },
];

export function LoginForm({ showDemoUsers }: { showDemoUsers: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signInWithPassword, {});
  const [email, setEmail] = useState(state.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {state.error ? <FormAlert title="No pudimos ingresar">{errorText(state.error)?.replace("No pudimos ingresar. ", "")}</FormAlert> : null}

      <form action={action} className="flex flex-col gap-5">
        <Field label="Correo">
          <TextInput
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="nombre@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
        </Field>
        <Field label="Contraseña">
          <span className="relative block">
            <TextInput
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              className="w-full pr-14"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-[10px] text-tinta-suave hover:bg-esmalte-100 hover:text-tinta"
            >
              {showPassword ? <EyeOff aria-hidden size={22} /> : <Eye aria-hidden size={22} />}
            </button>
          </span>
        </Field>
        <Button type="submit" variant="principal" disabled={pending} className="w-full">
          {pending ? "Ingresando…" : "Ingresar"}
          {!pending && <ArrowRight aria-hidden size={22} strokeWidth={2.5} />}
        </Button>
      </form>

      {showDemoUsers ? (
        <section aria-labelledby="titulo-demo" className="flex flex-col gap-2 border-t-2 border-linea pt-6">
          <h2 id="titulo-demo" className="text-[15px] font-bold text-tinta-suave">
            Modo de prueba · tocá una cuenta para completar el formulario
          </h2>
          <ul className="flex flex-col gap-2">
            {DEMO_USERS.map((u) => (
              <li key={u.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                  }}
                  className="flex min-h-[56px] w-full min-w-0 items-center justify-between gap-3 rounded-[var(--radius-control)] bg-chapa px-4 py-3 text-left shadow-[var(--shadow-chapa-clara)] hover:shadow-[inset_0_0_0_2px_var(--esmalte-200)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-poste"
                >
                  <span className="shrink-0 font-bold">{u.role}</span>
                  <span className="min-w-0 truncate text-[15px] text-tinta-suave">{u.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
