import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/customer/ProductCard";
import CartSummary from "@/components/customer/CartSummary";

export default async function HamburguesasPage() {
  const [{ data: clasicas }, { data: premium }] = await Promise.all([
    supabase
      .from("productos")
      .select("*")
      .eq("categoria", "hamburguesas")
      .order("nombre"),
    supabase
      .from("productos")
      .select("*")
      .eq("categoria", "hamburguesas_premium")
      .order("nombre"),
  ]);

  const hamburguesasClasicas = clasicas ?? [];
  const hamburguesasPremium = premium ?? [];
  const hayProductos =
    hamburguesasClasicas.length > 0 || hamburguesasPremium.length > 0;

  return (
    <main className="pb-28">
      {/* Hero */}
      <section className="bg-gray-900 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-orange-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Bocado Supremo
          </p>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white mb-4">
            Hamburguesas
          </h1>
          <p className="text-gray-400 text-base sm:text-lg max-w-lg">
            Las mejores hamburguesas artesanales, hechas con ingredientes
            frescos y mucho sabor.
          </p>
        </div>
      </section>

      {!hayProductos ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400 max-w-7xl mx-auto px-4">
          <span className="text-6xl mb-4">🍔</span>
          <p className="font-semibold text-gray-500 text-lg">
            Próximamente disponibles
          </p>
          <p className="text-sm mt-1">
            Estamos preparando algo delicioso para ti.
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
          {/* Clásicas */}
          <section>
            <div className="bg-gray-900 text-white px-5 py-3 rounded-2xl mb-6 inline-flex items-center gap-3">
              <h2 className="text-base font-extrabold uppercase tracking-widest">
                Clásicas
              </h2>
              {hamburguesasClasicas.length > 0 && (
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {hamburguesasClasicas.length}
                </span>
              )}
            </div>

            {hamburguesasClasicas.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {hamburguesasClasicas.map((p) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    nombre={p.nombre}
                    descripcion={p.descripcion}
                    precio={p.precio}
                  />
                ))}
              </div>
            ) : (
              <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-400">
                <p className="font-medium">Próximamente disponible</p>
              </div>
            )}
          </section>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
              Premium
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Premium */}
          <section>
            <div className="bg-gradient-to-r from-gray-900 to-orange-900 text-white px-5 py-3 rounded-2xl mb-6 inline-flex items-center gap-3">
              <h2 className="text-base font-extrabold uppercase tracking-widest">
                Premium
              </h2>
              {hamburguesasPremium.length > 0 && (
                <span className="bg-orange-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {hamburguesasPremium.length}
                </span>
              )}
            </div>

            {hamburguesasPremium.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {hamburguesasPremium.map((p) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    nombre={p.nombre}
                    descripcion={p.descripcion}
                    precio={p.precio}
                  />
                ))}
              </div>
            ) : (
              <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-400">
                <p className="font-medium">Próximamente disponible</p>
              </div>
            )}
          </section>
        </div>
      )}

      <CartSummary />
    </main>
  );
}
