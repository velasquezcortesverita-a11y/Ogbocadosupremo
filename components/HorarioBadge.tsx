"use client";

import { useEffect, useState } from "react";

// Retorna un objeto Date con la hora actual en Costa Rica
function ahoraCR(): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });

  // Reconstruye un Date cuya "hora local" coincide con la hora CR
  const partes = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return new Date(
    `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`
  );
}

// 0=dom 1=lun 2=mar 3=mié 4=jue 5=vie 6=sáb
const HORARIO: Record<number, { abre: number; cierra: number } | null> = {
  0: { abre: 11, cierra: 22 }, // domingo
  1: { abre: 14, cierra: 21 }, // lunes
  2: { abre: 14, cierra: 21 }, // martes
  3: null,                      // miércoles — cerrado
  4: { abre: 14, cierra: 21 }, // jueves
  5: { abre: 11, cierra: 22 }, // viernes
  6: { abre: 11, cierra: 22 }, // sábado
};

const DIAS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function fmtHora(h: number): string {
  return h < 12 ? `${h}:00 am` : h === 12 ? "12:00 pm" : `${h - 12}:00 pm`;
}

type Estado =
  | { abierto: true }
  | { abierto: false; mensaje: string };

function calcularEstado(): Estado {
  const ahora  = ahoraCR();
  const dia    = ahora.getDay();      // 0–6
  const horaActual = ahora.getHours() + ahora.getMinutes() / 60;

  const turno = HORARIO[dia];

  // ¿Está abierto ahora mismo?
  if (turno && horaActual >= turno.abre && horaActual < turno.cierra) {
    return { abierto: true };
  }

  // Cerrado — calcular próxima apertura
  // Si hoy tiene turno y aún no llegó la hora de apertura
  if (turno && horaActual < turno.abre) {
    return { abierto: false, mensaje: `Cerrado · Abrimos hoy a las ${fmtHora(turno.abre)}` };
  }

  // Buscar el próximo día con horario (hasta 7 días adelante)
  for (let delta = 1; delta <= 7; delta++) {
    const proximoDia = (dia + delta) % 7;
    const proximoTurno = HORARIO[proximoDia];
    if (proximoTurno) {
      const nombreDia = DIAS_ES[proximoDia];
      const prefijo   = delta === 1 ? "mañana" : `el ${nombreDia}`;
      return {
        abierto: false,
        mensaje: `Cerrado · Abrimos ${prefijo} a las ${fmtHora(proximoTurno.abre)}`,
      };
    }
  }

  // Nunca debería llegar aquí
  return { abierto: false, mensaje: "Cerrado" };
}

export default function HorarioBadge() {
  const [estado, setEstado] = useState<Estado>(() => calcularEstado());

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
