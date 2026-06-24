"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import PedidoCard from "@/components/cocina/PedidoCard";
import type { Pedido } from "@/types/pedido";

// ─── Sonido de notificación ────────────────────────────────────────────────────
// Coloca el archivo en public/sounds/notificacion.mp3
// Si no existe, se usa un beep sintético con la Web Audio API como fallback.

function playNotif() {
  if (typeof localStorage !== "undefined" && localStorage.getItem("cocina_muted") === "1") return;
  try {
    const audio = new Audio("/sounds/notificacion.mp3");
    audio.play().catch(() => {
      // Fallback: beep sintético (doble tono ascendente)
      try {
        const ctx = new AudioContext();
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.type = "sine";
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      } catch {
        // AudioContext bloqueado — silencioso
      }
    });
  } catch {
    // Audio no disponible
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function PedidoToast({
  pedido,
  onClose,
}: {
  pedido: Pedido;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.25)",
        borderRadius: 10,
        padding: "10px 14px",
        cursor: "pointer",
        minWidth: 230,
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 500, color: "#111827", margin: "0 0 3px" }}>
        🛎️ ¡Nuevo pedido recibido!
      </p>
      <p style={{ fontSize: 9, color: "#6b7280", margin: 0 }}>
        Pedido #{pedido.numero_pedido} · {pedido.nombre_cliente}
      </p>
    </div>
  );
}

// ─── CocinaListado ────────────────────────────────────────────────────────────

export default function CocinaListado({ initialPedidos }: { initialPedidos: Pedido[] }) {
  const [pedidos,   setPedidos]   = useState<Pedido[]>(initialPedidos);
  const [nuevosIds, setNuevosIds] = useState<Set<string>>(new Set());
  const [toast,     setToast]     = useState<Pedido | null>(null);
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nuevosTimer = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const canal = supabase
      .channel("cocina-pedidos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedidos" },
        async (payload) => {
          const { data } = await supabase
            .from("pedidos")
            .select(`
              *,
              pedido_items (
                id,
                nombre_producto,
                cantidad,
                precio,
                extras
              )
            `)
            .eq("id", (payload.new as { id: string }).id)
            .single();

          if (!data) return;
          const nuevoPedido = data as Pedido;

          setPedidos((prev) => [nuevoPedido, ...prev]);

          // Sonido
          playNotif();

          // Toast (se cierra solo a los 5 s)
          if (toastTimer.current) clearTimeout(toastTimer.current);
          setToast(nuevoPedido);
          toastTimer.current = setTimeout(() => setToast(null), 5000);

          // Resaltado verde — desaparece a los 30 s
          setNuevosIds((prev) => new Set([...prev, nuevoPedido.id]));
          const t = setTimeout(() => {
            setNuevosIds((prev) => {
              const next = new Set(prev);
              next.delete(nuevoPedido.id);
              return next;
            });
            nuevosTimer.current.delete(nuevoPedido.id);
          }, 30_000);
          nuevosTimer.current.set(nuevoPedido.id, t);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      nuevosTimer.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  function handleEntregado(id: string) {
    window.dispatchEvent(new CustomEvent("resumen-actualizar"));
    setPedidos((prev) => prev.filter((p) => p.id !== id));
  }

  function handleVerNuevo(id: string) {
    // El cocinero interactuó — quitar resaltado inmediatamente
    setNuevosIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const t = nuevosTimer.current.get(id);
    if (t) { clearTimeout(t); nuevosTimer.current.delete(id); }
  }

  const count = pedidos.length;

  return (
    <>
      {/* Toast */}
      {toast && <PedidoToast pedido={toast} onClose={() => setToast(null)} />}

      <p className="text-sm text-gray-500 mb-6">
        {count} {count === 1 ? "pedido activo" : "pedidos activos"}
      </p>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-gray-400">
          <span className="text-6xl block mb-4">🍳</span>
          <p className="font-semibold text-gray-500">No hay pedidos activos</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pedidos.map((pedido) => (
            <PedidoCard
              key={pedido.id}
              pedido={pedido}
              isNuevo={nuevosIds.has(pedido.id)}
              onEntregado={() => handleEntregado(pedido.id)}
              onVerNuevo={() => handleVerNuevo(pedido.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}
