"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PIN_LENGTH = 4;

type Estado = "idle" | "verificando" | "error";

export default function PinGate() {
  const router  = useRouter();
  const [digitos, setDigitos] = useState<string[]>([]);
  const [estado,  setEstado]  = useState<Estado>("idle");
  const [msg,     setMsg]     = useState("");
  const [shake,   setShake]   = useState(false);
  const verificando = useRef(false);

  // Verificar automáticamente al completar los 4 dígitos
  useEffect(() => {
    if (digitos.length === PIN_LENGTH && !verificando.current) {
      verificar(digitos.join(""));
    }
  }, [digitos]);

  const verificar = async (pin: string) => {
    verificando.current = true;
    setEstado("verificando");

    try {
      const res = await fetch("/api/cocina/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        // Cookie establecida por el servidor — refrescar para que el layout la lea
        router.refresh();
        return;
      }
    } catch {
      // error de red
    }

    // PIN incorrecto
    setEstado("error");
    setShake(true);
    setMsg("PIN incorrecto, intentá de nuevo");
    setTimeout(() => {
      setShake(false);
      setDigitos([]);
      setEstado("idle");
      verificando.current = false;
    }, 700);
  };

  const presionar = (d: string) => {
    if (estado !== "idle") return;
    if (digitos.length >= PIN_LENGTH) return;
    setDigitos((prev) => [...prev, d]);
  };

  const borrar = () => {
    if (estado !== "idle") return;
    setDigitos((prev) => prev.slice(0, -1));
    setMsg("");
  };

  const teclas: (string | null)[] = [
    "1","2","3",
    "4","5","6",
    "7","8","9",
    null,"0","⌫",
  ];

  const btn: React.CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "white",
    fontSize: 18,
    fontWeight: 400,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.1s",
    userSelect: "none",
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#1a1008",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-6px); }
          30%       { transform: translateX(6px); }
          45%       { transform: translateX(-5px); }
          60%       { transform: translateX(5px); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(3px); }
        }
        .pin-shake { animation: shake 0.35s ease-in-out; }
        .pin-btn:active { background: rgba(255,255,255,0.12) !important; }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          width: "100%",
          maxWidth: 260,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "rgba(249,115,22,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
          }}
        >
          🍔
        </div>

        {/* Título */}
        <p
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "white",
            margin: 0,
            textAlign: "center",
            marginTop: -12,
          }}
        >
          Ingresá el PIN de cocina
        </p>

        {/* Indicador de puntos */}
        <div
          className={shake ? "pin-shake" : ""}
          style={{ display: "flex", gap: 12 }}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const lleno   = i < digitos.length;
            const esError = estado === "error";
            return (
              <div
                key={i}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: `1.5px solid ${
                    esError
                      ? "#ef4444"
                      : lleno
                      ? "transparent"
                      : "rgba(255,255,255,0.3)"
                  }`,
                  background: esError
                    ? "#ef4444"
                    : lleno
                    ? "#f97316"
                    : "transparent",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              />
            );
          })}
        </div>

        {/* Mensaje de error */}
        <p
          style={{
            fontSize: 11,
            color: "#ef4444",
            margin: "-16px 0 -8px",
            textAlign: "center",
            minHeight: 16,
            opacity: msg ? 1 : 0,
            transition: "opacity 0.2s",
          }}
        >
          {msg}
        </p>

        {/* Teclado numérico */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 52px)",
            gap: 10,
          }}
        >
          {teclas.map((t, i) => {
            if (t === null) {
              return <div key={i} />;
            }

            const esNum = t !== "⌫";

            return (
              <button
                key={i}
                type="button"
                className="pin-btn"
                style={{
                  ...btn,
                  ...(t === "⌫" ? { background: "rgba(255,255,255,0.02)", fontSize: 20 } : {}),
                  opacity: estado === "verificando" ? 0.5 : 1,
                }}
                onClick={() => (esNum ? presionar(t) : borrar())}
                disabled={estado === "verificando"}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
