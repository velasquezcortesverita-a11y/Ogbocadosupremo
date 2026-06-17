"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/store/carstore";
import { useDeliveryStore } from "@/store/deliveryStore";
import {
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  CheckCircle,
  Phone,
} from "lucide-react";

// ─── Constantes del negocio ───────────────────────────────────────────────────
const WHATSAPP_NUMBER = "506XXXXXXXX"; // Ej. 50688888888
const SINPE_NUMBER    = "XXXX-XXXX";  // Ej. 8888-8888

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export default function CarritoPage() {
  const items = useCartStore((state) => state.items);
  const total = useCartStore((state) => state.total);
  const limpiarCarrito = useCartStore((state) => state.limpiarCarrito);
  const aumentarCantidad = useCartStore((state) => state.aumentarCantidad);
  const disminuirCantidad = useCartStore((state) => state.disminuirCantidad);
  const eliminarProducto = useCartStore((state) => state.eliminarProducto);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [pedidoSinpe, setPedidoSinpe] = useState<{
    numeroPedido: number | string;
    totalPedido:  number;
    nombreCliente: string;
  } | null>(null);

  const { openModal, setOnConfirm } = useDeliveryStore();
  const router = useRouter();

  // Bloquea el scroll mientras cualquier modal de confirmación está abierto
  useEffect(() => {
    document.body.style.overflow =
      pedidoEnviado || pedidoSinpe !== null ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [pedidoEnviado, pedidoSinpe]);

  // Envía el pedido a Supabase — se llama desde el modal al confirmar la entrega
  const enviarPedido = async () => {
    // Leer delivery ANTES del primer await: closeModal() resetea address justo después
    const { selectedMethod, address: deliveryAddress } = useDeliveryStore.getState();

    // Capturar valores del form ANTES de limpiarlos
    const pagoLocal   = metodoPago;
    const nombreLocal = nombre;
    const totalLocal  = total();

    setEnviando(true);

    const payload = {
      nombre_cliente: nombreLocal,
      telefono,
      comentarios,
      metodo_pago: pagoLocal,
      total: totalLocal,
      delivery_method: selectedMethod,
      delivery_address: selectedMethod === "delivery" ? deliveryAddress : null,
    };

    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error al guardar pedido:", error.message);
      alert("Error al guardar pedido");
      setEnviando(false);
      return;
    }

    const detalles = items.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.id,
      nombre_producto: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
    }));

    const { error: detalleError } = await supabase
      .from("pedido_items")
      .insert(detalles);

    if (detalleError) {
      console.error(detalleError);
      alert("Error al guardar productos");
      setEnviando(false);
      return;
    }

    limpiarCarrito();
    setNombre("");
    setTelefono("");
    setComentarios("");
    setMetodoPago("");
    setEnviando(false);

    if (pagoLocal === "sinpe") {
      setPedidoSinpe({
        numeroPedido:  (pedido as { numero_pedido: number | string }).numero_pedido,
        totalPedido:   totalLocal,
        nombreCliente: nombreLocal,
      });
    } else {
      setPedidoEnviado(true);
    }
  };

  // Valida el form, registra el callback y abre el modal de entrega
  const handleFormSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nombre || !telefono || !metodoPago) {
      alert("Complete todos los campos");
      return;
    }
    setOnConfirm(enviarPedido);
    openModal();
  };

  const inputClass =
    "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white";

  return (
    <>
      {/* ── Confirmación SINPE ──────────────────────────────────────────── */}
      {pedidoSinpe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-sm shadow-xl overflow-hidden"
            style={{ borderRadius: 16 }}
          >
            {/* Saludo */}
            <div className="pt-7 pb-5 px-6 text-center">
              <p style={{ fontSize: 36, lineHeight: 1, marginBottom: 10 }}>🎉</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: "#111827", marginBottom: 4 }}>
                ¡Gracias, {pedidoSinpe.nombreCliente}!
              </p>
              <p style={{ fontSize: 12, color: "#6b7280" }}>
                Pedido #{pedidoSinpe.numeroPedido} · ₡
                {Number(pedidoSinpe.totalPedido).toLocaleString("es-CR")}
              </p>
            </div>

            <div style={{ height: 1, background: "#f3f4f6", margin: "0 24px" }} />

            {/* Tarjeta SINPE */}
            <div style={{ margin: "16px 16px 0", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
              {/* Header naranja */}
              <div
                style={{
                  background:  "#f97316",
                  padding:     "10px 14px",
                  display:     "flex",
                  alignItems:  "center",
                  gap:         8,
                }}
              >
                <Phone size={15} color="white" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>
                  Completá tu pago por SINPE
                </span>
              </div>

              {/* Filas de datos */}
              <div style={{ background: "#fafafa", padding: "4px 14px 8px" }}>
                {[
                  {
                    label: "Número",
                    valor: <span style={{ fontWeight: 600 }}>{SINPE_NUMBER}</span>,
                  },
                  {
                    label: "Monto exacto",
                    valor: (
                      <span style={{ color: "#f97316", fontWeight: 700, fontSize: 14 }}>
                        ₡{Number(pedidoSinpe.totalPedido).toLocaleString("es-CR")}
                      </span>
                    ),
                  },
                  {
                    label: "Concepto",
                    valor: <span>Pedido #{pedidoSinpe.numeroPedido}</span>,
                  },
                ].map(({ label, valor }) => (
                  <div
                    key={label}
                    style={{
                      display:        "flex",
                      justifyContent: "space-between",
                      alignItems:     "center",
                      fontSize:       12,
                      padding:        "6px 0",
                      borderBottom:   "1px solid #f3f4f6",
                    }}
                  >
                    <span style={{ color: "#9ca3af" }}>{label}</span>
                    <span style={{ color: "#111827" }}>{valor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón WhatsApp */}
            <div style={{ padding: "14px 16px 4px" }}>
              <button
                onClick={() => {
                  const msg = encodeURIComponent(
                    `Hola! 👋 Te envío el comprobante de pago.\n\n` +
                    `🧾 Pedido: #${pedidoSinpe.numeroPedido}\n` +
                    `👤 Nombre: ${pedidoSinpe.nombreCliente}\n` +
                    `💰 Monto: ₡${Number(pedidoSinpe.totalPedido).toLocaleString("es-CR")}\n` +
                    `💳 Método: SINPE Móvil\n\n` +
                    `[Adjunto comprobante]`
                  );
                  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
                }}
                style={{
                  width:          "100%",
                  background:     "#25D366",
                  color:          "white",
                  border:         "none",
                  borderRadius:   10,
                  padding:        "12px",
                  fontSize:       13,
                  fontWeight:     500,
                  cursor:         "pointer",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            8,
                }}
              >
                <WhatsAppIcon size={18} />
                Enviar comprobante por WhatsApp
              </button>
            </div>

            {/* Nota + cerrar */}
            <div style={{ padding: "8px 16px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 12 }}>
                Tu pedido se prepara al recibir el comprobante
              </p>
              <button
                onClick={() => {
                  document.body.style.overflow = "";
                  setPedidoSinpe(null);
                  router.push("/");
                }}
                style={{
                  fontSize:   12,
                  color:      "#9ca3af",
                  background: "none",
                  border:     "none",
                  cursor:     "pointer",
                  padding:    "4px 8px",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito — Efectivo / Tarjeta */}
      {pedidoEnviado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-xl">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              ¡Pedido enviado!
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Tu pedido fue recibido y está en preparación.
            </p>
            <button
              onClick={() => {
                document.body.style.overflow = "";
                setPedidoEnviado(false);
                router.push("/");
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      <main className="min-h-screen bg-gray-50 py-8 px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Back */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            Volver al menú
          </Link>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">
            Mi Pedido
          </h1>

          {/* Empty state */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-5">
                <ShoppingBag size={32} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Tu carrito está vacío
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Agrega productos desde el menú para hacer tu pedido.
              </p>
              <Link
                href="/"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                Ver menú
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr,400px] gap-8 items-start">
              {/* Left: Items */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                  {items.length} {items.length === 1 ? "producto" : "productos"}
                </p>

                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-base truncate">
                        {item.nombre}
                      </p>
                      <p className="text-gray-400 text-sm mt-0.5">
                        ₡{item.precio} c/u
                      </p>

                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full">
                          <button
                            type="button"
                            onClick={() => disminuirCantidad(item.id)}
                            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-bold text-sm text-gray-800">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => aumentarCantidad(item.id)}
                            className="flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => eliminarProducto(item.id)}
                          className="flex items-center justify-center w-8 h-8 rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">
                        Subtotal
                      </p>
                      <p className="font-bold text-gray-900 text-lg">
                        ₡{item.precio * item.cantidad}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Total line */}
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex justify-between items-center mt-2">
                  <span className="font-semibold text-gray-700">
                    Total del pedido
                  </span>
                  <span className="text-2xl font-extrabold text-orange-600">
                    ₡{total()}
                  </span>
                </div>
              </div>

              {/* Right: Form */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 lg:sticky lg:top-24">
                <h2 className="text-lg font-bold text-gray-900 mb-5">
                  Datos de tu pedido
                </h2>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={nombre}
                      onChange={(e) =>
                        setNombre(e.target.value.replace(/[0-9]/g, ""))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Ej. 88888888"
                      maxLength={8}
                      value={telefono}
                      onChange={(e) =>
                        setTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                      Método de pago
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Seleccione una opción</option>
                      <option value="sinpe">SINPE Móvil</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                      Comentarios{" "}
                      <span className="text-gray-300 font-normal normal-case">
                        (opcional)
                      </span>
                    </label>
                    <textarea
                      placeholder="Sin cebolla, extra salsa..."
                      value={comentarios}
                      onChange={(e) => setComentarios(e.target.value)}
                      className={inputClass}
                      rows={3}
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-500">Total</span>
                      <span className="text-xl font-extrabold text-gray-900">
                        ₡{total()}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={enviando}
                      className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-sm hover:shadow-lg hover:shadow-orange-200 text-base"
                    >
                      {enviando ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          Confirmar pedido
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
