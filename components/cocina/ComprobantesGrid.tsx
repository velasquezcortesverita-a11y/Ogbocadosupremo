"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ComprobanteItem = {
  id: string;
  numero_pedido: number;
  created_at: string;
  comprobante_url: string;
  comprobante_revisado: boolean;
};

function fechaHoyCR(): string {
  const ahoraCR = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return ahoraCR.toISOString().split("T")[0];
}

function tiempoRelativo(created_at: string): string {
  const diff = Date.now() - new Date(created_at).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `Hace ${hrs} h`;
}

export default function ComprobantesGrid() {
  const [items, setItems] = useState<ComprobanteItem[]>([]);
  const [confirm, setConfirm] = useState(false);

  const cargar = useCallback(async () => {
    const inicio = new Date(fechaHoyCR() + "T06:00:00.000Z");
    const fin = new Date(inicio);
    fin.setUTCDate(fin.getUTCDate() + 1);

    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, created_at, comprobante_url, comprobante_revisado")
      .not("comprobante_url", "is", null)
      .gte("created_at", inicio.toISOString())
      .lt("created_at", fin.toISOString())
      .order("created_at", { ascending: false });

    setItems((data ?? []) as ComprobanteItem[]);
  }, []);

  useEffect(() => {
    cargar();

    const canal = supabase
      .channel("comprobantes-sinpe")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos" },
        () => { cargar(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [cargar]);

  const marcarRevisado = async (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, comprobante_revisado: true } : i))
    );
    await supabase
      .from("pedidos")
      .update({ comprobante_revisado: true })
      .eq("id", id);
  };

  const eliminarComprobante = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase
      .from("pedidos")
      .update({ comprobante_url: null, comprobante_revisado: false })
      .eq("id", id);
  };

  const limpiarTodo = async () => {
    const inicio = new Date(fechaHoyCR() + "T06:00:00.000Z");
    const fin = new Date(inicio);
    fin.setUTCDate(fin.getUTCDate() + 1);

    await supabase
      .from("pedidos")
      .update({ comprobante_url: null, comprobante_revisado: false })
      .not("comprobante_url", "is", null)
      .gte("created_at", inicio.toISOString())
      .lt("created_at", fin.toISOString());

    setItems([]);
    setConfirm(false);
  };

  const nuevos = items.filter((i) => !i.comprobante_revisado).length;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span
            style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}
          >
            Comprobantes SINPE
          </span>
          <span
            style={{
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.2)",
              color: "#f97316",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 20,
            }}
          >
            {nuevos} nuevos
          </span>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => setConfirm(true)}
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.15)",
              color: "#dc2626",
              fontSize: 12,
              fontWeight: 500,
              padding: "5px 10px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            🗑 Limpiar todo
          </button>
        )}
      </div>

      {/* Modal confirmación "Limpiar todo" */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full mx-4 shadow-xl">
            <p className="font-semibold text-gray-900 text-center mb-1">
              ¿Eliminar todos los comprobantes?
            </p>
            <p className="text-sm text-gray-500 text-center mb-5">
              Se borrarán todos los comprobantes del día. Los pedidos no se modifican.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={limpiarTodo}
                className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid / Estado vacío */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <span className="text-4xl">🧾</span>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Sin comprobantes por ahora
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                borderRadius: 10,
                border: "0.5px solid rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  position: "relative",
                  height: 70,
                  background: "rgba(249,115,22,0.08)",
                }}
              >
                {/* Fallback emoji — debajo de la imagen */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                  }}
                >
                  🧾
                </div>

                {/* Imagen — encima del emoji */}
                <img
                  src={item.comprobante_url}
                  alt={`Comprobante #${item.numero_pedido}`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    zIndex: 1,
                    display: "block",
                  }}
                />

                {/* Punto de estado */}
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: item.comprobante_revisado ? "#22c55e" : "#f97316",
                    zIndex: 2,
                    boxShadow: "0 0 0 1.5px rgba(0,0,0,0.3)",
                  }}
                />
              </div>

              {/* Pie */}
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  padding: "6px 8px",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.85)",
                    marginBottom: 1,
                  }}
                >
                  Pedido #{item.numero_pedido}
                </p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                  {tiempoRelativo(item.created_at)}
                </p>

                {/* Botones Ver / ✕ */}
                <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                  <a
                    href={item.comprobante_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => marcarRevisado(item.id)}
                    style={{
                      flex: 1,
                      background: "rgba(249,115,22,0.1)",
                      color: "#f97316",
                      fontSize: 11,
                      fontWeight: 500,
                      textAlign: "center",
                      padding: "4px 0",
                      borderRadius: 6,
                      textDecoration: "none",
                      display: "block",
                    }}
                  >
                    Ver
                  </a>
                  <button
                    onClick={() => eliminarComprobante(item.id)}
                    style={{
                      flex: 1,
                      background: "rgba(239,68,68,0.06)",
                      border: "none",
                      color: "#dc2626",
                      fontSize: 11,
                      fontWeight: 500,
                      borderRadius: 6,
                      cursor: "pointer",
                      padding: "4px 0",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
