import { z } from "zod";

/**
 * Variables de entorno del servidor, validadas al primer uso (no al importar: el build no las necesita).
 * Nunca se leen desde el navegador: ninguna empieza con NEXT_PUBLIC_.
 */
const schema = z.object({
  /** Conexión del rol app_server por el pooler de Supabase (modo transacción). */
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Certificado raíz de Supabase (PEM). Obligatorio para cualquier base que no sea la local (S-2). */
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
