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
} from "lucide-react";

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

  const { openModal, setOnConfirm } = useDeliveryStore();
  const router = useRouter();

  // Bloquea el scroll del body mientras el modal de éxito está abierto
  useEffect(() => {
    document.body.style.overflow = pedidoEnviado ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [pedidoEnviado]);

  // Envía el pedido a Supabase — se llama desde el modal al confirmar la entrega
  const enviarPedido = async () => {
    // Leer delivery ANTES del primer await: closeModal() resetea address justo después
    const { selectedMethod, address: deliveryAddress } = useDeliveryStore.getState();

    setEnviando(true);

    const payload = {
      nombre_cliente: nombre,
      telefono,
      comentarios,
      metodo_pago: metodoPago,
      total: total(),
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
    setPedidoEnviado(true);
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
      {/* Modal de éxito — aparece solo tras un insert exitoso */}
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
                      onChange={(e) => setNombre(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      placeholder="Ej. 8888-8888"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
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
