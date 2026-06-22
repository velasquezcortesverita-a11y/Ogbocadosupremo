"use client";

import { useState } from "react";
import ProductosTab from "@/components/cocina/ProductosTab";
import SinpesTab    from "@/components/cocina/SinpesTab";

type Tab = "pedidos" | "sinpes" | "productos";

export default function CocinaTabsWrapper({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>("pedidos");

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
        <button style={pill(tab === "sinpes")}    onClick={() => setTab("sinpes")}>
          Sinpes
        </button>
        <button style={pill(tab === "productos")} onClick={() => setTab("productos")}>
          Productos
        </button>
      </div>

      {/*
        Todas las pestañas permanecen montadas (display none/block)
        para mantener vivas las suscripciones Realtime.
      */}
      <div style={{ display: tab === "pedidos"   ? "block" : "none" }}>{children}</div>
      <div style={{ display: tab === "sinpes"    ? "block" : "none" }}><SinpesTab /></div>
      <div style={{ display: tab === "productos" ? "block" : "none" }}><ProductosTab /></div>
    </>
  );
}
