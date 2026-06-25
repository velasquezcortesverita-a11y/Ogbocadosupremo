"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Extra } from "@/store/carstore";
import { Loader2 } from "lucide-react";

type ExtraDB = { id: string; nombre: string; precio: number };

type Props = {
  productoId:    string;
  itemNombre:    string;
  currentExtras: Extra[];
  onSave:        (extras: Extra[]) => void;
  onClose:       () => void;
};

export default function ExtrasModal({ productoId, itemNombre, currentExtras, onSave, onClose }: Props) {
  const [disponibles, setDisponibles] = useState<ExtraDB[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [cantidades,  setCantidades]  = useState<Map<string, number>>(
    () => new Map(currentExtras.map((e) => [e.nombre, e.cantidad ?? 1]))
  );

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      // 1. Obtener extras_permitidos del platillo (null = todos permitidos)
      const { data: prod } = await supabase
        .from("productos")
        .select("extras_permitidos")
        .eq("id", productoId)
        .maybeSingle();

      const permitidos = prod?.extras_permitidos as string[] | null | undefined;

      // 2. Obtener categoría de extras
      const { data: cats } = await supabase
        .from("categorias")
        .select("id")
        .ilike("nombre", "%extra%");

      if (!cats || cats.length === 0) { setLoading(false); return; }

      const catIds = cats.map((c: { id: string }) => c.id);

      // 3. Obtener todos los extras
      const { data } = await supabase
        .from("productos")
        .select("id, nombre, precio")
        .in("categoria_id", catIds)
        .order("nombre");

      const todos = (data ?? []) as ExtraDB[];

      // 4. Filtrar según extras_permitidos (null = todos)
      const filtrados = (permitidos == null)
        ? todos
        : todos.filter((e) => permitidos.includes(e.id));

      setDisponibles(filtrados);
      setLoading(false);
    })();
  }, [productoId]);

  const cambiarCantidad = (nombre: string, delta: number) => {
    setCantidades((prev) => {
      const next = new Map(prev);
      const cur  = next.get(nombre) ?? 0;
      const val  = Math.max(0, Math.min(10, cur + delta));
      if (val === 0) next.delete(nombre);
      else next.set(nombre, val);
      return next;
    });
  };

  const guardar = () => {
    const extras: Extra[] = disponibles
      .filter((e) => (cantidades.get(e.nombre) ?? 0) > 0)
      .map((e)   => ({ nombre: e.nombre, precio: e.precio, cantidad: cantidades.get(e.nombre)! }));
    onSave(extras);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
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
          width: "100%",
          maxWidth: 340,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "#111827" }}>
            Extras para {itemNombre}
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, lineHeight: 1, padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Lista */}
        <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
              <Loader2 size={18} className="animate-spin" style={{ color: "#f97316" }} />
            </div>
          ) : disponibles.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, padding: "24px 16px" }}>
              No hay extras disponibles para este platillo
            </p>
          ) : (
            disponibles.map((extra) => {
              const qty = cantidades.get(extra.nombre) ?? 0;
              return (
                <div
                  key={extra.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 16px",
                    borderBottom: "0.5px solid #f3f4f6",
                  }}
                >
                  {/* Nombre + precio unitario */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ fontSize: 11, color: "var(--color-text-primary, #111827)", fontWeight: 500 }}>
                      {extra.nombre}
                    </span>
                    <span style={{ fontSize: 10, color: "#f97316", fontWeight: 500 }}>
                      ₡{extra.precio.toLocaleString("es-CR")} c/u
                    </span>
                  </div>

                  {/* Stepper */}
                  <div style={{
                    background: "var(--color-background-secondary, #f9fafb)",
                    borderRadius: 16,
                    padding: "4px 6px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}>
                    {/* Botón − */}
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(extra.nombre, -1)}
                      style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: "var(--color-background-primary, #fff)",
                        border: "0.5px solid var(--color-border-tertiary, #d1d5db)",
                        color: "var(--color-text-secondary, #6b7280)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: qty === 0 ? "not-allowed" : "pointer",
                        opacity: qty === 0 ? 0.4 : 1,
                        padding: 0, flexShrink: 0, fontSize: 14, lineHeight: 1,
                      }}
                    >
                      −
                    </button>

                    {/* Cantidad */}
                    <span style={{
                      fontSize: 11,
                      color: "var(--color-text-primary, #111827)",
                      fontWeight: 500,
                      width: 14,
                      textAlign: "center",
                      display: "inline-block",
                    }}>
                      {qty}
                    </span>

                    {/* Botón + */}
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(extra.nombre, 1)}
                      style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: qty > 0 ? "#f97316" : "var(--color-background-primary, #fff)",
                        border: qty > 0 ? "none" : "0.5px solid var(--color-border-tertiary, #d1d5db)",
                        color: qty > 0 ? "#fff" : "var(--color-text-secondary, #6b7280)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                        padding: 0, flexShrink: 0, fontSize: 14, lineHeight: 1, fontWeight: 600,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px 14px", borderTop: "1px solid #f3f4f6" }}>
          <button
            type="button"
            onClick={guardar}
            style={{
              width: "100%",
              background: "#f97316",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Guardar extras
          </button>
        </div>
      </div>
    </div>
  );
}
