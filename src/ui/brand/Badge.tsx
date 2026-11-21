/** Insignia de El Colo (logo). */
export function Badge({ size = 40, dark = false }: { size?: number; dark?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logo vectorial propio
    <img
      src={dark ? "/brand/logo-el-colo-oscuro.svg" : "/brand/logo-el-colo.svg"}
      alt="El Colo, Barbería y Peluquería"
      width={size}
      height={size}
    />
  );
}
