import { supabase } from "@/lib/supabase";
import PedidoCard from "@/components/cocina/PedidoCard";
import ResumenVentas from "@/components/cocina/ResumenVentas";
import { Utensils } from "lucide-react";
import type { Pedido } from "@/types/pedido";

export default async function CocinaPage() {
  const { data: rawPedidos } = await supabase
    .from("pedidos")
    .select(`
      *,
      pedido_items (
        id,
        nombre_producto,
        cantidad,
        precio
      )
    `)
    .neq("estado", "entregado")
    .order("created_at", { ascending: false });

  const pedidos = (rawPedidos ?? []) as Pedido[];

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
            <Utensils size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Panel de Cocina
            </h1>
            <p className="text-sm text-gray-500">
              {pedidos.length} pedidos activos
            </p>
          </div>
        </div>

        <ResumenVentas />

        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
            <span className="text-6xl block mb-4">🍳</span>
            <p className="font-semibold text-gray-500">
              No hay pedidos activos
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pedidos.map((pedido) => (
              <PedidoCard key={pedido.id} pedido={pedido} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
