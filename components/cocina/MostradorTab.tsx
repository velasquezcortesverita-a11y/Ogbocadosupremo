"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, ShoppingCart, Trash2 } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ProductoPOS = {
  id: string;
  nombre: string;
  precio: number;
  categoria_id: string;
};

type CategoriaPOS = {
  id: string;
  nombre: string;
};

type TicketItem = {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₡${n.toLocaleString("es-CR")}`;

// ─── MostradorTab ─────────────────────────────────────────────────────────────

export default function MostradorTab() {
  const [productos,     setProductos]    = useState<ProductoPOS[]>([]);
  const [categorias,    setCategorias]   = useState<CategoriaPOS[]>([]);
  const [catActiva,     setCatActiva]    = useState<string>("all");
  const [ticket,        setTicket]       = useState<TicketItem[]>([]);
  const [metodoPago,    setMetodoPago]   = useState<"efectivo" | "sinpe" | null>(null);
  const [nombreCliente, setNombre]       = useState("");
  const [confirmando,   setConfirmando]  = useState(false);
  const [exito,         setExito]        = useState(false);
  const [error,         setError]        = useState<string | null>(null);
  const [loading,       setLoading]      = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase
          .from("productos")
          .select("id, nombre, precio, categoria_id")
          .eq("disponible", true)
          .order("nombre"),
        supabase
          .from("categorias")
          .select("id, nombre")
          .order("orden"),
      ]);
      setProductos((prods ?? []) as ProductoPOS[]);
      setCategorias((cats ?? []) as CategoriaPOS[]);
      setLoading(false);
    })();
  }, []);

  // Tocar un producto: agrega 1 unidad; si ya estaba, suma una más
  const agregarAlTicket = (prod: ProductoPOS) => {
    setTicket((prev) => {
      const exists = prev.find((i) => i.id === prod.id);
      if (exists) {
        return prev.map((i) => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { id: prod.id, nombre: prod.nombre, precio: prod.precio, cantidad: 1 }];
    });
  };

  const ajustarCantidad = (id: string, delta: number) => {
    setTicket((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, cantidad: i.cantidad + delta } : i)
        .filter((i) => i.cantidad > 0)
    );
  };

  const limpiarTicket = () => {
    setTicket([]);
    setMetodoPago(null);
    setNombre("");
    setError(null);
  };

  const total = ticket.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const totalItems = ticket.reduce((s, i) => s + i.cantidad, 0);

  const handleConfirmar = async () => {
    if (ticket.length === 0 || !metodoPago) return;
    setConfirmando(true);
    setError(null);

    try {
      const { data: pedidoData, error: pedidoErr } = await supabase
        .from("pedidos")
        .insert({
          nombre_cliente:       nombreCliente.trim() || "Mostrador",
          telefono:             "—",
          comentarios:          null,
          metodo_pago:          metodoPago,
          total,
          estado:               "preparando",
          delivery_method:      "pickup",
          // SINPE confirmado en persona — no requiere foto de comprobante
          comprobante_revisado: metodoPago === "sinpe",
          origen:               "mostrador",
        })
        .select("id")
        .single();

      if (pedidoErr) throw new Error(pedidoErr.message);

      const items = ticket.map((i) => ({
        pedido_id:       pedidoData.id,
        producto_id:     i.id,
        nombre_producto: i.nombre,
        cantidad:        i.cantidad,
        precio:          i.precio,
        extras:          [],
      }));

      const { error: itemsErr } = await supabase.from("pedido_items").insert(items);
      if (itemsErr) throw new Error(itemsErr.message);

      // Actualizar el resumen de ventas en tiempo real
      window.dispatchEvent(new CustomEvent("resumen-actualizar"));

      limpiarTicket();
      setExito(true);
      setTimeout(() => setExito(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al confirmar el pedido");
    } finally {
      setConfirmando(false);
    }
  };

  const productosFiltrados =
    catActiva === "all"
      ? productos
      : productos.filter((p) => p.categoria_id === catActiva);

  const btnPill = (active: boolean): React.CSSProperties => ({
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    border: active
      ? "1px solid rgba(249,115,22,0.35)"
      : "0.5px solid #e5e7eb",
    background: active ? "rgba(249,115,22,0.1)" : "rgba(0,0,0,0)",
    color: active ? "#f97316" : "#6b7280",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    transition: "all 0.1s",
  });

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Loader2 size={20} className="animate-spin" style={{ color: "#f97316" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "start" }}>

      {/* ── COLUMNA IZQUIERDA: Catálogo de productos ── */}
      <div style={{
        flex: 1, minWidth: 0,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 16,
        padding: 16,
      }}>

        {/* Filtro de categorías */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 14,
          overflowX: "auto", paddingBottom: 4,
          scrollbarWidth: "none",
        }}>
          <button type="button" style={btnPill(catActiva === "all")} onClick={() => setCatActiva("all")}>
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              type="button"
              style={btnPill(catActiva === cat.id)}
              onClick={() => setCatActiva(cat.id)}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Grid 3 columnas */}
        {productosFiltrados.length === 0 ? (
          <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, padding: "24px 0", margin: 0 }}>
            No hay productos en esta categoría
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {productosFiltrados.map((prod) => {
              const enTicket = ticket.find((i) => i.id === prod.id);
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => agregarAlTicket(prod)}
                  style={{
                    background: enTicket ? "rgba(249,115,22,0.07)" : "rgba(0,0,0,0.02)",
                    border: enTicket
                      ? "1px solid rgba(249,115,22,0.3)"
                      : "0.5px solid rgba(0,0,0,0.08)",
                    borderRadius: 10,
                    padding: "12px 6px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.1s",
                    position: "relative",
                  }}
                >
                  {/* Badge de cantidad en el producto */}
                  {enTicket && (
                    <span style={{
                      position: "absolute", top: 4, right: 6,
                      background: "#f97316", color: "#fff",
                      borderRadius: "50%",
                      width: 16, height: 16,
                      fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {enTicket.cantidad}
                    </span>
                  )}
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>
                    {prod.nombre}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#f97316", fontWeight: 500 }}>
                    {fmt(prod.precio)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── COLUMNA DERECHA: Ticket ── */}
      <div style={{
        width: 320, flexShrink: 0,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.07)",
        borderRadius: 16,
        padding: 16,
      }}>

        {/* Header del ticket */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <ShoppingCart size={14} style={{ color: "#9ca3af" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Ticket</span>
          {ticket.length > 0 && (
            <>
              <span style={{
                marginLeft: "auto",
                background: "#f97316", color: "#fff",
                borderRadius: 20, fontSize: 10, fontWeight: 700,
                padding: "1px 7px",
              }}>
                {totalItems} ítem{totalItems !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={limpiarTicket}
                title="Vaciar ticket"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2, display: "flex" }}
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>

        {/* Lista de ítems */}
        {ticket.length === 0 ? (
          <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, padding: "28px 0", margin: 0 }}>
            Tocá un producto para agregarlo
          </p>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {ticket.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 0",
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                {/* Stepper */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => ajustarCantidad(item.id, -1)}
                    style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "rgba(0,0,0,0.05)",
                      border: "0.5px solid rgba(0,0,0,0.1)",
                      color: "#6b7280", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, lineHeight: 1, padding: 0,
                    }}
                  >
                    −
                  </button>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: "#f97316",
                    width: 16, textAlign: "center",
                  }}>
                    {item.cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => ajustarCantidad(item.id, 1)}
                    style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "#f97316", border: "none",
                      color: "#fff", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, lineHeight: 1, padding: 0,
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Nombre */}
                <span style={{
                  flex: 1, fontSize: 12, fontWeight: 500, color: "#111827",
                  minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {item.nombre}
                </span>

                {/* Subtotal de línea */}
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", flexShrink: 0 }}>
                  {fmt(item.precio * item.cantidad)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        {ticket.length > 0 && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: 10,
            borderTop: "1.5px solid rgba(0,0,0,0.08)",
            marginBottom: 14,
          }}>
            <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#f97316" }}>{fmt(total)}</span>
          </div>
        )}

        {/* Nombre del cliente (opcional) */}
        <input
          type="text"
          value={nombreCliente}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del cliente (opcional)"
          style={{
            width: "100%", boxSizing: "border-box",
            border: "0.5px solid rgba(0,0,0,0.12)",
            borderRadius: 8, padding: "8px 10px",
            fontSize: 12, color: "#374151",
            background: "#fafafa",
            marginBottom: 10,
            outline: "none",
          }}
        />

        {/* Método de pago */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          {(["efectivo", "sinpe"] as const).map((met) => (
            <button
              key={met}
              type="button"
              onClick={() => setMetodoPago(metodoPago === met ? null : met)}
              style={{
                padding: "10px 0",
                borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: metodoPago === met
                  ? "1.5px solid rgba(249,115,22,0.5)"
                  : "0.5px solid rgba(0,0,0,0.12)",
                background: metodoPago === met ? "rgba(249,115,22,0.08)" : "rgba(0,0,0,0.02)",
                color: metodoPago === met ? "#f97316" : "#6b7280",
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              {met === "efectivo" ? "💵 Efectivo" : "📱 SINPE"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <p style={{
            fontSize: 11, color: "#dc2626",
            background: "rgba(220,38,38,0.05)",
            border: "1px solid rgba(220,38,38,0.15)",
            borderRadius: 6, padding: "6px 10px",
            margin: "0 0 10px",
          }}>
            {error}
          </p>
        )}

        {/* Botón confirmar */}
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={confirmando || ticket.length === 0 || !metodoPago}
          style={{
            width: "100%",
            background: exito
              ? "#22c55e"
              : ticket.length === 0 || !metodoPago
              ? "#d1d5db"
              : "#f97316",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "13px 0",
            fontSize: 14, fontWeight: 700,
            cursor: confirmando || ticket.length === 0 || !metodoPago ? "not-allowed" : "pointer",
            transition: "background 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {confirmando ? (
            <><Loader2 size={14} className="animate-spin" />Confirmando...</>
          ) : exito ? (
            "✓ Pedido enviado a cocina"
          ) : (
            "Confirmar pedido"
          )}
        </button>

      </div>
    </div>
  );
}
