"use client";

import { useState } from "react";
import ProductosTab from "@/components/cocina/ProductosTab";

export default function CocinaTabsWrapper({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<"pedidos" | "productos">("pedidos");

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "6px 18px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: active
      ? "1px solid rgba(249,115,22,0.35)"
      : "0.5px solid rgba(255,255,255,0.14)",
    background: active ? "rgba(249,115,22,0.1)" : "transparent",
    color: active ? "#f97316" : "rgba(255,255,255,0.45)",
    transition: "all 0.15s",
  });

  return (
    <>
      {/* Tab pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button style={pill(tab === "pedidos")}   onClick={() => setTab("pedidos")}>
          Pedidos
        </button>
        <button style={pill(tab === "productos")} onClick={() => setTab("productos")}>
          Productos
        </button>
      </div>

      {/*
        Ambas pestañas se mantienen montadas (display none / block)
        para que las suscripciones Realtime de Pedidos no se corten
        al cambiar de tab.
      */}
      <div style={{ display: tab === "pedidos"   ? "block" : "none" }}>{children}</div>
      <div style={{ display: tab === "productos" ? "block" : "none" }}><ProductosTab /></div>
    </>
  );
}
