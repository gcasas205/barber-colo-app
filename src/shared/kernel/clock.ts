/**
 * Reloj del navegador anclado a la hora del servidor (caso límite 14): parte de `serverNowMs` y avanza
 * con el tiempo transcurrido (performance.now, que es monótono), así un celular con la hora mal
 * configurada igual ve los horarios correctos.
 */
export function serverClock(serverNowMs: number, elapsedMs: () => number = () => performance.now()): () => Date {
  const startedAt = elapsedMs();
  return () => new Date(serverNowMs + (elapsedMs() - startedAt));
}
