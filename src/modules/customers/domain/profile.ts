import { err, ok, type Result } from "@/shared/kernel";

/** RF-10b: de 2 a 40 caracteres, sin espacios de más. Se aceptan tildes y emojis. */
export function validateName(raw: string): Result<string, "NAME_LENGTH"> {
  if (/[\u0000-\u001f\u007f]/.test(raw)) return err("NAME_LENGTH"); // saltos de línea y caracteres de control
  const name = raw.trim().replace(/\s+/g, " ");
  const length = Array.from(name).length;
  return length >= 2 && length <= 40 ? ok(name) : err("NAME_LENGTH");
}

/** Cumpleaños: día y mes, sin año (P-15 solo necesita eso). El 29 de febrero vale. */
export type Birthday = { day: number; month: number };

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function validateBirthday(b: Birthday): Result<Birthday, "BIRTHDAY_INVALID"> {
  const { day, month } = b;
  if (!Number.isInteger(day) || !Number.isInteger(month) || month < 1 || month > 12) return err("BIRTHDAY_INVALID");
  return day >= 1 && day <= DAYS_IN_MONTH[month - 1]! ? ok({ day, month }) : err("BIRTHDAY_INVALID");
}
