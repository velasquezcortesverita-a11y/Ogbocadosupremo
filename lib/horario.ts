// Fuente de verdad única para el horario del local.
// Importar desde aquí en HorarioBadge, el modal y cualquier otro componente.

// 0=dom  1=lun  2=mar  3=mié  4=jue  5=vie  6=sáb
export const HORARIO: Record<number, { abre: number; cierra: number } | null> = {
  0: { abre: 11, cierra: 22 }, // domingo
  1: { abre: 14, cierra: 21 }, // lunes
  2: { abre: 14, cierra: 21 }, // martes
  3: null,                      // miércoles — cerrado
  4: { abre: 14, cierra: 21 }, // jueves
  5: { abre: 11, cierra: 22 }, // viernes
  6: { abre: 11, cierra: 22 }, // sábado
};

export const DIAS_ES = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];

export function fmtHora(h: number): string {
  return h < 12 ? `${h}:00 am` : h === 12 ? "12:00 pm" : `${h - 12}:00 pm`;
}

// Retorna un Date cuya hora local coincide con la hora actual en Costa Rica.
export function ahoraCR(): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const partes = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return new Date(
    `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}`
  );
}

export type EstadoHorario =
  | { abierto: true }
  | { abierto: false; mensaje: string };

export function calcularEstado(): EstadoHorario {
  const ahora      = ahoraCR();
  const dia        = ahora.getDay();
  const horaActual = ahora.getHours() + ahora.getMinutes() / 60;
  const turno      = HORARIO[dia];

  if (turno && horaActual >= turno.abre && horaActual < turno.cierra) {
    return { abierto: true };
  }

  if (turno && horaActual < turno.abre) {
    return { abierto: false, mensaje: `Cerrado · Abrimos hoy a las ${fmtHora(turno.abre)}` };
  }

  for (let delta = 1; delta <= 7; delta++) {
    const proximoDia   = (dia + delta) % 7;
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

  return { abierto: false, mensaje: "Cerrado" };
}
