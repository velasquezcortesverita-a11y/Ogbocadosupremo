"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Phone, CreditCard, Package, Flame, Bike, MapPin } from "lucide-react";
import type { Pedido, PedidoItem } from "@/types/pedido";

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

// ─── Modal Ver Sinpe ──────────────────────────────────────────────────────────

function SinpeModal({
  pedido,
  pagoEstado,
  onClose,
  onConfirmar,
  onRechazar,
}: {
  pedido: Pedido;
  pagoEstado: "confirmado" | "rechazado" | null;
  onClose: () => void;
  onConfirmar: () => void;
  onRechazar: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {zoomed && (
        <ZoomedImageViewer
          url={pedido.comprobante_url!}
          onClose={() => setZoomed(false)}
        />
      )}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 70,
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
            onClick={(e) => { e.stopPropagation(); setZoomed(true); }}
          >
            <img
              src={pedido.comprobante_url!}
              alt="Comprobante SINPE"
              style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 10, display: "block" }}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
              }}
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
          <div style={{ padding: "12px 14px 4px" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>
              Pedido #{pedido.numero_pedido}
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 700, color: "#f97316" }}>
              Monto: ₡{Number(pedido.total).toLocaleString("es-CR")}
            </p>
          </div>

          {/* Acciones */}
          {pagoEstado === null && (
            <div style={{ display: "flex", gap: 8, padding: "12px 14px 14px" }}>
              <button
                onClick={() => { onConfirmar(); onClose(); }}
                style={{
                  flex: 1,
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  color: "#16a34a",
                  borderRadius: 8,
                  padding: "9px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✓ Confirmar
              </button>
              <button
                onClick={() => { onRechazar(); onClose(); }}
                style={{
                  flex: 1,
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  color: "#dc2626",
                  borderRadius: 8,
                  padding: "9px 0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✗ Rechazar
              </button>
            </div>
          )}

          {pagoEstado === "confirmado" && (
            <p style={{ textAlign: "center", padding: "12px 14px 14px", fontSize: 13, color: "#16a34a", margin: 0, fontWeight: 500 }}>
              ✓ Pago ya confirmado
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Modal advertencia SINPE sin confirmar ────────────────────────────────────

function SinpeWarningModal({
  onCancelar,
  onConfirmar,
}: {
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelar(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancelar]);

  return (
    <div
      onClick={onCancelar}
      style={{
        position: "fixed", inset: 0, zIndex: 80,
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
          maxWidth: 320,
          width: "100%",
          padding: "24px 20px 20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 8px" }}>
          Pago SINPE sin confirmar
        </p>
        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.5 }}>
          Este pedido todavía no tiene el comprobante SINPE confirmado.
          ¿Estás seguro de que querés marcarlo como entregado igual?
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1,
              background: "var(--color-background-secondary, #f3f4f6)",
              color: "#6b7280",
              border: "none",
              borderRadius: 8,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            style={{
              flex: 1,
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Marcar como entregado igual
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PedidoCard ───────────────────────────────────────────────────────────────

export default function PedidoCard({
  pedido,
  isNuevo = false,
  onEntregado,
  onVerNuevo,
}: {
  pedido: Pedido;
  isNuevo?: boolean;
  onEntregado?: () => void;
  onVerNuevo?: () => void;
}) {
  const [estadoLocal, setEstadoLocal] = useState<string>(pedido.estado ?? "pendiente");
  const [saliendo,    setSaliendo]    = useState(false);
  const [visible,     setVisible]     = useState(true);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [pagoEstado,  setPagoEstado]  = useState<"confirmado" | "rechazado" | null>(
    pedido.comprobante_revisado === true ? "confirmado" : null
  );
  const [sinpeModal,        setSinpeModal]        = useState(false);
  const [sinpeWarningModal, setSinpeWarningModal] = useState(false);

  const cambiarEstado = async (nuevoEstado: string) => {
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("pedidos")
      .update({ estado: nuevoEstado })
      .eq("id", pedido.id)
      .select("id");

    if (error) {
      console.error("Supabase error:", error.code, error.message, error.details);
      setErrorMsg("Error al actualizar. Intenta de nuevo.");
      return;
    }

    if (!data || data.length === 0) {
      console.error("UPDATE bloqueado: 0 filas actualizadas. Verificar RLS en tabla pedidos.");
      setErrorMsg("No se pudo actualizar. Verificar permisos en Supabase.");
      return;
    }

    if (nuevoEstado === "entregado") {
      window.dispatchEvent(new CustomEvent("resumen-actualizar"));
      setSaliendo(true);
      setTimeout(() => {
        if (onEntregado) onEntregado();
        else setVisible(false);
      }, 300);
    } else {
      setEstadoLocal(nuevoEstado);
    }
  };

  const confirmarPago = async () => {
    const { error } = await supabase
      .from("pedidos")
      .update({ estado: "preparando", comprobante_revisado: true })
      .eq("id", pedido.id);

    if (error) {
      console.error("confirmarPago error:", error.code, error.message, error.details);
      setErrorMsg("Error al confirmar el pago.");
      return;
    }

    setPagoEstado("confirmado");
    setEstadoLocal("preparando");
  };

  const rechazarPago = async () => {
    const { error } = await supabase
      .from("pedidos")
      .update({ estado: "pago_rechazado" })
      .eq("id", pedido.id);
    if (error) { setErrorMsg("Error al rechazar el pago."); return; }
    setPagoEstado("rechazado");
    setSaliendo(true);
    setTimeout(() => {
      if (onEntregado) onEntregado();
      else setVisible(false);
    }, 300);
  };

  if (!visible) return null;

  const esPendiente      = estadoLocal === "pendiente";
  const esPreparando     = estadoLocal === "preparando";
  const esDelivery       = pedido.delivery_method === "delivery";
  const esSinpe          = pedido.metodo_pago === "sinpe";
  const tieneComprobante = !!pedido.comprobante_url;
  const sinpeConfirmado  = pagoEstado === "confirmado";
  const sinpeRechazado   = pagoEstado === "rechazado";

  return (
    <>
      {/* Modal advertencia SINPE sin confirmar */}
      {sinpeWarningModal && (
        <SinpeWarningModal
          onCancelar={() => setSinpeWarningModal(false)}
          onConfirmar={() => {
            setSinpeWarningModal(false);
            onVerNuevo?.();
            cambiarEstado("entregado");
          }}
        />
      )}

      {/* Modal Ver Sinpe */}
      {sinpeModal && (
        <SinpeModal
          pedido={pedido}
          pagoEstado={pagoEstado}
          onClose={() => setSinpeModal(false)}
          onConfirmar={confirmarPago}
          onRechazar={rechazarPago}
        />
      )}

      <div
        className={`bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4 animate-slide-up transition-all duration-300 ${
          saliendo ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
        style={{
          border: isNuevo
            ? "1.5px solid #22c55e"
            : esPendiente
            ? "1.5px solid rgba(249,115,22,0.5)"
            : esPreparando
            ? "1.5px solid rgba(59,130,246,0.5)"
            : "1px solid #f3f4f6",
          background: isNuevo ? "rgba(34,197,94,0.04)" : "#fff",
          overflow: "hidden",
          isolation: "isolate",
          position: "relative",
        }}
      >
        {/* Badges: NUEVO + MOSTRADOR */}
        <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, display: "flex", gap: 4 }}>
          {isNuevo && (
            <span style={{
              background: "#22c55e", color: "#fff",
              borderRadius: 10, fontSize: 9, fontWeight: 700,
              letterSpacing: "0.06em", padding: "2px 7px",
            }}>
              NUEVO
            </span>
          )}
          {pedido.origen === "mostrador" && (
            <span style={{
              background: "rgba(107,114,128,0.12)", color: "#6b7280",
              borderRadius: 10, fontSize: 9, fontWeight: 600,
              padding: "2px 7px",
            }}>
              🏪 Mostrador
            </span>
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3" style={isNuevo || pedido.origen === "mostrador" ? { paddingTop: 14 } : {}}>
          {esPreparando ? (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-5 h-5 bg-orange-500 rounded-md flex items-center justify-center">
                  <Flame size={11} className="text-white" />
                </div>
                <span className="text-sm font-extrabold text-gray-900 tracking-tight">
                  Bocado <span className="text-orange-500">Supremo</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-blue-600">Preparando...</span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">
                Pedido
              </p>
              <h2 className="text-xl font-extrabold text-gray-900 font-mono">
                #{pedido.numero_pedido}
              </h2>
            </div>
          )}

          {esPendiente && !esSinpe && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-yellow-50 text-yellow-700 border-yellow-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              Pendiente
            </span>
          )}
          {esSinpe && !tieneComprobante && pagoEstado === null && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-orange-50 text-orange-600 border-orange-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              Pendiente pago
            </span>
          )}
          {sinpeConfirmado && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-green-50 text-green-700 border-green-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Pago confirmado
            </span>
          )}
          {sinpeRechazado && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-red-50 text-red-700 border-red-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Pago rechazado
            </span>
          )}
        </div>

        {/* Customer info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User size={14} className="text-gray-400 shrink-0" />
            <span className="font-medium">{pedido.nombre_cliente}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone size={14} className="text-gray-400 shrink-0" />
            <span>{pedido.telefono}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CreditCard size={14} className="text-gray-400 shrink-0" />
            <span className="capitalize">{pedido.metodo_pago}</span>
          </div>

          {pedido.delivery_method && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {esDelivery
                ? <Bike   size={14} className="text-gray-400 shrink-0" />
                : <MapPin size={14} className="text-gray-400 shrink-0" />}
              <span className="capitalize">{pedido.delivery_method}</span>
            </div>
          )}

          {esDelivery && pedido.delivery_address && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{pedido.delivery_address}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-gray-50 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Package size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Productos</span>
          </div>
          <ul className="space-y-2">
            {pedido.pedido_items?.map((item: PedidoItem) => (
              <li key={item.id}>
                <div className="flex justify-between text-sm text-gray-700">
                  <span>{item.nombre_producto}</span>
                  <span className="font-semibold text-gray-900">x{item.cantidad}</span>
                </div>
                {item.extras && item.extras.length > 0 && (
                  <ul className="mt-0.5">
                    {item.extras.map((extra) => (
                      <li
                        key={extra.nombre}
                        style={{ paddingLeft: 14, color: "#f97316", fontSize: 10, lineHeight: 1.6 }}
                      >
                        + {extra.nombre}{(extra.cantidad ?? 1) > 1 ? ` x${extra.cantidad}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center px-1">
          <span className="text-sm text-gray-500">Total</span>
          <span className="text-lg font-extrabold text-gray-900">
            ₡{Number(pedido.total).toLocaleString("es-CR")}
          </span>
        </div>

        {/* Fila comprobante SINPE */}
        {esSinpe && tieneComprobante && !sinpeRechazado && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: sinpeConfirmado ? "rgba(34,197,94,0.05)" : "rgba(249,115,22,0.05)",
            border: sinpeConfirmado ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(249,115,22,0.15)",
            borderRadius: 8,
            padding: "8px 10px",
          }}>
            {/* Indicador + texto */}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: sinpeConfirmado ? "#22c55e" : "#f97316",
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                {sinpeConfirmado ? "Comprobante confirmado" : "Comprobante sin revisar"}
              </span>
            </div>

            {/* Botón Ver Sinpe */}
            <button
              onClick={() => { onVerNuevo?.(); setSinpeModal(true); }}
              style={{
                background: "#f97316",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              Ver Sinpe
            </button>
          </div>
        )}

        {/* Error inline */}
        {errorMsg && (
          <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
            {errorMsg}
          </p>
        )}

        {/* Actions — mt-auto para anclarlos al fondo de la tarjeta */}
        <div className="flex flex-col gap-2 pt-1 mt-auto">
          {esPendiente && (
            <button
              onClick={() => { onVerNuevo?.(); cambiarEstado("preparando"); }}
              className="w-full py-2.5 px-3 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 active:scale-95 text-white transition-all"
            >
              Empezar a preparar
            </button>
          )}
          <button
            onClick={() => {
              if (esSinpe && !sinpeConfirmado) {
                setSinpeWarningModal(true);
              } else {
                onVerNuevo?.();
                cambiarEstado("entregado");
              }
            }}
            className="w-full py-2.5 px-3 rounded-xl text-sm font-semibold bg-gray-800 hover:bg-gray-900 active:scale-95 text-white transition-all"
          >
            Entregado
          </button>
        </div>
      </div>
    </>
  );
}
