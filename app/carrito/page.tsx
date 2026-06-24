"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCartStore, type Extra } from "@/store/carstore";
import { useDeliveryStore } from "@/store/deliveryStore";
import ExtrasModal from "@/components/ExtrasModal";
import {
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  CheckCircle,
  Loader2,
} from "lucide-react";

// ─── Constantes del negocio ───────────────────────────────────────────────────
const SINPE_NUMBER = "XXXX-XXXX"; // Ej. 8888-8888

export default function CarritoPage() {
  const items           = useCartStore((state) => state.items);
  const total           = useCartStore((state) => state.total);
  const limpiarCarrito  = useCartStore((state) => state.limpiarCarrito);
  const aumentarCantidad  = useCartStore((state) => state.aumentarCantidad);
  const disminuirCantidad = useCartStore((state) => state.disminuirCantidad);
  const eliminarProducto  = useCartStore((state) => state.eliminarProducto);
  const setExtras         = useCartStore((state) => state.setExtras);

  const [extrasModal, setExtrasModal] = useState<{ id: string; nombre: string; extras: Extra[] } | null>(null);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [pedidoSinpe, setPedidoSinpe] = useState<{
    pedidoId:      string;
    numeroPedido:  number | string;
    totalPedido:   number;
    nombreCliente: string;
  } | null>(null);
  const [comprobanteFile, setComprobanteFile]         = useState<File | null>(null);
  const [comprobantePreview, setComprobantePreview]   = useState<string | null>(null);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [comprobanteEnviado, setComprobanteEnviado]   = useState(false);
  const [comprobanteError, setComprobanteError]       = useState<string | null>(null);
  const comprobanteInputRef = useRef<HTMLInputElement>(null);

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
      pedido_id:      pedido.id,
      producto_id:    item.id,
      nombre_producto: item.nombre,
      cantidad:       item.cantidad,
      precio:         item.precio,
      extras:         item.extras ?? [],
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
        pedidoId:      (pedido as { id: string }).id,
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

  const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      setComprobanteError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setComprobanteError("La imagen no puede superar 5MB.");
      return;
    }
    setComprobanteError(null);
    if (comprobantePreview) URL.revokeObjectURL(comprobantePreview);
    setComprobanteFile(file);
    setComprobantePreview(URL.createObjectURL(file));
  };

  const handleConfirmarPago = async () => {
    if (!comprobanteFile || !pedidoSinpe) return;
    setSubiendoComprobante(true);
    setComprobanteError(null);
    try {
      const form = new FormData();
      form.append("file", comprobanteFile);
      form.append("folder", "bocado-supremo/comprobantes");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Error al subir el comprobante.");
      const { url } = (await res.json()) as { url: string };
      const { error } = await supabase
        .from("pedidos")
        .update({ comprobante_url: url })
        .eq("id", pedidoSinpe.pedidoId);
      if (error) throw new Error(error.message);
      setComprobanteEnviado(true);
    } catch (err) {
      setComprobanteError(err instanceof Error ? err.message : "Error al enviar el comprobante.");
    } finally {
      setSubiendoComprobante(false);
    }
  };

  const cerrarSinpe = () => {
    if (comprobantePreview) URL.revokeObjectURL(comprobantePreview);
    setComprobanteFile(null);
    setComprobantePreview(null);
    setComprobanteEnviado(false);
    setComprobanteError(null);
    setPedidoSinpe(null);
    document.body.style.overflow = "";
    router.push("/");
  };

  const inputClass =
    "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white";

  return (
    <>
      {/* Modal de extras */}
      {extrasModal && (
        <ExtrasModal
          productoId={extrasModal.id}
          itemNombre={extrasModal.nombre}
          currentExtras={extrasModal.extras}
          onSave={(extras) => setExtras(extrasModal.id, extras)}
          onClose={() => setExtrasModal(null)}
        />
      )}

      {/* ── Confirmación SINPE ──────────────────────────────────────────── */}
      {pedidoSinpe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-sm shadow-xl overflow-y-auto"
            style={{ borderRadius: 16, maxHeight: "90vh" }}
          >
            {/* Saludo */}
            <div className="pt-7 pb-5 px-6 text-center">
              <p style={{ fontSize: 32, lineHeight: 1, marginBottom: 10 }}>🎉</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 4 }}>
                ¡Gracias, {pedidoSinpe.nombreCliente}!
              </p>
              <p style={{ fontSize: 11, color: "#6b7280" }}>
                Pedido #{pedidoSinpe.numeroPedido} · ₡
                {Number(pedidoSinpe.totalPedido).toLocaleString("es-CR")}
              </p>
            </div>

            <div style={{ height: 1, background: "#f3f4f6", margin: "0 24px" }} />

            <div style={{ padding: "14px 16px 0" }}>
              {/* Datos SINPE */}
              <div
                style={{
                  background:   "rgba(249,115,22,0.05)",
                  border:       "1px solid rgba(249,115,22,0.15)",
                  borderRadius: 10,
                  padding:      "10px 14px",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0" }}>
                  <span style={{ color: "#9ca3af" }}>Número SINPE</span>
                  <span style={{ color: "#111827", fontWeight: 600 }}>{SINPE_NUMBER}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0" }}>
                  <span style={{ color: "#9ca3af" }}>Monto</span>
                  <span style={{ color: "#f97316", fontWeight: 700 }}>
                    ₡{Number(pedidoSinpe.totalPedido).toLocaleString("es-CR")}
                  </span>
                </div>
              </div>

              {/* Zona de subida / éxito */}
              {comprobanteEnviado ? (
                <div style={{ textAlign: "center", padding: "16px 0 4px", fontSize: 13, color: "#16a34a", fontWeight: 500 }}>
                  Comprobante enviado, prepararemos tu pedido pronto 🙌
                </div>
              ) : (
                <>
                  <input
                    ref={comprobanteInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={handleComprobanteChange}
                  />

                  {comprobantePreview ? (
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
                      <img
                        src={comprobantePreview}
                        alt="Comprobante"
                        style={{ width: "100%", maxHeight: 160, objectFit: "cover", display: "block" }}
                      />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderTop: "1px solid #f3f4f6" }}>
                        <span style={{ fontSize: 11, color: "#6b7280", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {comprobanteFile?.name}
                        </span>
                        <button
                          onClick={() => comprobanteInputRef.current?.click()}
                          style={{ fontSize: 11, color: "#f97316", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                        >
                          Cambiar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => comprobanteInputRef.current?.click()}
                      style={{ border: "1.5px dashed #e5e7eb", borderRadius: 10, padding: "16px", textAlign: "center", cursor: "pointer", marginBottom: 10 }}
                    >
                      <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>📎</span>
                      <p style={{ fontSize: 13, color: "#374151", fontWeight: 500, marginBottom: 3 }}>
                        Subir foto del comprobante
                      </p>
                      <p style={{ fontSize: 11, color: "#9ca3af" }}>JPG, PNG · Máx. 5MB</p>
                    </div>
                  )}

                  {comprobanteError && (
                    <p style={{ fontSize: 11, color: "#dc2626", background: "#fef2f2", borderRadius: 8, padding: "6px 10px", marginBottom: 10 }}>
                      {comprobanteError}
                    </p>
                  )}

                  <button
                    disabled={!comprobanteFile || subiendoComprobante}
                    onClick={handleConfirmarPago}
                    style={{
                      width:          "100%",
                      background:     !comprobanteFile ? "#e5e7eb" : "#f97316",
                      color:          !comprobanteFile ? "#9ca3af" : "white",
                      border:         "none",
                      borderRadius:   10,
                      padding:        "12px",
                      fontSize:       13,
                      fontWeight:     500,
                      cursor:         !comprobanteFile ? "not-allowed" : "pointer",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      gap:            8,
                    }}
                  >
                    {subiendoComprobante ? (
                      <><Loader2 size={15} className="animate-spin" /> Subiendo...</>
                    ) : (
                      "Confirmar pago"
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Cerrar */}
            <div style={{ padding: "12px 16px 20px", textAlign: "center" }}>
              <button
                onClick={cerrarSinpe}
                style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
              >
                {comprobanteEnviado ? "Cerrar" : "Cerrar sin enviar"}
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

                {items.map((item) => {
                  const itemExtras  = item.extras ?? [];
                  const extrasSum   = itemExtras.reduce((s, e) => s + e.precio, 0);
                  const precioTotal = item.precio + extrasSum;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-base truncate">
                            {item.nombre}
                          </p>
                          <p className="text-gray-400 text-sm mt-0.5">
                            ₡{precioTotal.toLocaleString("es-CR")} c/u
                            {extrasSum > 0 && (
                              <span className="text-orange-400 text-xs ml-1">
                                (base ₡{item.precio.toLocaleString("es-CR")} + extras)
                              </span>
                            )}
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
                            ₡{(precioTotal * item.cantidad).toLocaleString("es-CR")}
                          </p>
                        </div>
                      </div>

                      {/* Tags de extras seleccionados */}
                      {itemExtras.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                          {itemExtras.map((extra) => (
                            <span
                              key={extra.nombre}
                              style={{
                                background: "#f9fafb",
                                border: "1px solid #e5e7eb",
                                borderRadius: 10,
                                padding: "3px 8px",
                                fontSize: 9,
                                color: "#6b7280",
                              }}
                            >
                              {extra.nombre} ₡{extra.precio.toLocaleString("es-CR")}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Botón Agregar / Editar extras */}
                      <button
                        type="button"
                        onClick={() => setExtrasModal({ id: item.id, nombre: item.nombre, extras: itemExtras })}
                        style={{
                          width: "100%",
                          marginTop: 10,
                          background: "rgba(249,115,22,0.08)",
                          border: "1px dashed rgba(249,115,22,0.3)",
                          borderRadius: 8,
                          color: "#f97316",
                          fontSize: 11,
                          fontWeight: 500,
                          padding: "8px",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        🧀 {itemExtras.length > 0 ? "Editar extras" : "Agregar extras"}
                      </button>
                    </div>
                  );
                })}

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
