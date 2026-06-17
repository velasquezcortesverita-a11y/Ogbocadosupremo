"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/carstore";

export default function CartSummary() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);

  const count = items.reduce((acc, item) => acc + item.cantidad, 0);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md px-4">
      <Link
        href="/carrito"
        className="flex items-center justify-between bg-gray-900 hover:bg-gray-800 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-black/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 rounded-xl p-1.5 shrink-0">
            <ShoppingBag size={17} />
          </div>
          <span className="font-semibold text-sm">
            {count} {count === 1 ? "producto" : "productos"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-bold text-orange-400">
            ₡{total()}
          </span>
          <span className="text-gray-400 text-xs">Ver pedido →</span>
        </div>
      </Link>
    </div>
  );
}
