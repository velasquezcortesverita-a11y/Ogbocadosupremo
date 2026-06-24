import { supabase } from "@/lib/supabase";
import CocinaTabsWrapper from "@/components/cocina/CocinaTabsWrapper";
import CocinaListado from "@/components/cocina/CocinaListado";
import ResumenVentas from "@/components/cocina/ResumenVentas";
import CocinaNotifButton from "@/components/cocina/CocinaNotifButton";
import { Utensils } from "lucide-react";
import type { Pedido } from "@/types/pedido";

export const dynamic = "force-dynamic";

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
    .neq("estado", "pago_rechazado")
    .order("created_at", { ascending: false });

  const pedidos = (rawPedidos ?? []) as Pedido[];

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-sm">
            <Utensils size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Panel de Cocina</h1>
          <div className="ml-auto">
            <CocinaNotifButton />
          </div>
        </div>

        {/* Tabs wrapper: Pedidos | Productos */}
        <CocinaTabsWrapper>
          {/* Slot "Pedidos" — contenido existente */}
          <ResumenVentas />
          <CocinaListado initialPedidos={pedidos} />
        </CocinaTabsWrapper>

      </div>
    </main>
  );
}
