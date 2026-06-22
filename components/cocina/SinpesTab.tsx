"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import type { Pedido } from "@/types/pedido";

function todayCRRange(): { gte: string; lte: string } {
  // Costa Rica: UTC-6, sin cambio de hora (DST)
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const crMs  = utcMs - 6 * 60 * 60000;
  const cr    = new Date(crMs);

  const y  = cr.getFullYear();
  const mo = String(cr.getMonth() + 1).padStart(2, "0");
  const d  = String(cr.getDate()).padStart(2, "0");

  const gte = new Date(`${y}-${mo}-${d}T06:00:00.000Z`);       // 00:00 CR → 06:00 UTC
  const lte = new Date(gte.getTime() + 24 * 60 * 60 * 1000 - 1); // 23:59:59 CR

  return { gte: gte.toISOString(), lte: lte.toISOString() };
}

function horaCorta(isoString: string): string {
  const d      = new Date(isoString);
  const utcMs  = d.getTime() + d.getTimezoneOffset() * 60000;
  const crDate = new Date(utcMs - 6 * 60 * 60000);
  return `${String(crDate.getHours()).padStart(2, "0")}:${String(crDate.getMinutes()).padStart(2, "0")}`;
}

export default function SinpesTab() {
  const [sinpes,  setSinpes]  = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const { gte, lte } = todayCRRange();
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, nombre_cliente, total, comprobante_url, created_at")
      .eq("comprobante_revisado", true)
      .gte("created_at", gte)
      .lte("created_at", lte)
      .order("created_at", { ascending: false });

    setSinpes((data ?? []) as Pedido[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargar();

    const ch = supabase
      .channel("sinpes-tab-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
        cargar();
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [cargar]);

  const totalDia = sinpes.reduce((acc, p) => acc + Number(p.total), 0);

  return (
    <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 20 }}>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: "rgba(255,255,255,0.25)" }} />
        </div>
      ) : sinpes.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "32px 0", margin: 0 }}>
          Aún no hay comprobantes confirmados hoy
        </p>
      ) : (
        <>
          {/* Resumen del día */}
          <div style={{
            background: "rgba(34,197,94,0.07)",
            border: "1px solid rgba(34,197,94,0.15)",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>Total confirmado hoy</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#f97316" }}>
              ₡{totalDia.toLocaleString("es-CR")}
            </span>
          </div>

          {/* Lista */}
          {sinpes.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 0",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {/* Thumbnail con ✓ */}
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", position: "relative",
              }}>
                {p.comprobante_url && (
                  <img
                    src={p.comprobante_url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.6 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <span style={{
                  position: "absolute",
                  fontSize: 13, fontWeight: 700, color: "#22c55e",
                  textShadow: "0 0 4px rgba(0,0,0,0.7)",
                }}>✓</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: "#111827", margin: 0 }}>
                  Pedido #{p.numero_pedido}
                </p>
                <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, marginTop: 1 }}>
                  {p.nombre_cliente} · {horaCorta(p.created_at)}
                </p>
              </div>

              {/* Monto */}
              <span style={{ fontSize: 12, fontWeight: 500, color: "#f97316" }}>
                ₡{Number(p.total).toLocaleString("es-CR")}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
