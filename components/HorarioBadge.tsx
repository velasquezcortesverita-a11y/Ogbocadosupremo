"use client";

import { useEffect, useState } from "react";
import { calcularEstado, type EstadoHorario } from "@/lib/horario";

export default function HorarioBadge() {
  const [estado, setEstado] = useState<EstadoHorario>(() => calcularEstado());

  useEffect(() => {
    const id = setInterval(() => setEstado(calcularEstado()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (estado.abierto) {
    return (
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 border border-white/15 text-white/85 text-sm">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        Abierto ahora · 25–35 min
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 border border-white/15 text-white/85 text-sm">
      <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
      {estado.mensaje}
    </span>
  );
}
