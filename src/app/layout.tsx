import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

import { LifecycleModals } from "@/components/lifecycle-modals";

export const metadata: Metadata = {
  title: "BuildMetrics — Chiffrage IA pour Architectes",
  description:
    "Chiffrez automatiquement vos plans architecturaux en 15 secondes grâce à l'intelligence artificielle. Solution SaaS B2B pour architectes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <Suspense fallback={null}>
          <LifecycleModals />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
