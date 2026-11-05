import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Una sola familia con eje de anchura: expandida para títulos,
// condensada para etiquetas de carta y datos.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "EarthWatch — Eventos naturales en curso",
  description:
    "Carta interactiva de incendios, tormentas, volcanes y hielo a la deriva, con datos de NASA EONET e imágenes satelitales de NASA GIBS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
