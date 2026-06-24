"use client";

import { useEffect, useState } from "react";

export default function CocinaNotifButton() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(localStorage.getItem("cocina_muted") === "1");
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("cocina_muted", next ? "1" : "0");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={muted ? "Activar sonido" : "Silenciar notificaciones"}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "rgba(249,115,22,0.1)",
        border: "1px solid rgba(249,115,22,0.25)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
