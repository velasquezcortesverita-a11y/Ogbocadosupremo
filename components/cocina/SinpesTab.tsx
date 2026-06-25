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

// ─── Visor de imagen ampliada ─────────────────────────────────────────────────

function ZoomedImageViewer({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 80,
        background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(255,255,255,0.15)", border: "none",
          borderRadius: "50%", width: 32, height: 32,
          cursor: "pointer", color: "#fff", fontSize: 18, lineHeight: "32px", textAlign: "center",
        }}
      >
        ✕
      </button>
      <img
        src={url}
        alt="Comprobante SINPE"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, objectFit: "contain", display: "block" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    </div>
  );
}

// ─── Modal de comprobante (solo lectura) ──────────────────────────────────────

function ViewComprobanteModal({
  pedido,
  onClose,
}: {
  pedido: Pedido;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const etiqueta = pedido.estado === "entregado"
    ? { texto: "✓ Pedido entregado",        color: "#16a34a" }
    : pedido.comprobante_revisado
    ? { texto: "✓ Pago confirmado",          color: "#16a34a" }
    : { texto: "Comprobante sin revisar",    color: "#f97316" };

  return (
    <>
      {zoomed && (
        <ZoomedImageViewer url={pedido.comprobante_url!} onClose={() => setZoomed(false)} />
      )}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: 16,
            maxWidth: 340,
            width: "100%",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px 0" }}>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/* Imagen — clicable para ampliar */}
          <div
            style={{ padding: "0 14px", position: "relative", cursor: "zoom-in" }}
            onClick={() => setZoomed(true)}
          >
            <img
              src={pedido.comprobante_url!}
              alt="Comprobante SINPE"
              style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 10, display: "block" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div style={{
              position: "absolute", top: 8, right: 22,
              background: "rgba(0,0,0,0.45)", borderRadius: 6,
              width: 26, height: 26,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, pointerEvents: "none",
            }}>
              🔍
            </div>
          </div>

          {/* Info */}
          <div style={{ padding: "12px 14px 16px" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>
              Pedido #{pedido.numero_pedido}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: "#f97316" }}>
              ₡{Number(pedido.total).toLocaleString("es-CR")}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: etiqueta.color, fontWeight: 500 }}>
              {etiqueta.texto}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SinpesTab ────────────────────────────────────────────────────────────────

export default function SinpesTab() {
  const [sinpes,      setSinpes]      = useState<Pedido[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [viewTarget,  setViewTarget]  = useState<Pedido | null>(null);

  const cargar = useCallback(async () => {
    const { gte, lte } = todayCRRange();
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, nombre_cliente, total, comprobante_url, created_at, estado, comprobante_revisado")
      .eq("metodo_pago", "sinpe")
      .not("comprobante_url", "is", null)
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

  // Solo suma los pedidos con comprobante revisado
  const totalDia = sinpes
    .filter((p) => p.comprobante_revisado)
    .reduce((acc, p) => acc + Number(p.total), 0);

  return (
    <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 20 }}>

      {/* Modal ver comprobante */}
      {viewTarget && (
        <ViewComprobanteModal pedido={viewTarget} onClose={() => setViewTarget(null)} />
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader2 size={20} className="animate-spin" style={{ color: "rgba(255,255,255,0.25)" }} />
        </div>
      ) : sinpes.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "32px 0", margin: 0 }}>
          Aún no hay comprobantes SINPE hoy
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
          {sinpes.map((p) => {
            const confirmado  = !!p.comprobante_revisado;
            const entregado   = p.estado === "entregado";
            const dotColor    = entregado ? "#3b82f6" : confirmado ? "#22c55e" : "#f97316";
            const etiqueta    = entregado ? "Entregado" : confirmado ? "Confirmado" : "Sin revisar";

            return (
              <div
                key={p.id}
                onClick={() => setViewTarget(p)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 0",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  cursor: "pointer",
                }}
              >
                {/* Thumbnail */}
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
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.75 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.15)",
                  }}>
                    <span style={{ fontSize: 11, color: "#fff", fontWeight: 700, textShadow: "0 0 4px rgba(0,0,0,0.7)" }}>
                      🔍
                    </span>
                  </div>
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

                {/* Estado */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: dotColor, fontWeight: 500 }}>{etiqueta}</span>
                </div>

                {/* Monto */}
                <span style={{ fontSize: 12, fontWeight: 500, color: "#f97316", flexShrink: 0 }}>
                  ₡{Number(p.total).toLocaleString("es-CR")}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
