"use server";

import { createClient } from "@/lib/supabase/server";

export async function getResumenVentas() {
  const supabase = await createClient();

  const hoy = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("pedidos")
    .select("total, metodo_pago")
    .eq("estado", "entregado")
    .gte("created_at", hoy + "T00:00:00.000Z")
    .lte("created_at", hoy + "T23:59:59.999Z");

  if (error || !data) return null;

  const sum = (metodo: string) =>
    data
      .filter((p) => p.metodo_pago === metodo)
      .reduce((acc, p) => acc + Number(p.total), 0);

  const count = (metodo: string) =>
    data.filter((p) => p.metodo_pago === metodo).length;

  return {
    sinpe:    { total: sum("sinpe"),    cantidad: count("sinpe")    },
    efectivo: { total: sum("efectivo"), cantidad: count("efectivo") },
    tarjeta:  { total: sum("tarjeta"),  cantidad: count("tarjeta")  },
    general:  {
      total:    data.reduce((acc, p) => acc + Number(p.total), 0),
      cantidad: data.length,
    },
  };
}
