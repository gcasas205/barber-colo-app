import { cx } from "./cx";

/** El poste: banda de rayas que avanzan como un poste de barbero girando. Decorativa. */
export function PoleBand({ className }: { className?: string }) {
  return <div aria-hidden className={cx("poste h-2 w-full", className)} />;
}
