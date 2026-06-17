"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, ShoppingBag, Sandwich } from "lucide-react";
import { useCartStore } from "@/store/carstore";

export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string | null;
  disponible: boolean;
  imagen_url: string | null;
  tiempo_prep_min: number | null;
};

export type Categoria = {
  id: string;
  nombre: string;
  orden: number;
  productos: Producto[];
};

const fmt = (n: number) => "₡" + Number(n).toLocaleString("es-CR");

function ExtraChip({ producto }: { producto: Producto }) {
  const agregarProducto  = useCartStore((s) => s.agregarProducto);
  const eliminarProducto = useCartStore((s) => s.eliminarProducto);
  const enCarrito        = useCartStore((s) => s.items.some((i) => i.id === producto.id));

  return (
    <button
      onClick={() => {
        if (enCarrito) {
          eliminarProducto(producto.id);
        } else {
          agregarProducto({
            id:     producto.id,
            nombre: producto.nombre,
            precio: Number(producto.precio),
          });
        }
      }}
      className={`inline-flex items-center gap-2 rounded-full border transition-all duration-150 cursor-pointer ${
        enCarrito
          ? "border-orange-500 bg-orange-50"
          : "border-gray-200 bg-transparent hover:border-orange-400/50"
      }`}
      style={{ padding: "7px 12px" }}
    >
      <span
        className={`text-[13px] leading-none ${
          enCarrito ? "text-orange-600 font-medium" : "text-gray-700"
        }`}
      >
        {producto.nombre}
      </span>
      <span
        style={{
          background:   "rgba(249,115,22,0.12)",
          borderRadius: "10px",
          padding:      "2px 7px",
          fontSize:     "11px",
          color:        "#f97316",
          fontWeight:   500,
          lineHeight:   1.4,
        }}
      >
        ₡{Number(producto.precio).toLocaleString("es-CR")}
      </span>
    </button>
  );
}

function ProductCard({ producto }: { producto: Producto }) {
  const agregarProducto = useCartStore((s) => s.agregarProducto);

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Imagen */}
      <div className="relative h-40 sm:h-48 overflow-hidden">
        {producto.imagen_url ? (
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-900 to-orange-950">
            <Sandwich className="w-16 h-16 text-orange-500/20" />
          </div>
        )}

        {/* Badge precio */}
        <div className="absolute top-3 right-3 z-10 bg-white rounded-full px-3 py-1 text-xs font-bold text-gray-900 shadow">
          {fmt(producto.precio)}
        </div>
      </div>

      {/* Cuerpo */}
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 mb-1 leading-tight">
          {producto.nombre}
        </p>

        {producto.descripcion && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
            {producto.descripcion}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <span className="text-sm font-bold text-orange-500">
            {fmt(producto.precio)}
          </span>
          <button
            onClick={() =>
              agregarProducto({
                id: producto.id,
                nombre: producto.nombre,
                precio: Number(producto.precio),
              })
            }
            className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
          >
            <Plus size={12} />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuClient({ categorias }: { categorias: Categoria[] }) {
  const [categoriaActiva, setCategoriaActiva] = useState<string>("todos");

  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const router = useRouter();

  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  const categoriasFiltradas =
    categoriaActiva === "todos"
      ? categorias
      : categorias.filter((c) => c.id === categoriaActiva);

  return (
    <>
      {/* Hero */}
      <div className="bg-gray-900 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-2">
            Bocado Supremo
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white">
            Nuestro Menú
          </h1>
          <p className="text-gray-400 mt-2 text-sm sm:text-base">
            Ingredientes frescos, sabor inigualable.
          </p>
        </div>
      </div>

      {/* Tabs de categoría */}
      {categorias.length > 0 && (
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
              <button
                onClick={() => setCategoriaActiva("todos")}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm border font-medium whitespace-nowrap transition-all duration-200 ${
                  categoriaActiva === "todos"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Todos
              </button>

              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaActiva(cat.id)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm border font-medium whitespace-nowrap transition-all duration-200 ${
                    categoriaActiva === cat.id
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Secciones */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28">
        {categorias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
            <span className="text-6xl mb-4">🍽️</span>
            <p className="font-semibold text-gray-500">
              Menú próximamente disponible
            </p>
          </div>
        ) : (
          categoriasFiltradas.map((cat) => {
            const disponibles = cat.productos.filter((p) => p.disponible);
            if (disponibles.length === 0) return null;

            const esExtras = cat.nombre.toLowerCase().trim() === "extras";

            return (
              <section key={cat.id} className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-orange-500 rounded" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {cat.nombre}
                  </h2>
                </div>

                {esExtras ? (
                  <div className="flex flex-wrap gap-1.5">
                    {disponibles.map((p) => (
                      <ExtraChip key={p.id} producto={p} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {disponibles.map((p) => (
                      <ProductCard key={p.id} producto={p} />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      {/* Barra de carrito flotante */}
      {totalItems > 0 && (
        <div
          role="button"
          onClick={() => router.push("/carrito")}
          className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white px-5 py-4 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-400" />
            <span className="text-sm">
              {totalItems} {totalItems === 1 ? "producto" : "productos"}
            </span>
          </div>
          <span className="font-semibold">{fmt(total())}</span>
          <span className="text-orange-400 font-medium text-sm">
            Ver pedido →
          </span>
        </div>
      )}
    </>
  );
}
