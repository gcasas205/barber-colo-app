import type { PoolConfig } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
// Parámetros de la URL que pg usaría para armar su propia configuración TLS y que pisarían la nuestra.
const SSL_PARAMS = ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"];

/**
 * Configuración del pool de pg (S-2): la base local va sin TLS; cualquier otra exige TLS verificando el
 * certificado de Supabase. No hay forma de desactivar la verificación: sin certificado, no conecta.
 */
export function poolConfig(databaseUrl: string, caCert: string | undefined): PoolConfig {
  const url = new URL(databaseUrl);
  for (const param of SSL_PARAMS) url.searchParams.delete(param);

  const base: PoolConfig = {
    connectionString: url.toString(),
    // Una conexión por instancia: Vercel levanta muchas y el pooler de Supabase reparte (ADR-02).
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  };

  if (LOCAL_HOSTS.has(url.hostname)) return { ...base, ssl: false };
  if (!caCert) throw new Error("DATABASE_CA_CERT es obligatorio para conectarse a una base que no es la local");
  return { ...base, ssl: { ca: caCert, rejectUnauthorized: true } };
}
