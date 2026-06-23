"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Extra } from "@/store/carstore";
import { Loader2 } from "lucide-react";

type ExtraDB = { id: string; nombre: string; precio: number };

type Props = {
  itemNombre:    string;
  currentExtras: Extra[];
  onSave:        (extras: Extra[]) => void;
  onClose:       () => void;
};

export default function ExtrasModal({ itemNombre, currentExtras, onSave, onClose }: Props) {
  const [disponibles, setDisponibles] = useState<ExtraDB[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<Set<string>>(
    () => new Set(currentExtras.map((e) => e.nombre))
  );

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      // Buscar la categoría "Extras" (case-insensitive, partial match)
      const { data: cats } = await supabase
        .from("categorias")
        .select("id")
        .ilike("nombre", "%extra%");

      if (!cats || cats.length === 0) {
        setLoading(false);
        return;
      }

      const catIds = cats.map((c: { id: string }) => c.id);

      const { data } = await supabase
        .from("productos")
        .select("id, nombre, precio")
        .in("categoria_id", catIds)
        .order("nombre");

      setDisponibles((data ?? []) as ExtraDB[]);
      setLoading(false);
    })();
  }, []);

  const toggle = (nombre: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(nombre) ? next.delete(nombre) : next.add(nombre);
      return next;
    });
  };

  const guardar = () => {
    const extras: Extra[] = disponibles
      .filter((e) => selected.has(e.nombre))
      .map((e) => ({ nombre: e.nombre, precio: e.precio }));
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
              No hay extras disponibles
            </p>
          ) : (
            disponibles.map((extra) => {
              const checked = selected.has(extra.nombre);
              return (
                <div
                  key={extra.id}
                  onClick={() => toggle(extra.nombre)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 16px",
                    borderBottom: "0.5px solid #f3f4f6",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: 11, color: "#111827" }}>{extra.nombre}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, color: "#f97316", fontWeight: 500 }}>
                      +₡{extra.precio.toLocaleString("es-CR")}
                    </span>
                    {/* Checkbox */}
                    <div style={{
                      width: 18, height: 18,
                      borderRadius: 5,
                      border: `1.5px solid ${checked ? "#f97316" : "#d1d5db"}`,
                      background: checked ? "#f97316" : "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.12s",
                      flexShrink: 0,
                    }}>
                      {checked && (
                        <svg viewBox="0 0 10 8" width="10" height="8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
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
