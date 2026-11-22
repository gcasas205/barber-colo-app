import { err, ok, type Result } from "@/shared/kernel";
import { validateBirthday, validateName, type Birthday } from "./profile";

/** I-17: una cuenta tiene un titular y hasta 5 personas a cargo (P-16). */
export const DEPENDENTS_LIMIT = 5;

export type DependentInput = { name: string; birthday: Birthday | null };
export type DependentErrors = { name?: "NAME_LENGTH"; birthday?: "BIRTHDAY_INVALID" };

/** Spec 004b, RF-2 y RF-4: nombre (como el de la 002) y cumpleaños opcional; nada de contacto (I-18). */
export function validateDependent(input: DependentInput): Result<{ name: string; birthday: Birthday | null }, DependentErrors> {
  const errors: DependentErrors = {};
  const name = validateName(input.name.replace(/\s*\(demo\)\s*$/i, ""));
  if (!name.ok) errors.name = name.error;
  const birthday = input.birthday ? validateBirthday(input.birthday) : ok(null);
  if (!birthday.ok) errors.birthday = birthday.error;
  if (!name.ok || !birthday.ok) return err(errors);
  return ok({ name: name.value, birthday: birthday.value });
}

/** RF-25 de la 002: los datos de prueba llevan "(demo)" al final del nombre. */
export const withDemoMark = (name: string, isDemo: boolean) => (isDemo && !name.endsWith("(demo)") ? `${name} (demo)` : name);
