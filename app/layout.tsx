import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { DeliveryModalPortal } from "@/components/delivery-modal";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bocado Supremo — Comida rápida premium",
  description:
    "Las mejores hamburguesas, pizzas y más. Pide en línea y recibe en minutos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`${inter.className} min-h-full flex flex-col bg-[#141414]`}>
        <Navbar />
        <DeliveryModalPortal />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
