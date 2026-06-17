"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PedidoCard from "@/components/cocina/PedidoCard";
import type { Pedido } from "@/types/pedido";

export default function CocinaListado({ initialPedidos }: { initialPedidos: Pedido[] }) {
  const [pedidos, setPedidos] = useState<Pedido[]>(initialPedidos);

  useEffect(() => {
    // Suscripción Realtime: nuevos pedidos INSERT
    const canal = supabase
      .channel("cocina-pedidos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedidos" },
        async (payload) => {
          // El payload solo trae la fila base; necesitamos los items
          const { data } = await supabase
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
            .eq("id", (payload.new as { id: string }).id)
            .single();

          if (data) {
            setPedidos((prev) => [data as Pedido, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // Llamado desde PedidoCard tras confirmar el UPDATE en Supabase
  function handleEntregado(id: string) {
    window.dispatchEvent(new CustomEvent("resumen-actualizar"));
    setPedidos((prev) => prev.filter((p) => p.id !== id));
  }

  const count = pedidos.length;

  return (
    <>
      <p className="text-sm text-gray-500 mb-6">
        {count} {count === 1 ? "pedido activo" : "pedidos activos"}
      </p>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
          <span className="text-6xl block mb-4">🍳</span>
          <p className="font-semibold text-gray-500">No hay pedidos activos</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pedidos.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              onEntregado={() => handleEntregado(pedido.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
