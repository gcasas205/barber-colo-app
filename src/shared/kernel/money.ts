/** Formatea centavos como pesos argentinos: 1_800_000 → "$ 18.000"; con centavos, "$ 18.000,50". */
export function formatPesos(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`Monto inválido en centavos: ${cents}`);
  const pesos = Math.floor(cents / 100);
  const rest = cents % 100;
  // Separador de miles a mano: no depende de los datos de ICU de cada máquina.
  const thousands = String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return rest === 0 ? `$ ${thousands}` : `$ ${thousands},${String(rest).padStart(2, "0")}`;
}
