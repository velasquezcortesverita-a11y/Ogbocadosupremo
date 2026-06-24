"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ComprobanteItem = {
  id: string;
  numero_pedido: number;
  created_at: string;
  comprobante_url: string;
  comprobante_revisado: boolean;
  nombre_cliente: string;
  total: number | string;
  estado: string;
};

function tiempoRelativo(ts: string): string {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  return `Hace ${Math.floor(mins / 60)} h`;
}

function horaFormateada(ts: string): string {
  return new Date(ts).toLocaleTimeString("es-CR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Costa_Rica",
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ComprobanteModal({
  item,
  onClose,
  onConfirmar,
  onRechazar,
  onEliminar,
}: {
  item: ComprobanteItem;
  onClose: () => void;
  onConfirmar: (id: string) => Promise<void>;
  onRechazar:  (id: string) => Promise<void>;
  onEliminar:  (id: string) => void;
}) {
  const [accion, setAccion] = useState<"confirmado" | "rechazado" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const puedeActuar = item.estado === "pendiente" && accion === null;

  const handleConfirmar = async () => {
    setLoading(true);
    await onConfirmar(item.id);
    setAccion("confirmado");
    setLoading(false);
  };

  const handleRechazar = async () => {
    setLoading(true);
    await onRechazar(item.id);
    setAccion("rechazado");
    setLoading(false);
    setTimeout(onClose, 700);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111827",
          borderRadius: 16,
          maxWidth: 440,
          width: "100%",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 0" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
            Comprobante SINPE
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
          >
            ✕
          </button>
        </div>

        {/* Imagen */}
        <div style={{ margin: "12px 0", background: "rgba(249,115,22,0.05)", maxHeight: "52vh", overflow: "hidden", display: "flex", justifyContent: "center" }}>
          <img
            src={item.comprobante_url}
            alt="Comprobante"
            style={{ maxHeight: "52vh", maxWidth: "100%", objectFit: "contain", display: "block" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>

        {/* Datos del pedido */}
        <div style={{ padding: "10px 16px 12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)", margin: 0 }}>
                Pedido #{item.numero_pedido}
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: "2px 0 0" }}>
                {item.nombre_cliente} · {horaFormateada(item.created_at)}
              </p>
            </div>
            <span style={{ fontSize: 19, fontWeight: 700, color: "#f97316" }}>
              ₡{Number(item.total).toLocaleString("es-CR")}
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div style={{ padding: "10px 16px 16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {accion === null ? (
            <div style={{ display: "flex", gap: 8 }}>
              {puedeActuar && (
                <>
                  <button
                    onClick={handleConfirmar}
                    disabled={loading}
                    style={{ flex: 1, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "9px 0", cursor: "pointer", opacity: loading ? 0.6 : 1 }}
                  >
                    ✓ Confirmar pago
                  </button>
                  <button
                    onClick={handleRechazar}
                    disabled={loading}
                    style={{ flex: 1, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontWeight: 600, fontSize: 13, borderRadius: 10, padding: "9px 0", cursor: "pointer", opacity: loading ? 0.6 : 1 }}
                  >
                    ✕ Rechazar
                  </button>
                </>
              )}
              <button
                onClick={() => { onEliminar(item.id); onClose(); }}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: 12, borderRadius: 10, padding: "9px 12px", cursor: "pointer" }}
              >
                Borrar
              </button>
            </div>
          ) : accion === "confirmado" ? (
            <p style={{ textAlign: "center", color: "#22c55e", fontWeight: 600, fontSize: 14, margin: 0 }}>
              ✓ Pago confirmado — preparando pedido
            </p>
          ) : (
            <p style={{ textAlign: "center", color: "#ef4444", fontWeight: 600, fontSize: 14, margin: 0 }}>
              Pago rechazado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

export default function ComprobantesGrid({ diaInicio }: { diaInicio?: string }) {
  const [items,     setItems]     = useState<ComprobanteItem[]>([]);
  const [confirm,   setConfirm]   = useState(false);
  const [modalItem, setModalItem] = useState<ComprobanteItem | null>(null);

  const cargar = useCallback(async () => {
    let q = supabase
      .from("pedidos")
      .select("id, numero_pedido, created_at, comprobante_url, comprobante_revisado, nombre_cliente, total, estado")
      .not("comprobante_url", "is", null)
      .order("created_at", { ascending: false });

    if (diaInicio) {
      q = q.gte("created_at", diaInicio);
    } else {
      // fallback: día CR actual
      const hoy = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().split("T")[0];
      const ini = new Date(hoy + "T06:00:00.000Z");
      const fin = new Date(ini); fin.setUTCDate(fin.getUTCDate() + 1);
      q = q.gte("created_at", ini.toISOString()).lt("created_at", fin.toISOString());
    }

    const { data } = await q;
    setItems((data ?? []) as ComprobanteItem[]);
  }, [diaInicio]);

  useEffect(() => {
    cargar();

    const escucharDiaCerrado = () => cargar();
    window.addEventListener("dia-cerrado", escucharDiaCerrado);

    const canal = supabase
      .channel("comprobantes-sinpe")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos" }, () => cargar())
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
      window.removeEventListener("dia-cerrado", escucharDiaCerrado);
    };
  }, [cargar]);

  const marcarRevisado = async (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, comprobante_revisado: true } : i)));
    await supabase.from("pedidos").update({ comprobante_revisado: true }).eq("id", id);
  };

  const eliminarComprobante = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("pedidos").update({ comprobante_url: null, comprobante_revisado: false }).eq("id", id);
  };

  const confirmarPago = async (id: string) => {
    await supabase.from("pedidos").update({ estado: "preparando", comprobante_revisado: true }).eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, estado: "preparando", comprobante_revisado: true } : i)));
    window.dispatchEvent(new CustomEvent("resumen-actualizar"));
  };

  const rechazarPago = async (id: string) => {
    await supabase.from("pedidos").update({ estado: "pago_rechazado", comprobante_url: null }).eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const limpiarTodo = async () => {
    for (const item of items) {
      await supabase.from("pedidos")
        .update({ comprobante_url: null, comprobante_revisado: false })
        .eq("id", item.id);
    }
    setItems([]);
    setConfirm(false);
  };

  const nuevos = items.filter((i) => !i.comprobante_revisado).length;

  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 24 }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
            Comprobantes SINPE
          </span>
          <span style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>
            {nuevos} nuevos
          </span>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => setConfirm(true)}
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#dc2626", fontSize: 12, fontWeight: 500, padding: "5px 10px", borderRadius: 8, cursor: "pointer" }}
          >
            🗑 Limpiar todo
          </button>
        )}
      </div>

      {/* Modal: confirmar limpiar todo */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full mx-4 shadow-xl">
            <p className="font-semibold text-gray-900 text-center mb-1">¿Eliminar todos los comprobantes?</p>
            <p className="text-sm text-gray-500 text-center mb-5">Los pedidos no se modifican.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-medium">Cancelar</button>
              <button onClick={limpiarTodo} className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ver comprobante */}
      {modalItem && (
        <ComprobanteModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onConfirmar={confirmarPago}
          onRechazar={rechazarPago}
          onEliminar={eliminarComprobante}
        />
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <span className="text-4xl">🧾</span>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Sin comprobantes por ahora</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {items.map((item) => (
            <div key={item.id} style={{ borderRadius: 10, border: "0.5px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>

              {/* Thumbnail — clic abre modal */}
              <button
                onClick={() => { setModalItem(item); marcarRevisado(item.id); }}
                style={{ display: "block", width: "100%", padding: 0, border: "none", cursor: "pointer", position: "relative", height: 70, background: "rgba(249,115,22,0.08)" }}
              >
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🧾</div>
                <img
                  src={item.comprobante_url}
                  alt=""
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1, display: "block" }}
                />
                <div style={{ position: "absolute", top: 5, right: 5, width: 8, height: 8, borderRadius: "50%", background: item.comprobante_revisado ? "#22c55e" : "#f97316", zIndex: 2, boxShadow: "0 0 0 1.5px rgba(0,0,0,0.35)" }} />
              </button>

              {/* Pie */}
              <div style={{ background: "rgba(255,255,255,0.04)", padding: "6px 8px" }}>
                <p style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.85)", margin: 0 }}>
                  Pedido #{item.numero_pedido}
                </p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", margin: "1px 0 0" }}>
                  {tiempoRelativo(item.created_at)}
                </p>
                <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                  <button
                    onClick={() => { setModalItem(item); marcarRevisado(item.id); }}
                    style={{ flex: 1, background: "rgba(249,115,22,0.1)", border: "none", color: "#f97316", fontSize: 11, fontWeight: 500, textAlign: "center", padding: "4px 0", borderRadius: 6, cursor: "pointer" }}
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => eliminarComprobante(item.id)}
                    style={{ flex: 1, background: "rgba(239,68,68,0.06)", border: "none", color: "#dc2626", fontSize: 11, fontWeight: 500, borderRadius: 6, cursor: "pointer", padding: "4px 0" }}
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
