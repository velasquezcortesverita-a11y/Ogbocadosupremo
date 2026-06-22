"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Loader2, Printer } from "lucide-react";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type CierreHistorial = {
  id: string;
  fecha: string;
  total_sinpe: number;
  total_efectivo: number;
  total_general: number;
  cantidad_pedidos: number;
  pedidos_ids: string[] | null;
  hora_inicio: string | null;
  hora_cierre: string | null;
  created_at: string;
};

type PedidoReporte = {
  id: string;
  numero_pedido: number;
  nombre_cliente: string;
  total: number | string;
  metodo_pago: string;
  created_at: string;
  pedido_items: { nombre_producto: string; cantidad: number }[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₡${n.toLocaleString("es-CR")}`;

// Devuelve { year, month, date, day } en hora CR (UTC-6) usando métodos UTC
// sobre una fecha desplazada, para evitar dependencia del timezone del browser.
function crPartes(iso: string) {
  const crMs = new Date(iso).getTime() - 6 * 60 * 60 * 1000;
  const d    = new Date(crMs);
  return {
    year:  d.getUTCFullYear(),
    month: d.getUTCMonth(),
    date:  d.getUTCDate(),
    day:   d.getUTCDay(),
  };
}

function todayCRPartes() {
  return crPartes(new Date().toISOString());
}

function monthRangeUTC(year: number, month: number) {
  // 00:00 CR = 06:00 UTC; Date.UTC maneja correctamente el overflow de meses
  const start = new Date(Date.UTC(year, month,     1, 6, 0, 0));
  const end   = new Date(Date.UTC(year, month + 1, 1, 6, 0, 0));
  return { start: start.toISOString(), end: end.toISOString() };
}

function buildCalendar(year: number, month: number): number[] {
  const firstDay    = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const days: number[] = [];
  for (let i = 0; i < firstDay; i++) days.push(0);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  while (days.length % 7 !== 0) days.push(0);
  return days;
}

function formatTs(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-CR", {
    timeZone: "America/Costa_Rica",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const MESES        = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS_SEMANA  = ["D","L","M","M","J","V","S"];
const DIAS_NOMBRE  = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

// ─── Modal de reporte histórico ────────────────────────────────────────────────

function ReporteHistorialModal({
  cierre,
  pedidos,
  onClose,
}: {
  cierre: CierreHistorial;
  pedidos: PedidoReporte[];
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const ts = cierre.hora_cierre ?? cierre.created_at;
  const p  = crPartes(ts);
  const titulo = `${DIAS_NOMBRE[p.day]} ${p.date} de ${MESES[p.month].toLowerCase()} de ${p.year}`;

  const imprimir = () => {
    const original = document.body.innerHTML;
    document.body.innerHTML = printRef.current?.innerHTML ?? "";
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 640, maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Cierre del día</h2>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{titulo}</p>
            <p className="text-xs text-gray-300 mt-0.5">
              {formatTs(cierre.hora_inicio)} → {formatTs(ts)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={imprimir}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-gray-700 transition-colors"
            >
              <Printer size={13} />
              Imprimir
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 px-2 text-xl font-light"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div ref={printRef} className="overflow-y-auto p-5 flex flex-col gap-5">
          {/* Totales */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "SINPE Móvil", total: cierre.total_sinpe,   color: "text-blue-600",   bg: "bg-blue-50"   },
              { label: "Efectivo",    total: cierre.total_efectivo, color: "text-green-600",  bg: "bg-green-50"  },
              { label: "Total",       total: cierre.total_general,  color: "text-orange-600", bg: "bg-orange-50" },
            ].map(({ label, total, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3`}>
                <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{fmt(total ?? 0)}</p>
                {label === "Total" && (
                  <p className="text-xs text-gray-400">{cierre.cantidad_pedidos} pedidos</p>
                )}
              </div>
            ))}
          </div>

          {/* Lista de pedidos */}
          {pedidos.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Pedidos entregados ({pedidos.length})
              </p>
              <div className="space-y-2">
                {pedidos.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">#{p.numero_pedido}</span>
                        <span className="text-sm text-gray-600 truncate">{p.nombre_cliente}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.pedido_items.map((i) => `${i.nombre_producto} x${i.cantidad}`).join(", ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{fmt(Number(p.total))}</p>
                      <p className="text-xs text-gray-400 capitalize">{p.metodo_pago}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              No se encontraron pedidos en el historial para este cierre
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── HistorialTab ──────────────────────────────────────────────────────────────

export default function HistorialTab() {
  const hoy = todayCRPartes();
  const [mes,           setMes]           = useState({ year: hoy.year, month: hoy.month });
  const [cierres,       setCierres]       = useState<CierreHistorial[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedCierre, setSelectedCierre] = useState<CierreHistorial | null>(null);
  const [pedidosModal,  setPedidosModal]  = useState<PedidoReporte[]>([]);
  const [loadingModal,  setLoadingModal]  = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { start, end } = monthRangeUTC(mes.year, mes.month);
    const { data } = await supabase
      .from("cierres_dia")
      .select("*")
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: true });
    setCierres((data ?? []) as CierreHistorial[]);
    setLoading(false);
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);

  // Mapa día → cierre para el mes actual mostrado
  const cierreByDay: Record<number, CierreHistorial> = {};
  for (const c of cierres) {
    const ts  = c.hora_cierre ?? c.created_at;
    const day = crPartes(ts).date;
    cierreByDay[day] = c;
  }

  const esHoy        = mes.year === hoy.year && mes.month === hoy.month;
  const diaHoyNum    = esHoy ? hoy.date : -1;
  const calendario   = buildCalendar(mes.year, mes.month);

  const handleDayClick = async (day: number) => {
    const cierre = cierreByDay[day];
    if (!cierre) return;

    setLoadingModal(true);
    setSelectedCierre(cierre);

    let pedidos: PedidoReporte[] = [];
    if (cierre.pedidos_ids && cierre.pedidos_ids.length > 0) {
      const { data } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, nombre_cliente, total, metodo_pago, created_at, pedido_items(nombre_producto, cantidad)")
        .in("id", cierre.pedidos_ids)
        .order("created_at", { ascending: true });
      pedidos = (data ?? []) as PedidoReporte[];
    }

    setPedidosModal(pedidos);
    setLoadingModal(false);
  };

  const prevMes = () => setMes((p) =>
    p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 }
  );

  const nextMes = () => setMes((p) =>
    p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 }
  );

  const btnNav: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 26, height: 26, borderRadius: 6,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "rgba(0,0,0,0.03)",
    cursor: "pointer", color: "#374151",
  };

  return (
    <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 20 }}>

      {/* Modal de reporte */}
      {selectedCierre && !loadingModal && (
        <ReporteHistorialModal
          cierre={selectedCierre}
          pedidos={pedidosModal}
          onClose={() => { setSelectedCierre(null); setPedidosModal([]); }}
        />
      )}

      {/* Overlay de carga del modal */}
      {loadingModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "18px 24px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <Loader2 size={16} className="animate-spin" style={{ color: "#f97316" }} />
            <span style={{ fontSize: 13, color: "#374151" }}>Cargando reporte...</span>
          </div>
        </div>
      )}

      {/* Header: mes + navegación */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
          {MESES[mes.month]} {mes.year}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button type="button" style={btnNav} onClick={prevMes}>
            <ChevronLeft size={14} />
          </button>
          <button type="button" style={btnNav} onClick={nextMes}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Encabezados de días */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9, color: "#9ca3af", padding: "2px 0", fontWeight: 500, letterSpacing: "0.04em" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid del calendario */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "36px 0" }}>
          <Loader2 size={18} className="animate-spin" style={{ color: "#d1d5db" }} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
          {calendario.map((day, idx) => {
            if (day === 0) {
              return <div key={idx} style={{ visibility: "hidden", aspectRatio: "1" }} />;
            }

            const cierre  = cierreByDay[day];
            const isToday = day === diaHoyNum;

            return (
              <div
                key={idx}
                onClick={() => cierre && handleDayClick(day)}
                title={cierre ? `Ver cierre del día ${day}` : undefined}
                style={{
                  aspectRatio: "1",
                  borderRadius: 8,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  cursor: cierre ? "pointer" : "default",
                  border: isToday
                    ? "1.5px solid #f97316"
                    : cierre
                    ? "1px solid rgba(34,197,94,0.2)"
                    : "1px solid transparent",
                  background: cierre
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(0,0,0,0.02)",
                  transition: "background 0.1s",
                }}
              >
                <span style={{
                  fontSize: 12,
                  fontWeight: cierre ? 500 : 400,
                  color: cierre ? "#111827" : "#9ca3af",
                  lineHeight: 1,
                }}>
                  {day}
                </span>
                {cierre && (
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e", display: "block" }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Leyenda */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "#6b7280" }}>Día cerrado</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d1d5db", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "#6b7280" }}>Local cerrado</span>
        </div>
        {!loading && cierres.length === 0 && (
          <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: "auto" }}>
            Sin cierres registrados en {MESES[mes.month].toLowerCase()}
          </span>
        )}
      </div>
    </div>
  );
}
