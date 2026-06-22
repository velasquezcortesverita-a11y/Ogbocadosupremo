"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Phone, CreditCard, Package, Flame, Bike, MapPin } from "lucide-react";
import type { Pedido, PedidoItem } from "@/types/pedido";

export default function PedidoCard({
  pedido,
  onEntregado,
}: {
  pedido: Pedido;
  onEntregado?: () => void;
}) {
  const [estadoLocal, setEstadoLocal] = useState<string>(
    pedido.estado ?? "pendiente"
  );
  const [saliendo, setSaliendo]     = useState(false);
  const [visible, setVisible]       = useState(true);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [pagoEstado, setPagoEstado] = useState<"confirmado" | "rechazado" | null>(null);

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
      // UPDATE bloqueado silenciosamente — RLS sin política para anon key
      console.error("UPDATE bloqueado: 0 filas actualizadas. Verificar RLS en tabla pedidos.");
      setErrorMsg("No se pudo actualizar. Verificar permisos en Supabase.");
      return;
    }

    if (nuevoEstado === "entregado") {
      // Notifica al ResumenVentas de inmediato (antes de la animación)
      window.dispatchEvent(new CustomEvent("resumen-actualizar"));
      setSaliendo(true);
      setTimeout(() => {
        if (onEntregado) {
          onEntregado(); // El padre (CocinaListado) elimina el card de la lista
        } else {
          setVisible(false); // Fallback si se usa sin padre gestionado
        }
      }, 300);
    } else {
      setEstadoLocal(nuevoEstado);
    }
  };

  const confirmarPago = async () => {
    const { error } = await supabase
      .from("pedidos")
      .update({ estado: "preparando" })
      .eq("id", pedido.id)
      .select("id");
    if (error) { setErrorMsg("Error al confirmar el pago."); return; }
    setPagoEstado("confirmado");
    setEstadoLocal("preparando");
  };

  const rechazarPago = async () => {
    const { error } = await supabase
      .from("pedidos")
      .update({ estado: "pago_rechazado" })
      .eq("id", pedido.id)
      .select("id");
    if (error) { setErrorMsg("Error al rechazar el pago."); return; }
    setPagoEstado("rechazado");
    setSaliendo(true);
    setTimeout(() => {
      if (onEntregado) onEntregado();
      else setVisible(false);
    }, 300);
  };

  if (!visible) return null;

  const esPendiente  = estadoLocal === "pendiente";
  const esPreparando = estadoLocal === "preparando";
  const esDelivery   = pedido.delivery_method === "delivery";
  const esSinpe      = pedido.metodo_pago === "sinpe";
  const tieneComprobante = !!pedido.comprobante_url;

  return (
    <div
      className={`bg-white rounded-3xl shadow-sm p-5 flex flex-col gap-4 animate-slide-up transition-all duration-300 ${
        saliendo ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
      style={{
        border: esPendiente
          ? "1.5px solid rgba(249,115,22,0.5)"
          : esPreparando
          ? "1.5px solid rgba(59,130,246,0.5)"
          : "1px solid #f3f4f6",
        overflow: "hidden",
        isolation: "isolate",
        position: "relative",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
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
              <span className="text-sm font-semibold text-blue-600">
                Preparando...
              </span>
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
        {pagoEstado === "confirmado" && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold bg-green-50 text-green-700 border-green-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Pago confirmado
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

        {/* Método de entrega */}
        {pedido.delivery_method && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {esDelivery
              ? <Bike    size={14} className="text-gray-400 shrink-0" />
              : <MapPin  size={14} className="text-gray-400 shrink-0" />
            }
            <span className="capitalize">{pedido.delivery_method}</span>
          </div>
        )}

        {/* Dirección — solo si es delivery */}
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
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Productos
          </span>
        </div>
        <ul className="space-y-1">
          {pedido.pedido_items?.map((item: PedidoItem) => (
            <li
              key={item.id}
              className="flex justify-between text-sm text-gray-700"
            >
              <span>{item.nombre_producto}</span>
              <span className="font-semibold text-gray-900">x{item.cantidad}</span>
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

      {/* Comprobante SINPE */}
      {esSinpe && tieneComprobante && pagoEstado !== "rechazado" && (
        <div className="rounded-xl overflow-hidden border border-gray-100">
          {/* Thumbnail */}
          <a href={pedido.comprobante_url!} target="_blank" rel="noreferrer" className="block">
            <img
              src={pedido.comprobante_url!}
              alt="Comprobante"
              style={{ width: "100%", height: 60, objectFit: "cover", background: "rgba(249,115,22,0.06)", display: "block" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </a>
          {/* Pie */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-t border-gray-100">
            <span className="text-xs text-gray-400">Comprobante SINPE</span>
            <a
              href={pedido.comprobante_url!}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-orange-500 hover:text-orange-600"
            >
              Ver →
            </a>
          </div>
          {/* Confirmar / Rechazar */}
          {pagoEstado === null && (
            <div className="flex gap-2 p-2 border-t border-gray-100">
              <button
                onClick={confirmarPago}
                style={{ flex: 1, background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)", color: "#16a34a" }}
                className="rounded-lg py-1.5 text-xs font-semibold transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={rechazarPago}
                style={{ flex: 1, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#dc2626" }}
                className="rounded-lg py-1.5 text-xs font-semibold transition-colors"
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error inline */}
      {errorMsg && (
        <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
          {errorMsg}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        {esPendiente && (
          <button
            onClick={() => cambiarEstado("preparando")}
            className="w-full py-2.5 px-3 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 active:scale-95 text-white transition-all"
          >
            Empezar a preparar
          </button>
        )}
        <button
          onClick={() => cambiarEstado("entregado")}
          className="w-full py-2.5 px-3 rounded-xl text-sm font-semibold bg-gray-800 hover:bg-gray-900 active:scale-95 text-white transition-all"
        >
          Entregado
        </button>
      </div>
    </div>
  );
}
