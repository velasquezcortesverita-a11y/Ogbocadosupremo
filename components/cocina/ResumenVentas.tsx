"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Banknote,
  Smartphone,
  TrendingUp,
  RefreshCw,
  Lock,
  AlertCircle,
  History,
  Printer,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type MetodoPago = "sinpe" | "efectivo";
type ResumenItem = { total: number; cantidad: number };
type Resumen = { sinpe: ResumenItem; efectivo: ResumenItem; general: ResumenItem } | null;

type PedidoReporte = {
  id: string;
  numero_pedido: number;
  nombre_cliente: string;
  total: number | string;
  metodo_pago: string;
  created_at: string;
  pedido_items: { nombre_producto: string; cantidad: number }[];
};

type CierreHistorial = {
  id: string;
  fecha: string;
  total_sinpe: number;
  total_efectivo: number;
  total_general: number;
  cantidad_pedidos: number;
  hora_inicio: string | null;
  hora_cierre: string | null;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₡${n.toLocaleString("es-CR")}`;

function formatTs(ts: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-CR", {
    timeZone: "America/Costa_Rica",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    ...opts,
  });
}

// ─── Modal de reporte ─────────────────────────────────────────────────────────

function ReporteModal({
  resumen,
  horaInicio,
  horaCierre,
  pedidos,
  onClose,
}: {
  resumen: Resumen;
  horaInicio: string;
  horaCierre: string;
  pedidos: PedidoReporte[];
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const imprimir = () => {
    const original = document.body.innerHTML;
    document.body.innerHTML = printRef.current?.innerHTML ?? "";
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Reporte de ventas</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatTs(horaInicio)} → {formatTs(horaCierre)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={imprimir}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-gray-700 transition-colors"
            >
              <Printer size={14} />
              Imprimir
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 px-2 text-xl font-light">✕</button>
          </div>
        </div>

        {/* Contenido (también el de impresión) */}
        <div ref={printRef} className="overflow-y-auto p-5 flex flex-col gap-5">
          {/* Totales */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "SINPE Móvil", data: resumen?.sinpe,    color: "text-blue-600",  bg: "bg-blue-50"  },
              { label: "Efectivo",    data: resumen?.efectivo,  color: "text-green-600", bg: "bg-green-50" },
              { label: "Total",       data: resumen?.general,   color: "text-orange-600", bg: "bg-orange-50" },
            ].map(({ label, data, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3`}>
                <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{fmt(data?.total ?? 0)}</p>
                <p className="text-xs text-gray-400">{data?.cantidad ?? 0} pedidos</p>
              </div>
            ))}
          </div>

          {/* Lista de pedidos */}
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
        </div>
      </div>
    </div>
  );
}

// ─── Modal de historial ───────────────────────────────────────────────────────

