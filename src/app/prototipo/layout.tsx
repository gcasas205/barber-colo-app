import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prototipo · El Colo",
  robots: { index: false, follow: false },
};

export default function PrototypeLayout({ children }: LayoutProps<"/prototipo">) {
  return <div className="flex min-h-dvh w-full flex-col bg-porcelana">{children}</div>;
}
