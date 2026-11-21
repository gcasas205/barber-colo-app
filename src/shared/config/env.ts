import { z } from "zod";

/**
 * Variables de entorno del servidor, validadas al primer uso (no al importar: el build no las necesita).
 * Nunca se leen desde el navegador: ninguna empieza con NEXT_PUBLIC_.
 */
const schema = z.object({
  /** Conexión del rol app_server por el pooler de Supabase (modo transacción). */
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Reemplaza al certificado raíz de Supabase incluido en el código (PEM), por si Supabase lo rota. */
  DATABASE_CA_CERT: z.string().includes("BEGIN CERTIFICATE").optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function serverEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  if (source === process.env && cached) return cached;
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    // Solo los nombres de las variables con problemas: nunca sus valores.
    const names = [...new Set(parsed.error.issues.map((i) => i.path.join(".")))].join(", ");
    throw new Error(`Faltan o son inválidas estas variables de entorno: ${names}`);
  }
  if (source === process.env) cached = parsed.data;
  return parsed.data;
}

/** Variables de la sesión (spec 002). Separadas de serverEnv: la página pública no las necesita. */
const authSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  /** Clave publicable de Supabase (no es secreta). */
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  /** "true" mientras duren los usuarios de prueba (D-11): los apaga Gonzalo al publicar. */
  // Tolerante con cómo se carga en un panel: espacios, saltos de línea, comillas o mayúsculas.
  DEMO_ENABLED: z
    .string()
    .default("false")
    .transform((v) => v.trim().replace(/^["']|["']$/g, "").toLowerCase())
    .pipe(z.enum(["true", "false"], { message: 'tiene que ser "true" o "false"' }))
    .transform((v) => v === "true"),
  /** Email de la cuenta de Google de Colo (spec de publicación). */
  BARBER_EMAIL: z.email().optional(),
  /** Para guardar la IP de los intentos como hash (RF-18b). */
  IP_HASH_PEPPER: z.string().min(32).optional(),
});

export type AuthEnv = z.infer<typeof authSchema>;

export function authEnv(source: Record<string, string | undefined> = process.env): AuthEnv {
  const parsed = authSchema.safeParse(source);
  if (!parsed.success) {
    // Nombre de la variable y qué se espera; nunca el valor (puede ser un secreto).
    const names = [...new Set(parsed.error.issues.map((i) => `${i.path.join(".")} (${i.message})`))].join(", ");
    throw new Error(`Faltan o son inválidas estas variables de entorno: ${names}`);
  }
  return parsed.data;
}