function HistorialModal({ onClose }: { onClose: () => void }) {
  const [cierres, setCierres] = useState<CierreHistorial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cierres_dia")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      setCierres((data ?? []) as CierreHistorial[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" style={{ maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Historial de cierres</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
        </div>
        <div className="overflow-y-auto p-4 flex flex-col gap-2">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-6">Cargando...</p>
          ) : cierres.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin cierres registrados</p>
          ) : (
            cierres.map((c) => (
              <div key={c.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-gray-800">
                    {formatTs(c.hora_cierre ?? c.created_at)}
                  </span>
                  <span className="text-sm font-bold text-orange-500">{fmt(c.total_general)}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>SINPE: {fmt(c.total_sinpe)}</span>
                  <span>Efectivo: {fmt(c.total_efectivo)}</span>
                  <span>{c.cantidad_pedidos} pedidos</span>
                </div>
                {c.hora_inicio && (
                  <p className="text-xs text-gray-300 mt-1">
                    Desde: {formatTs(c.hora_inicio)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ResumenVentas() {
  const [resumen,       setResumen]       = useState<Resumen>(null);
  const [loading,       setLoading]       = useState(true);
  const [diaInicio,     setDiaInicio]     = useState<string | null>(null);
  const [ultimaActualizacion, setUltima]  = useState("");
  const [showModalCierre, setShowModal]   = useState(false);
  const [cerrando,      setCerrando]      = useState(false);
  const [showReporte,   setShowReporte]   = useState(false);
  const [reporteData,   setReporteData]   = useState<{
    resumen: Resumen; horaInicio: string; horaCierre: string; pedidos: PedidoReporte[];
  } | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);

  // ── Cargar dia_inicio desde configuracion ──
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("configuracion")
        .select("valor")
        .eq("clave", "dia_inicio")
        .maybeSingle();

      if (data?.valor) {
        setDiaInicio(data.valor as string);
      } else {
        // fallback si no existe el registro: inicio de hoy en CR
        const hoy = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().split("T")[0];
        const ini = hoy + "T06:00:00.000Z";
        setDiaInicio(ini);
        // Intentar crearlo para la próxima carga
        await supabase.from("configuracion")
          .upsert({ clave: "dia_inicio", valor: ini }, { onConflict: "clave" });
      }
    })();
  }, []);

  // ── Calcular totales ──
  const cargar = useCallback(async () => {
    if (!diaInicio) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("pedidos")
      .select("total, metodo_pago")
      .eq("estado", "entregado")
      .gte("created_at", diaInicio);

    if (error) { console.error("ResumenVentas:", error.message); setLoading(false); return; }

    const pedidos = data ?? [];
    const sum   = (m: MetodoPago) => pedidos.filter((p) => p.metodo_pago === m).reduce((a, p) => a + Number(p.total), 0);
    const count = (m: MetodoPago) => pedidos.filter((p) => p.metodo_pago === m).length;

    setResumen({
      sinpe:    { total: sum("sinpe"),    cantidad: count("sinpe")    },
      efectivo: { total: sum("efectivo"), cantidad: count("efectivo") },
      general:  { total: pedidos.reduce((a, p) => a + Number(p.total), 0), cantidad: pedidos.length },
    });
    setUltima(new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }));
    setLoading(false);
  }, [diaInicio]);

  useEffect(() => {
    if (!diaInicio) return;
    cargar();
    const interval = setInterval(cargar, 60000);
    window.addEventListener("resumen-actualizar", cargar);
    return () => { clearInterval(interval); window.removeEventListener("resumen-actualizar", cargar); };
  }, [cargar, diaInicio]);

  // ── Cerrar día ──
  const handleCerrarDia = async () => {
    if (!resumen || !diaInicio) return;
    setCerrando(true);

    try {
      const horaCierre = new Date().toISOString();

      // 1. Obtener todos los pedidos entregados del período
      const { data: pedidosDelDia } = await supabase
        .from("pedidos")
        .select(`id, numero_pedido, nombre_cliente, total, metodo_pago, created_at,
          pedido_items(nombre_producto, cantidad)`)
        .eq("estado", "entregado")
        .gte("created_at", diaInicio)
        .order("created_at", { ascending: true });

      const lista = (pedidosDelDia ?? []) as PedidoReporte[];

      // 2. Guardar cierre en BD
      await supabase.from("cierres_dia").insert({
        fecha:            horaCierre,
        total_sinpe:      resumen.sinpe.total,
        total_efectivo:   resumen.efectivo.total,
        total_tarjeta:    0,
        total_general:    resumen.general.total,
        cantidad_pedidos: resumen.general.cantidad,
        pedidos_ids:      lista.map((p) => p.id),
        hora_inicio:      diaInicio,
        hora_cierre:      horaCierre,
      });

      // 3. Actualizar dia_inicio → empezar nuevo día
      await supabase.from("configuracion")
        .upsert({ clave: "dia_inicio", valor: horaCierre }, { onConflict: "clave" });

      // 4. Guardar datos para el reporte y mostrar
      setReporteData({ resumen, horaInicio: diaInicio, horaCierre, pedidos: lista });
      setShowReporte(true);
      setShowModal(false);

      // 5. Resetear estado local
      setDiaInicio(horaCierre);
      setResumen({ sinpe: { total: 0, cantidad: 0 }, efectivo: { total: 0, cantidad: 0 }, general: { total: 0, cantidad: 0 } });

      // 6. Avisar a ComprobantesGrid
      window.dispatchEvent(new CustomEvent("dia-cerrado"));

    } catch (err) {
      console.error("Error al cerrar día:", err);
      alert("Error al cerrar el día. Intentá de nuevo.");
    } finally {
      setCerrando(false);
    }
  };

  // ── Render ──
  const tarjetas: { key: MetodoPago; label: string; Icon: React.ElementType; color: string; bg: string; border: string }[] = [
    { key: "sinpe",    label: "SINPE Móvil", Icon: Smartphone, color: "text-blue-400",  bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.2)"  },
    { key: "efectivo", label: "Efectivo",    Icon: Banknote,   color: "text-green-400", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.2)"   },
  ];

  return (
    <>
      {/* Modal confirmación cierre */}
      {showModalCierre && resumen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <AlertCircle className="w-10 h-10 text-orange-500 mx-auto mb-3" />
            <h2 className="font-bold text-lg text-center mb-1">¿Cerrar el día?</h2>
            <p className="text-gray-500 text-sm text-center mb-4">
              Esta acción guarda el reporte y reinicia los contadores. No se puede deshacer.
            </p>
            <div className="mb-5 divide-y divide-gray-100">
              <div className="flex justify-between text-sm py-2">
                <span className="text-gray-600">SINPE Móvil</span>
                <span className="font-medium">{fmt(resumen.sinpe.total)}</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-gray-600">Efectivo</span>
                <span className="font-medium">{fmt(resumen.efectivo.total)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 font-semibold">
                <span>Total</span>
                <span>{fmt(resumen.general.total)} · {resumen.general.cantidad} pedidos</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCerrarDia} disabled={cerrando} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 transition-colors">
                {cerrando ? "Cerrando..." : "Confirmar cierre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reporte */}
      {showReporte && reporteData && (
        <ReporteModal
          resumen={reporteData.resumen}
          horaInicio={reporteData.horaInicio}
          horaCierre={reporteData.horaCierre}
          pedidos={reporteData.pedidos}
          onClose={() => setShowReporte(false)}
        />
      )}

      {/* Modal historial */}
      {showHistorial && <HistorialModal onClose={() => setShowHistorial(false)} />}

      {/* Panel principal */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, marginBottom: 24 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-400" />
            <span className="font-semibold text-white text-sm">Ventas del día</span>
            {diaInicio && (
              <span className="text-xs text-gray-500">
                · desde {formatTs(diaInicio, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {ultimaActualizacion && (
              <span className="text-xs text-gray-500 hidden sm:inline">{ultimaActualizacion}</span>
            )}
            <button onClick={() => setShowHistorial(true)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Ver historial">
              <History size={14} className="text-gray-400" />
            </button>
            <button onClick={cargar} disabled={loading} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <RefreshCw size={14} className={`text-gray-400 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <Lock size={14} />
              Cerrar día
            </button>
          </div>
        </div>

        {/* Cards por método */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {tarjetas.map(({ key, label, Icon, color, bg, border }) => {
            const datos = resumen?.[key];
            return (
              <div key={key} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 14 }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={color} />
                  <span className="text-xs text-gray-400 font-medium">{label}</span>
                </div>
                <p className={`text-lg font-bold ${color}`}>
                  {loading ? "..." : fmt(datos?.total ?? 0)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {loading ? "" : `${datos?.cantidad ?? 0} pedidos`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Total general */}
        <div style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="text-sm font-semibold text-orange-300">Total del día</span>
          <div className="text-right">
            <p className="text-xl font-bold text-orange-400">
              {loading ? "..." : fmt(resumen?.general.total ?? 0)}
            </p>
            <p className="text-xs text-orange-300/60">{resumen?.general.cantidad ?? 0} pedidos entregados</p>
          </div>
        </div>
      </div>
    </>
  );
}
