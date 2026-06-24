"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCartStore } from "@/store/carstore";
import type { Extra } from "@/store/carstore";

type PedidoItem = {
  nombre_producto: string;
  cantidad: number;
  precio: number;
  extras: Extra[] | null;
  producto_id: string | null;
};

type UltimoPedido = {
  created_at: string;
  total: number | string;
  pedido_items: PedidoItem[];
};

type ProductoActual = {
  id: string;
  nombre: string;
  precio: number;
  imagen_url: string | null;
  disponible: boolean | null;
};

const fmt = (n: number) => `₡${n.toLocaleString("es-CR")}`;

export default function RepetirPedido() {
  const [telefono,     setTelefono]     = useState("");
  const [buscando,     setBuscando]     = useState(false);
  const [pedido,       setPedido]       = useState<UltimoPedido | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [omitidos,     setOmitidos]     = useState<string[]>([]);
  const [cargando,     setCargando]     = useState(false);

  const agregarProducto = useCartStore((s) => s.agregarProducto);
  const setExtras       = useCartStore((s) => s.setExtras);
  const limpiarCarrito  = useCartStore((s) => s.limpiarCarrito);
  const router          = useRouter();

  const buscar = async () => {
    if (telefono.length !== 8) return;
    setBuscando(true);
    setPedido(null);
    setNoEncontrado(false);
    setOmitidos([]);

    const { data } = await supabase
      .from("pedidos")
      .select(`
        created_at, total,
        pedido_items (nombre_producto, cantidad, precio, extras, producto_id)
      `)
      .eq("telefono", telefono)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      setNoEncontrado(true);
    } else {
      setPedido(data as unknown as UltimoPedido);
    }
    setBuscando(false);
  };

  const pedirLoMismo = async () => {
    if (!pedido) return;
    setCargando(true);

    const items = pedido.pedido_items;
    const ids   = items.map((i) => i.producto_id).filter(Boolean) as string[];

    let actuales: ProductoActual[] = [];
    if (ids.length > 0) {
      const { data } = await supabase
        .from("productos")
        .select("id, nombre, precio, imagen_url, disponible")
        .in("id", ids);
      actuales = (data ?? []) as ProductoActual[];
    }

    const omitidosList: string[] = [];
    limpiarCarrito();

    for (const item of items) {
      const actual = item.producto_id
        ? actuales.find((p) => p.id === item.producto_id)
        : null;

      if (!actual || actual.disponible === false) {
        omitidosList.push(item.nombre_producto);
        continue;
      }

      for (let i = 0; i < item.cantidad; i++) {
        agregarProducto({
          id:         actual.id,
          nombre:     actual.nombre,
          precio:     Number(actual.precio),
          imagen_url: actual.imagen_url ?? undefined,
        });
      }

      if (item.extras && item.extras.length > 0) {
        setExtras(actual.id, item.extras);
      }
    }

    setOmitidos(omitidosList);
    setCargando(false);

    if (items.length - omitidosList.length > 0) {
      router.push("/carrito");
    }
  };

  const formatFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CR", {
      timeZone: "America/Costa_Rica",
      weekday: "long", day: "numeric", month: "long",
    });

  return (
    <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 10px" }}>
        🔁 ¿Ya pediste antes?
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="tel"
          inputMode="numeric"
          placeholder="Número de teléfono (8 dígitos)"
          maxLength={8}
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value.replace(/\D/g, "").slice(0, 8));
            setPedido(null);
            setNoEncontrado(false);
            setOmitidos([]);
          }}
          style={{
            flex: 1,
            border: "1px solid #d1d5db", borderRadius: 8,
            padding: "8px 12px", fontSize: 13,
            outline: "none", background: "#fff", color: "#374151",
          }}
        />
        <button
          type="button"
          onClick={buscar}
          disabled={telefono.length !== 8 || buscando}
          style={{
            background: telefono.length === 8 ? "#111827" : "#e5e7eb",
            color: telefono.length === 8 ? "#fff" : "#9ca3af",
            border: "none", borderRadius: 8,
            padding: "8px 14px", fontSize: 12, fontWeight: 500,
            cursor: telefono.length === 8 ? "pointer" : "default",
            whiteSpace: "nowrap",
          }}
        >
          {buscando ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {noEncontrado && (
        <p style={{ fontSize: 12, color: "#6b7280", margin: "10px 0 0" }}>
          No encontramos pedidos anteriores con este número.
        </p>
      )}

      {pedido && (
        <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
            Último pedido · {formatFecha(pedido.created_at)}
          </p>
          <ul style={{ margin: "0 0 10px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
            {pedido.pedido_items.map((item, i) => (
              <li key={i} style={{ fontSize: 12, color: "#374151", display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{item.nombre_producto} ×{item.cantidad}</span>
                <span style={{ color: "#f97316", fontWeight: 500, flexShrink: 0 }}>
                  {fmt(Number(item.precio) * item.cantidad)}
                </span>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f3f4f6", paddingTop: 10, gap: 8 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              Total: <strong style={{ color: "#111827" }}>{fmt(Number(pedido.total))}</strong>
            </span>
            <button
              type="button"
              onClick={pedirLoMismo}
              disabled={cargando}
              style={{
                background: "#f97316", color: "#fff", border: "none",
                borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600,
                cursor: cargando ? "default" : "pointer", opacity: cargando ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {cargando ? "Cargando..." : "🔁 Pedir lo mismo"}
            </button>
          </div>

          {omitidos.length > 0 && (
            <div style={{ marginTop: 10, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 8, padding: "8px 10px" }}>
              <p style={{ fontSize: 11, color: "#92400e", margin: 0 }}>
                ⚠️ Ya no disponibles y no se agregaron: {omitidos.join(", ")}
              </p>
              {omitidos.length < pedido.pedido_items.length && (
                <button
                  type="button"
                  onClick={() => router.push("/carrito")}
                  style={{ marginTop: 6, fontSize: 11, color: "#f97316", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}
                >
                  Ver carrito con lo disponible →
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
