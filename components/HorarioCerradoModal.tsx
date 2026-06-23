"use client";

import { useEffect, useState } from "react";
import { HORARIO, ahoraCR, calcularEstado, fmtHora } from "@/lib/horario";

const SESSION_KEY = "horario_modal_cerrado";

// Días en el orden que se quiere mostrar (lun → dom)
const DIAS_DISPLAY: { dia: number; nombre: string }[] = [
  { dia: 1, nombre: "Lunes"     },
  { dia: 2, nombre: "Martes"    },
  { dia: 3, nombre: "Miércoles" },
  { dia: 4, nombre: "Jueves"    },
  { dia: 5, nombre: "Viernes"   },
  { dia: 6, nombre: "Sábado"    },
  { dia: 0, nombre: "Domingo"   },
];

export default function HorarioCerradoModal() {
  const [visible, setVisible] = useState(false);
  const [diaHoy, setDiaHoy]   = useState<number>(-1);

  useEffect(() => {
    // No mostrar si ya fue cerrado en esta sesión
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const estado = calcularEstado();
    if (!estado.abierto) {
      setDiaHoy(ahoraCR().getDay());
      setVisible(true);
    }
  }, []);

  const cerrar = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      onClick={cerrar}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1008",
          borderRadius: 18,
          padding: "28px 22px",
          width: "100%",
          maxWidth: 280,
          border: "1px solid rgba(255,255,255,0.06)",
          position: "relative",
        }}
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={cerrar}
          style={{
            position: "absolute", top: 14, right: 14,
            background: "none", border: "none",
            color: "rgba(255,255,255,0.4)", fontSize: 16,
            cursor: "pointer", lineHeight: 1, padding: 4,
          }}
        >
          ✕
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>

          {/* Ícono */}
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: "rgba(249,115,22,0.1)",
            border: "1px solid rgba(249,115,22,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26,
          }}>
            🍔
          </div>

          {/* Título */}
          <p style={{ fontSize: 15, fontWeight: 500, color: "white", margin: 0, textAlign: "center" }}>
            Estamos cerrados
          </p>

          {/* Subtítulo */}
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 4px", textAlign: "center" }}>
            Volvemos a abrir pronto
          </p>

          {/* Label sección */}
          <p style={{
            fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0,
            textTransform: "uppercase", letterSpacing: "1px", textAlign: "center",
          }}>
            Horario de atención
          </p>

          {/* Lista de días */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
            {DIAS_DISPLAY.map(({ dia, nombre }) => {
              const turno   = HORARIO[dia];
              const esHoy   = dia === diaHoy;
              const horario = turno
                ? `${fmtHora(turno.abre)} – ${fmtHora(turno.cierra)}`
                : "Cerrado";

              return (
                <div
                  key={dia}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: esHoy ? "rgba(249,115,22,0.08)" : "transparent",
                    border: esHoy ? "1px solid rgba(249,115,22,0.2)" : "1px solid transparent",
                  }}
                >
                  <span style={{
                    fontSize: 11,
                    color: esHoy ? "#f97316" : "rgba(255,255,255,0.7)",
                    fontWeight: esHoy ? 500 : 400,
                  }}>
                    {nombre}
                  </span>
                  <span style={{
                    fontSize: 11,
                    color: esHoy ? "#f97316" : "rgba(255,255,255,0.5)",
                  }}>
                    {horario}
                  </span>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
