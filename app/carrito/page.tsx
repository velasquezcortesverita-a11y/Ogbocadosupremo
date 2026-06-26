"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCartStore, type Extra, type CartItem } from "@/store/carstore";
import { useDeliveryStore } from "@/store/deliveryStore";
import { useCheckoutPrefillStore } from "@/store/checkoutPrefillStore";
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
import { calcularEstado, type EstadoHorario } from "@/lib/horario";

// ─── Constantes del negocio ───────────────────────────────────────────────────
// TEMPORAL: número de prueba — reemplazar antes de producción con el número oficial de Bocado Supremo
const SINPE_NUMBER = process.env.NEXT_PUBLIC_SINPE_NUMBER ?? "Configurar número de SINPE";

function CarritoContent() {
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sinpePendiente, setSinpePendiente] = useState<{
    totalPedido:        number;
    nombreCliente:      string;
    telefonoCliente:    string;
    comentariosCliente: string;
    selectedMethod:     "pickup" | "delivery" | null;
    deliveryAddress:    string | null;
    items:              CartItem[];
  } | null>(null);
  const [numeroPedidoCreado, setNumeroPedidoCreado] = useState<number | null>(null);
  // Feature flag: NEXT_PUBLIC_BLOQUEAR_PEDIDOS_CERRADO="true" activa el bloqueo
  const bloqueoActivo = process.env.NEXT_PUBLIC_BLOQUEAR_PEDIDOS_CERRADO === "true";
  // TEST-ONLY: ?forzar_cerrado=true simula estado cerrado (solo tiene efecto si bloqueoActivo=true)
  const searchParams = useSearchParams();
  const forzarCerrado = bloqueoActivo && searchParams.get("forzar_cerrado") === "true";
  const [estadoHorario, setEstadoHorario] = useState<EstadoHorario>(() => calcularEstado());
  const estadoEfectivo: EstadoHorario = !bloqueoActivo
    ? { abierto: true }
    : forzarCerrado
    ? { abierto: false, mensaje: "Cerrado · Abrimos mañana a las 11:00 am" }
    : estadoHorario;
  const [comprobanteFile, setComprobanteFile]         = useState<File | null>(null);
  const [comprobantePreview, setComprobantePreview]   = useState<string | null>(null);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const [comprobanteEnviado, setComprobanteEnviado]   = useState(false);
  const [comprobanteError, setComprobanteError]       = useState<string | null>(null);
  const comprobanteInputRef = useRef<HTMLInputElement>(null);

  const { openModal, setOnConfirm, setMethod: setDeliveryMethod, setAddress: setDeliveryAddress } = useDeliveryStore();
  const prefill      = useCheckoutPrefillStore((s) => s.prefill);
  const clearPrefill = useCheckoutPrefillStore((s) => s.clearPrefill);
  const router = useRouter();

  // Precompletar campos del checkout con datos del pedido anterior (si viene de "Repetir último pedido")
  useEffect(() => {
    if (!prefill) return;
    setNombre(prefill.nombre);
    setTelefono(prefill.telefono);
    setComentarios(prefill.comentarios);
    setMetodoPago(prefill.metodoPago);
    if (prefill.deliveryMethod) {
      setDeliveryMethod(prefill.deliveryMethod);
      if (prefill.deliveryAddress) setDeliveryAddress(prefill.deliveryAddress);
    }
    clearPrefill();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresca el estado del horario cada minuto (igual que HorarioBadge)
  useEffect(() => {
    const id = setInterval(() => setEstadoHorario(calcularEstado()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Bloquea el scroll mientras cualquier modal de confirmación está abierto
  useEffect(() => {
    document.body.style.overflow =
      pedidoEnviado || sinpePendiente !== null ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [pedidoEnviado, sinpePendiente]);

  // Registra evento de carrito para medir abandono
  useEffect(() => {
    if (items.length === 0) return;
    if (sessionStorage.getItem("carrito_evento_id")) return;
    (async () => {
      const { data } = await supabase
        .from("eventos_carrito")
        .insert({
          productos: items.map((i) => ({ id: i.id, nombre: i.nombre, cantidad: i.cantidad })),
          total: total(),
          completado: false,
        })
        .select("id")
        .single();
      if (data?.id) sessionStorage.setItem("carrito_evento_id", data.id);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Envía el pedido a Supabase — se llama desde el modal al confirmar la entrega
  const enviarPedido = async () => {
    // Leer delivery ANTES del primer await: closeModal() resetea address justo después
    const { selectedMethod, address: deliveryAddress } = useDeliveryStore.getState();

    // Capturar valores del form ANTES de limpiarlos
    const pagoLocal   = metodoPago;
    const nombreLocal = nombre;
    const totalLocal  = total();

    // SINPE: no crear el pedido hasta que el cliente adjunte el comprobante
    if (pagoLocal === "sinpe") {
      setSinpePendiente({
        totalPedido:        totalLocal,
        nombreCliente:      nombreLocal,
        telefonoCliente:    telefono,
        comentariosCliente: comentarios,
        selectedMethod,
        deliveryAddress:    selectedMethod === "delivery" ? deliveryAddress : null,
        items:              [...items],
      });
      return;
    }

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
      pedido_id:       pedido.id,
      producto_id:     item.id,
      nombre_producto: item.nombre,
      cantidad:        item.cantidad,
      precio:          item.precio,
      extras:          item.extras ?? [],
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

    // Marcar evento de carrito como completado
    const eventoId = sessionStorage.getItem("carrito_evento_id");
    if (eventoId) {
      await supabase
        .from("eventos_carrito")
        .update({ completado: true, telefono })
        .eq("id", eventoId);
      sessionStorage.removeItem("carrito_evento_id");
    }

    limpiarCarrito();
    setNombre("");
    setTelefono("");
    setComentarios("");
    setMetodoPago("");
    setFieldErrors({});
    setEnviando(false);
    setPedidoEnviado(true);
  };

  const validarCampo = (campo: string, valor: string): string => {
    if (campo === "nombre")     return !valor.trim() ? "El nombre es obligatorio" : "";
    if (campo === "telefono")   return !valor ? "El teléfono es obligatorio" : valor.length < 8 ? "El teléfono debe tener 8 dígitos" : "";
    if (campo === "metodoPago") return !valor ? "Seleccioná un método de pago" : "";
    return "";
  };

  // Valida el form, registra el callback y abre el modal de entrega
  const handleFormSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs: Record<string, string> = {
      nombre:     validarCampo("nombre",     nombre),
      telefono:   validarCampo("telefono",   telefono),
      metodoPago: validarCampo("metodoPago", metodoPago),
    };
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      const primerError = Object.keys(errs).find((k) => errs[k]);
      if (primerError) document.querySelector(`[data-field="${primerError}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    if (!comprobanteFile || !sinpePendiente) return;
    setSubiendoComprobante(true);
    setComprobanteError(null);
    try {
      // 1. Subir comprobante a Cloudinary
      const form = new FormData();
      form.append("file", comprobanteFile);
      form.append("folder", "bocado-supremo/comprobantes");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Error al subir el comprobante.");
      const { url } = (await res.json()) as { url: string };

      // 2. Crear pedido incluyendo comprobante_url desde el inicio
      const { data: pedido, error: pedidoErr } = await supabase
        .from("pedidos")
        .insert({
          nombre_cliente:   sinpePendiente.nombreCliente,
          telefono:         sinpePendiente.telefonoCliente,
          comentarios:      sinpePendiente.comentariosCliente,
          metodo_pago:      "sinpe",
          total:            sinpePendiente.totalPedido,
          delivery_method:  sinpePendiente.selectedMethod,
          delivery_address: sinpePendiente.deliveryAddress,
          comprobante_url:  url,
        })
        .select()
        .single();
      if (pedidoErr) throw new Error(pedidoErr.message);

      // 3. Crear items del pedido
      const detalles = sinpePendiente.items.map((item) => ({
        pedido_id:       pedido.id,
        producto_id:     item.id,
        nombre_producto: item.nombre,
        cantidad:        item.cantidad,
        precio:          item.precio,
        extras:          item.extras ?? [],
      }));
      const { error: itemsErr } = await supabase.from("pedido_items").insert(detalles);
      if (itemsErr) throw new Error(itemsErr.message);

      // 4. Marcar evento de carrito como completado
      const eventoId = sessionStorage.getItem("carrito_evento_id");
      if (eventoId) {
        await supabase
          .from("eventos_carrito")
          .update({ completado: true, telefono: sinpePendiente.telefonoCliente })
          .eq("id", eventoId);
        sessionStorage.removeItem("carrito_evento_id");
      }

      // 5. Guardar número de pedido para mostrarlo en confirmación
      setNumeroPedidoCreado((pedido as { numero_pedido: number }).numero_pedido);

      // 6. Limpiar carrito y formulario
      limpiarCarrito();
      setNombre(""); setTelefono(""); setComentarios(""); setMetodoPago(""); setFieldErrors({});

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
    const enviado = comprobanteEnviado;
    setComprobanteEnviado(false);
    setComprobanteError(null);
    setNumeroPedidoCreado(null);
    setSinpePendiente(null);
    document.body.style.overflow = "";
    if (enviado) router.push("/");
    // Si no se envió: no redirigir, el carrito sigue visible para reintentar
  };

  const inputBase  = "w-full border rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all";
  const inputClass = `${inputBase} border-gray-200 bg-white focus:ring-orange-400`;
  const getInputCls = (campo: string) =>
    fieldErrors[campo]
      ? `${inputBase} border-red-400 bg-red-50/40 focus:ring-red-300`
      : inputClass;

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
      {sinpePendiente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white w-full max-w-sm shadow-xl overflow-y-auto"
            style={{ borderRadius: 16, maxHeight: "90vh" }}
          >
            {/* Saludo */}
            <div className="pt-7 pb-5 px-6 text-center">
              <p style={{ fontSize: 32, lineHeight: 1, marginBottom: 10 }}>🎉</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 4 }}>
                ¡Gracias, {sinpePendiente.nombreCliente}!
              </p>
              <p style={{ fontSize: 11, color: "#6b7280" }}>
                {numeroPedidoCreado ? `Pedido #${numeroPedidoCreado} · ` : ""}₡
                {Number(sinpePendiente.totalPedido).toLocaleString("es-CR")}
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
                    ₡{Number(sinpePendiente.totalPedido).toLocaleString("es-CR")}
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
                  const extrasSum   = itemExtras.reduce((s, e) => s + e.precio * (e.cantidad ?? 1), 0);
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
                          {itemExtras.map((extra) => {
                            const qty = extra.cantidad ?? 1;
                            return (
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
                                {extra.nombre}{qty > 1 ? ` x${qty}` : ""} ₡{extra.precio.toLocaleString("es-CR")}
                              </span>
                            );
                          })}
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
                    ₡{total().toLocaleString("es-CR")}
                  </span>
                </div>
              </div>

              {/* Right: Form / Aviso cerrado */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 lg:sticky lg:top-24">
                {!estadoEfectivo.abierto ? (
                  <div style={{ textAlign: "center", padding: "24px 8px 16px" }}>
                    <p style={{ fontSize: 28, lineHeight: 1, marginBottom: 14 }}>🌙</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary, #111827)", marginBottom: 8 }}>
                      Estamos cerrados ahora
                    </p>
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary, #6b7280)", lineHeight: 1.6, maxWidth: 240, margin: "0 auto" }}>
                      {estadoEfectivo.mensaje.replace(/^Cerrado · /, "")} — guardá tu pedido y volvé entonces
                    </p>
                  </div>
                ) : (
                  <>
                <h2 className="text-lg font-bold text-gray-900 mb-5">
                  Datos de tu pedido
                </h2>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div data-field="nombre">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                      Nombre completo<span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez"
                      value={nombre}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[0-9]/g, "");
                        setNombre(val);
                        if (fieldErrors.nombre) setFieldErrors((p) => ({ ...p, nombre: validarCampo("nombre", val) }));
                      }}
                      onBlur={(e) => setFieldErrors((p) => ({ ...p, nombre: validarCampo("nombre", e.target.value.replace(/[0-9]/g, "")) }))}
                      className={getInputCls("nombre")}
                    />
                    {fieldErrors.nombre && (
                      <p style={{ fontSize: 10, color: "#ef4444", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                        ⚠ {fieldErrors.nombre}
                      </p>
                    )}
                  </div>

                  <div data-field="telefono">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                      Teléfono<span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="Ej. 88888888"
                      maxLength={8}
                      value={telefono}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                        setTelefono(val);
                        if (fieldErrors.telefono) setFieldErrors((p) => ({ ...p, telefono: validarCampo("telefono", val) }));
                      }}
                      onBlur={(e) => setFieldErrors((p) => ({ ...p, telefono: validarCampo("telefono", e.target.value.replace(/\D/g, "").slice(0, 8)) }))}
                      className={getInputCls("telefono")}
                    />
                    {fieldErrors.telefono && (
                      <p style={{ fontSize: 10, color: "#ef4444", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                        ⚠ {fieldErrors.telefono}
                      </p>
                    )}
                  </div>

                  <div data-field="metodoPago">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                      Método de pago<span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => {
                        setMetodoPago(e.target.value);
                        if (fieldErrors.metodoPago) setFieldErrors((p) => ({ ...p, metodoPago: validarCampo("metodoPago", e.target.value) }));
                      }}
                      onBlur={(e) => setFieldErrors((p) => ({ ...p, metodoPago: validarCampo("metodoPago", e.target.value) }))}
                      className={getInputCls("metodoPago")}
                    >
                      <option value="">Seleccione una opción</option>
                      <option value="sinpe">SINPE Móvil</option>
                      <option value="efectivo">Efectivo</option>
                    </select>
                    {fieldErrors.metodoPago && (
                      <p style={{ fontSize: 10, color: "#ef4444", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                        ⚠ {fieldErrors.metodoPago}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                      Comentarios{" "}
                      <span style={{ fontSize: 9, color: "var(--color-text-tertiary, #9ca3af)", fontStyle: "italic", marginLeft: 4 }}>
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
                        ₡{total().toLocaleString("es-CR")}
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
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function CarritoPage() {
  return (
    <Suspense>
      <CarritoContent />
    </Suspense>
  );
}
