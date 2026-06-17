"use client";

import Image from "next/image";
import { Plus, Clock } from "lucide-react";
import { useCartStore } from "@/store/carstore";

type ProductCardProps = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
};

const IMAGE_MAP: Record<string, string> = {
  // hamburguesas (en BD)
  "BBQ Cheese Burger":        "/images/hamburguesas/bbq-cheese-burger.jpg",
  "Doble Bacon Ham":          "/images/hamburguesas/doble-bacon-ham.jpg",
  "Hamburguesa BBQ":          "/images/hamburguesas/bbq-cheese-burger.jpg",
  "Hamburguesa Doble":        "/images/hamburguesas/doble-bacon-ham.jpg",
  "Hamburguesa Suprema":      "/images/hamburguesas/big-bocado.jpg",
  "La Quesuda":               "/images/hamburguesas/la-quesuda.jpg",
  "La Tica":                  "/images/hamburguesas/la-tica.jpg",
  "Mexican Burger":           "/images/hamburguesas/mexican-burger.jpg",
  "Real Cheese Burger":       "/images/hamburguesas/real-cheese-burger.jpg",
  // hamburguesas_premium (en BD)
  "Big Bocado":               "/images/hamburguesas/big-bocado.jpg",
  "Mar y Bocado":             "/images/hamburguesas/mar-y-bocado.jpg",
  "Super Bocado":             "/images/hamburguesas/super-bocado.jpg",
  "Texas Burger":             "/images/hamburguesas/texas-burger.jpg",
  // referencia (futuros)
  "Súper Bocado":             "/images/hamburguesas/super-bocado.jpg",
  "BBQ Chesse Bacon Burger":  "/images/hamburguesas/bbq-cheese-burger.jpg",
  "La Pollosa":               "/images/hamburguesas/la-pollosa.jpg",
  "Triple con Bacon":         "/images/hamburguesas/doble-bacon-ham.jpg",
  "Maple Cheese Burger":      "/images/hamburguesas/bbq-cheese-burger.jpg",
  "Black Wagyu 225":          "/images/hamburguesas/real-cheese-burger.jpg",
};

export default function ProductCard({
  id,
  nombre,
  descripcion,
  precio,
}: ProductCardProps) {
  const agregarProducto = useCartStore(
    (state) => state.agregarProducto
  );

  const imagen = IMAGE_MAP[nombre] ?? "/images/hamburguesas/big-bocado.jpg";

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      {/* Image */}
      <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden flex-shrink-0">
        <Image
          src={imagen}
          alt={nombre}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-gray-900">
          ₡{precio}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h2 className="text-sm font-semibold text-gray-900 line-clamp-1">
          {nombre}
        </h2>
        <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 flex-1 mb-3">
          {descripcion}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            <Clock size={12} />
            <span>20–30 min</span>
          </div>

          <button
            onClick={() =>
              agregarProducto({ id, nombre, precio, imagen_url: imagen })
            }
            className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
          >
            <Plus size={13} />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
