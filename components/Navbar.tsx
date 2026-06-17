"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useCartStore } from "@/store/carstore";

const NAV_LINKS = [
  { href: "/",     label: "Inicio" },
  { href: "/menu", label: "Menú"   },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const count = items.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <header className="sticky top-0 z-50 bg-[#141414] border-b border-white/8">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* Logo + nombre */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/images/logo-bocado-supremo.png"
            alt="Bocado Supremo"
            width={36}
            height={36}
            className="object-contain rounded-full"
            priority
          />
          <span className="font-bold text-base text-white leading-none">
            Bocado <span className="text-orange-500">Supremo</span>
          </span>
        </Link>

        {/* Links desktop */}
        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Carrito + hamburguesa mobile */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/carrito"
            className="relative inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Carrito</span>
            {count > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-white text-orange-600 text-[10px] font-bold rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>

          <button
            aria-label="Abrir menú"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/8 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Menú desplegable mobile */}
      {mobileOpen && (
        <div className="md:hidden bg-[#141414] border-t border-white/8 px-4 py-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center px-3 py-3 rounded-xl text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
