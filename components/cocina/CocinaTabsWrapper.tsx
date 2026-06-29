"use client";

import { useState } from "react";
import ProductosTab   from "@/components/cocina/ProductosTab";
import SinpesTab      from "@/components/cocina/SinpesTab";
import HistorialTab   from "@/components/cocina/HistorialTab";
import MostradorTab   from "@/components/cocina/MostradorTab";

type Tab = "pedidos" | "sinpes" | "historial" | "productos" | "mostrador";

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
    // rgba(0,0,0,0) en lugar de "transparent" para sobreescribir
    // el fondo nativo del botón que aplica el preflight de Tailwind v4
    background: active ? "rgba(249,115,22,0.1)" : "rgba(0,0,0,0)",
    color: active ? "#f97316" : "#6b7280",
    transition: "all 0.15s",
    lineHeight: 1.2,
  });

  // Clases base que eliminan el estilo nativo del navegador en <button>
  const btnBase = "appearance-none outline-none";

  return (
    <>
      {/* Tab pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        <button type="button" className={btnBase} style={pill(tab === "pedidos")}    onClick={() => setTab("pedidos")}>
          Pedidos
        </button>
        <button type="button" className={btnBase} style={pill(tab === "mostrador")}  onClick={() => setTab("mostrador")}>
          🏪 Mostrador
        </button>
        <button type="button" className={btnBase} style={pill(tab === "sinpes")}     onClick={() => setTab("sinpes")}>
          Sinpes
        </button>
        <button type="button" className={btnBase} style={pill(tab === "historial")}  onClick={() => setTab("historial")}>
          Historial de ventas
        </button>
        <button type="button" className={btnBase} style={pill(tab === "productos")}  onClick={() => setTab("productos")}>
          Productos
        </button>
      </div>

      {/*
        Todas las pestañas permanecen montadas (display none/block)
        para mantener vivas las suscripciones Realtime.
      */}
      <div style={{ display: tab === "pedidos"    ? "block" : "none" }}>{children}</div>
      <div style={{ display: tab === "mostrador"  ? "block" : "none" }}><MostradorTab /></div>
      <div style={{ display: tab === "sinpes"     ? "block" : "none" }}><SinpesTab /></div>
      <div style={{ display: tab === "historial"  ? "block" : "none" }}><HistorialTab /></div>
      <div style={{ display: tab === "productos"  ? "block" : "none" }}><ProductosTab /></div>
    </>
  );
}
