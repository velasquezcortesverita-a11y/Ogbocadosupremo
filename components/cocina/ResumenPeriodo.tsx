"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

type Periodo = "semana" | "mes";

type ReportePeriodo = {
  total: number;
  cantidadPedidos: number;
  topProductos: { nombre: string; cantidad: number }[];
  diaMasFuerte: string;
  horaPico: number;
};

const DIAS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
const fmt  = (n: number) => `₡${n.toLocaleString("es-CR")}`;

function fmtHora(h: number): string {
  if (h === 0)  return "12:00 am";
  if (h < 12)   return `${h}:00 am`;
  if (h === 12) return "12:00 pm";
  return `${h - 12}:00 pm`;
}

function getRangoCR(periodo: Periodo): { start: string; end: string } {
  const now    = new Date();
  const crMs   = now.getTime() - 6 * 60 * 60 * 1000;
  const crDate = new Date(crMs);
  const y      = crDate.getUTCFullYear();
  const m      = crDate.getUTCMonth();
  const d      = crDate.getUTCDate();

  if (periodo === "semana") {
    const dow   = crDate.getUTCDay();
    const diff  = dow === 0 ? 6 : dow - 1;
    const start = new Date(Date.UTC(y, m, d - diff, 6, 0, 0));
    return { start: start.toISOString(), end: now.toISOString() };
  }
  const start = new Date(Date.UTC(y, m, 1, 6, 0, 0));
  return { start: start.toISOString(), end: now.toISOString() };
}

export default function ResumenPeriodo() {
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [loading, setLoading] = useState(true);
  const [data,    setData]    = useState<ReportePeriodo | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { start, end } = getRangoCR(periodo);

    const [{ data: cierres }, { data: pedidosRaw }] = await Promise.all([
      supabase
        .from("cierres_dia")
        .select("total_general, cantidad_pedidos")
        .gte("fecha", start)
        .lte("fecha", end),
      supabase
        .from("pedidos")
        .select("created_at, pedido_items(nombre_producto, cantidad)")
        .eq("estado", "entregado")
        .gte("created_at", start)
        .lte("created_at", end),
    ]);

    const total           = (cierres ?? []).reduce((a, c) => a + Number(c.total_general), 0);
    const cantidadPedidos = (cierres ?? []).reduce((a, c) => a + Number(c.cantidad_pedidos), 0);

    const pedidos = pedidosRaw ?? [];

    const conteo: Record<string, number> = {};
    for (const p of pedidos) {
      for (const item of ((p.pedido_items ?? []) as { nombre_producto: string; cantidad: number }[])) {
        conteo[item.nombre_producto] = (conteo[item.nombre_producto] ?? 0) + item.cantidad;
      }
    }
    const topProductos = Object.entries(conteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    const dayCounts = Array<number>(7).fill(0);
    for (const p of pedidos) {
      const crMs = new Date(p.created_at).getTime() - 6 * 60 * 60 * 1000;
      dayCounts[new Date(crMs).getUTCDay()]++;
    }
    const diaMasFuerte = DIAS[dayCounts.indexOf(Math.max(...dayCounts))];

    const hourCounts = Array<number>(24).fill(0);
    for (const p of pedidos) {
      const crMs = new Date(p.created_at).getTime() - 6 * 60 * 60 * 1000;
      hourCounts[new Date(crMs).getUTCHours()]++;
    }
    const horaPico = hourCounts.indexOf(Math.max(...hourCounts));

    setData({ total, cantidadPedidos, topProductos, diaMasFuerte, horaPico });
    setLoading(false);
  }, [periodo]);

  useEffect(() => { cargar(); }, [cargar]);

  const btnBase: React.CSSProperties = {
    padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 500,
    cursor: "pointer", border: "1px solid rgba(0,0,0,0.1)", background: "rgba(0,0,0,0)",
    color: "#6b7280",
  };
  const btnActivo: React.CSSProperties = {
    ...btnBase,
    border: "1px solid rgba(249,115,22,0.35)",
    background: "rgba(249,115,22,0.08)",
    color: "#f97316",
  };

  const hasSinDatos = !data || (data.cantidadPedidos === 0 && data.topProductos.length === 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["semana", "mes"] as const).map((p) => (
          <button key={p} type="button" onClick={() => setPeriodo(p)} style={periodo === p ? btnActivo : btnBase}>
            {p === "semana" ? "Esta semana" : "Este mes"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: "#f97316" }} />
        </div>
      ) : hasSinDatos ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>
          Sin datos para este período
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Total del período */}
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 4px" }}>Total del período</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: "#f97316", margin: "0 0 4px" }}>{fmt(data!.total)}</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{data!.cantidadPedidos} pedidos entregados</p>
          </div>

          {/* Top productos */}
          {data!.topProductos.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
                Top productos
              </p>
              {data!.topProductos.map((p, i) => (
                <div key={p.nombre} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < data!.topProductos.length - 1 ? "0.5px solid #f3f4f6" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: i === 0 ? "#f97316" : "#f3f4f6",
                      color: i === 0 ? "#fff" : "#9ca3af",
                      fontSize: 9, fontWeight: 700,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 12, color: "#374151" }}>{p.nombre}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? "#f97316" : "#9ca3af" }}>
                    ×{p.cantidad}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Día más activo + Hora pico */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 6px" }}>Día más activo</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>{data!.diaMasFuerte}</p>
            </div>
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 6px" }}>Hora pico</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>{fmtHora(data!.horaPico)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
