import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "barber-colo",
  description: "Turnos online para la barbería",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
