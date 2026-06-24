"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import PedidoCard from "@/components/cocina/PedidoCard";
import type { Pedido } from "@/types/pedido";

const PEDIDO_SELECT = `
  *,
  pedido_items (
    id,
    nombre_producto,
    cantidad,
    precio,
    extras
  )
` as const;

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

  // IDs ya procesados — evita duplicados entre Realtime y el polling de respaldo
  const seenIdsRef = useRef<Set<string>>(new Set(initialPedidos.map((p) => p.id)));

  const notificarNuevo = (nuevoPedido: Pedido) => {
    seenIdsRef.current.add(nuevoPedido.id);
    setPedidos((prev) => [nuevoPedido, ...prev]);

    playNotif();

    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(nuevoPedido);
    toastTimer.current = setTimeout(() => setToast(null), 5000);

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
  };

  // ── Canal Realtime (INSERT) ─────────────────────────────────────────────────
  useEffect(() => {
    const canal = supabase
      .channel("cocina-pedidos-v2")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pedidos" },
        async (payload) => {
          const newId = (payload.new as { id?: string })?.id;
          if (!newId || seenIdsRef.current.has(newId)) return;

          // Pequeña espera para que pedido_items terminen de insertarse
          await new Promise((r) => setTimeout(r, 1000));

          const { data, error } = await supabase
            .from("pedidos")
            .select(PEDIDO_SELECT)
            .eq("id", newId)
            .single();

          if (error || !data) {
            console.error("CocinaListado Realtime: error al obtener pedido", newId, error?.message);
            return;
          }

          notificarNuevo(data as Pedido);
        }
      )
      .subscribe((status, err) => {
        if (err) console.error("CocinaListado canal error:", err);
        console.info("CocinaListado Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(canal);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      nuevosTimer.current.forEach((t) => clearTimeout(t));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling de respaldo cada 20 s ───────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      const { data } = await supabase
        .from("pedidos")
        .select(PEDIDO_SELECT)
        .neq("estado", "entregado")
        .neq("estado", "pago_rechazado")
        .order("created_at", { ascending: false });

      if (!data) return;

      const nuevos = (data as Pedido[]).filter(
        (p) => !seenIdsRef.current.has(p.id)
      );

      if (nuevos.length === 0) return;

      // Notificar solo el primero con sonido/toast; los demás solo se agregan
      notificarNuevo(nuevos[0]);
      for (let i = 1; i < nuevos.length; i++) {
        seenIdsRef.current.add(nuevos[i].id);
        setPedidos((prev) => [nuevos[i], ...prev]);
      }
    };

    const interval = setInterval(poll, 20_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
