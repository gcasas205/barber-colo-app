import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/standard.css";
import "@fontsource-variable/atkinson-hyperlegible-next/index.css";
import "./globals.css";
import { themeBootScript } from "./_tema/theme";

export const metadata: Metadata = {
  title: "El Colo · Barbería y Peluquería",
  description: "Reservá tu turno en la barbería de Colo.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1d2f52" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script del <head> pone data-theme antes de que React hidrate (RF-17).
    <html lang="es-AR" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
