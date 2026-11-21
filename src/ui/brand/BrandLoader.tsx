/**
 * Pantalla de carga con el logo (UI-01): el borde de poste gira y el bigote hace un tic.
 * Usa los SVG animados de /public/brand; con movimiento reducido quedan quietos.
 */
export function BrandLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG animado propio, sin optimizar */}
      <img src="/brand/loader-el-colo.svg" alt="" width={132} height={132} className="dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG animado propio, sin optimizar */}
      <img src="/brand/loader-el-colo-oscuro.svg" alt="" width={132} height={132} className="hidden dark:block" />
      <p className="text-[16px] font-bold text-tinta">{label}</p>
    </div>
  );
}
