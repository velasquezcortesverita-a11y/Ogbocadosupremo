"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, ShoppingBag, Sandwich } from "lucide-react";
import { useCartStore } from "@/store/carstore";
import MenuHeroSlideshow from "@/components/menu/MenuHeroSlideshow";
import RepetirPedido from "@/components/RepetirPedido";

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

function slugify(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
}

function ExtraChip({ producto }: { producto: Producto }) {
  const agregarProducto  = useCartStore((s) => s.agregarProducto);
  const eliminarProducto = useCartStore((s) => s.eliminarProducto);
  const enCarrito        = useCartStore((s) => s.items.some((i) => i.id === producto.id));
  const disponible       = producto.disponible ?? true;

  return (
    <button
      onClick={() => {
        if (!disponible) return;
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
      className={`inline-flex items-center gap-2 rounded-full border transition-all duration-150 ${
        !disponible
          ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
          : enCarrito
          ? "border-orange-500 bg-orange-50 cursor-pointer"
          : "border-gray-200 bg-transparent hover:border-orange-400/50 cursor-pointer"
      }`}
      style={{ padding: "7px 12px" }}
    >
      <span
        className={`text-[13px] leading-none ${
          !disponible ? "text-gray-400 line-through" : enCarrito ? "text-orange-600 font-medium" : "text-gray-700"
        }`}
      >
        {producto.nombre}
      </span>
      <span
        style={{
          background:   disponible ? "rgba(249,115,22,0.12)" : "rgba(0,0,0,0.06)",
          borderRadius: "10px",
          padding:      "2px 7px",
          fontSize:     "11px",
          color:        disponible ? "#f97316" : "#9ca3af",
          fontWeight:   500,
          lineHeight:   1.4,
        }}
      >
        {disponible ? `₡${Number(producto.precio).toLocaleString("es-CR")}` : "Agotado"}
      </span>
    </button>
  );
}

// ─── Bebidas ─────────────────────────────────────────────────────────────────

type GrupoBebida = { nombre: string; emoji: string; productos: Producto[] };

function agruparBebidas(productos: Producto[]): GrupoBebida[] {
  const esCerveza = (n: string) => /cerveza|michelada/i.test(n);
  const esGaseosa = (n: string) => /gaseosa|soda/i.test(n) && !esCerveza(n);

  return [
    { nombre: "Gaseosas", emoji: "🥤", productos: productos.filter((p) => esGaseosa(p.nombre)) },
    { nombre: "Cervezas", emoji: "🍺", productos: productos.filter((p) => esCerveza(p.nombre)) },
    { nombre: "Otras",    emoji: "🧃", productos: productos.filter((p) => !esGaseosa(p.nombre) && !esCerveza(p.nombre)) },
  ].filter((g) => g.productos.length > 0);
}

function BebidaChip({ producto, emoji }: { producto: Producto; emoji: string }) {
  const agregarProducto  = useCartStore((s) => s.agregarProducto);
  const eliminarProducto = useCartStore((s) => s.eliminarProducto);
  const enCarrito        = useCartStore((s) => s.items.some((i) => i.id === producto.id));
  const disponible       = producto.disponible ?? true;

  return (
    <button
      onClick={() => {
        if (!disponible) return;
        if (enCarrito) {
          eliminarProducto(producto.id);
        } else {
          agregarProducto({ id: producto.id, nombre: producto.nombre, precio: Number(producto.precio) });
        }
      }}
      className={`inline-flex items-center rounded-full border transition-all duration-150 ${
        !disponible
          ? "border-gray-200 opacity-50 cursor-not-allowed"
          : enCarrito
          ? "border-orange-500 cursor-pointer"
          : "border-gray-200 hover:border-orange-400/40 cursor-pointer"
      }`}
      style={{
        gap:        "10px",
        padding:    "8px 14px",
        background: !disponible ? "#f9fafb" : enCarrito ? "rgba(249,115,22,0.08)" : "transparent",
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1, opacity: disponible ? 1 : 0.4 }}>{emoji}</span>
      <span
        className={`text-xs leading-none ${
          !disponible ? "text-gray-400 line-through" : enCarrito ? "text-orange-600 font-medium" : "text-gray-700"
        }`}
      >
        {producto.nombre}
      </span>
      <span
        style={{
          background:   disponible ? "rgba(249,115,22,0.10)" : "rgba(0,0,0,0.06)",
          borderRadius: "10px",
          padding:      "2px 8px",
          fontSize:     "11px",
          color:        disponible ? "#f97316" : "#9ca3af",
          fontWeight:   500,
          lineHeight:   1.4,
        }}
      >
        {disponible ? `₡${Number(producto.precio).toLocaleString("es-CR")}` : "Agotado"}
      </span>
    </button>
  );
}

function BebidasSection({ productos }: { productos: Producto[] }) {
  const grupos = agruparBebidas(productos);
  return (
    <div className="flex flex-col gap-6">
      {grupos.map((grupo) => (
        <div key={grupo.nombre}>
          <p
            style={{
              fontSize:      "10px",
              fontWeight:    600,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color:         "#9ca3af",
              marginBottom:  "10px",
            }}
          >
            {grupo.nombre}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {grupo.productos.map((p) => (
              <BebidaChip key={p.id} producto={p} emoji={grupo.emoji} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tarjeta producto ─────────────────────────────────────────────────────────

function ProductCard({ producto }: { producto: Producto }) {
  const agregarProducto = useCartStore((s) => s.agregarProducto);
  const disponible      = producto.disponible ?? true;

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
            style={{ filter: disponible ? "none" : "grayscale(1)", opacity: disponible ? 1 : 0.4 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-900 to-orange-950" style={{ opacity: disponible ? 1 : 0.4 }}>
            <Sandwich className="w-16 h-16 text-orange-500/20" />
          </div>
        )}

        {/* Badge precio */}
        <div className="absolute top-3 right-3 z-10 bg-white rounded-full px-3 py-1 text-xs font-bold text-gray-900 shadow">
          {fmt(producto.precio)}
        </div>

        {/* Badge Agotado */}
        {!disponible && (
          <div style={{
            position: "absolute", bottom: 6, left: 6, zIndex: 10,
            background: "rgba(0,0,0,0.7)", color: "#fff",
            borderRadius: 4, fontSize: 9, fontWeight: 600,
            padding: "2px 6px", letterSpacing: "0.04em",
          }}>
            Agotado
          </div>
        )}
      </div>

      {/* Cuerpo */}
      <div className="p-3">
        <p className={`text-sm font-semibold mb-1 leading-tight ${disponible ? "text-gray-900" : "text-gray-400"}`}>
          {producto.nombre}
        </p>

        {producto.descripcion && (
          <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
            {producto.descripcion}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <span className={`text-sm font-bold ${disponible ? "text-orange-500" : "text-gray-400"}`}>
            {fmt(producto.precio)}
          </span>
          {disponible ? (
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
          ) : (
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full font-medium cursor-not-allowed">
              No disponible
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MenuClient({
  categorias,
  initialCategoria = "",
}: {
  categorias: Categoria[];
  initialCategoria?: string;
}) {
  const [categoriaActiva, setCategoriaActiva] = useState<string>("todos");

  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const router = useRouter();

  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  useEffect(() => {
    if (!initialCategoria || categorias.length === 0) return;
    const match = categorias.find((cat) => slugify(cat.nombre) === initialCategoria);
    if (!match) return;
    setCategoriaActiva(match.id);
    setTimeout(() => {
      const el = document.getElementById(`cat-${match.id}`);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }, 150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoriasFiltradas =
    categoriaActiva === "todos"
      ? categorias
      : categorias.filter((c) => c.id === categoriaActiva);

  return (
    <>
      {/* Hero */}
      <div
        className="relative overflow-hidden py-12 px-4"
        style={{ background: "#0d1117" }}
      >
        <MenuHeroSlideshow />
        <div className="max-w-5xl mx-auto relative z-10">
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
        <RepetirPedido />
        {categorias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
            <span className="text-6xl mb-4">🍽️</span>
            <p className="font-semibold text-gray-500">
              Menú próximamente disponible
            </p>
          </div>
        ) : (
          categoriasFiltradas.map((cat) => {
            if (cat.productos.length === 0) return null;

            const nombreCat = cat.nombre.toLowerCase().trim();
            const esExtras  = nombreCat === "extras";
            const esBebidas = nombreCat === "bebidas";

            return (
              <section key={cat.id} id={`cat-${cat.id}`} className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-orange-500 rounded" />
                  <h2 className="text-xl font-bold text-gray-900">
                    {cat.nombre}
                  </h2>
                </div>

                {esBebidas ? (
                  <BebidasSection productos={cat.productos} />
                ) : esExtras ? (
                  <div className="flex flex-wrap gap-1.5">
                    {cat.productos.map((p) => (
                      <ExtraChip key={p.id} producto={p} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {cat.productos.map((p) => (
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
