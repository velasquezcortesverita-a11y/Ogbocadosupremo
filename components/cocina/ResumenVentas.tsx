"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AlertCircle, Printer } from "lucide-react";

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

function fechaHoyCR(): string {
  return new Date().toLocaleDateString("es-CR", {
    timeZone: "America/Costa_Rica",
    weekday: "short", day: "numeric", month: "short",
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
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Reporte de ventas</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatTs(horaInicio)} → {formatTs(horaCierre)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={imprimir}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-gray-700 transition-colors"
            >
              <Printer size={14} />
              Imprimir
            </button>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 px-2 text-xl font-light">✕</button>
          </div>
        </div>

        <div ref={printRef} className="overflow-y-auto p-5 flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "SINPE Móvil", data: resumen?.sinpe,   color: "text-blue-600",   bg: "bg-blue-50"   },
              { label: "Efectivo",    data: resumen?.efectivo, color: "text-green-600",  bg: "bg-green-50"  },
              { label: "Total",       data: resumen?.general,  color: "text-orange-600", bg: "bg-orange-50" },
            ].map(({ label, data, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3`}>
                <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{fmt(data?.total ?? 0)}</p>
                <p className="text-xs text-gray-400">{data?.cantidad ?? 0} pedidos</p>
              </div>
            ))}
          </div>

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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ResumenVentas() {
  const [resumen,         setResumen]       = useState<Resumen>(null);
  const [loading,         setLoading]       = useState(true);
  const [diaInicio,       setDiaInicio]     = useState<string | null>(null);
  const [showModalCierre, setShowModal]     = useState(false);
  const [cerrando,        setCerrando]      = useState(false);
  const [showReporte,     setShowReporte]   = useState(false);
  const [reporteData,     setReporteData]   = useState<{
    resumen: Resumen; horaInicio: string; horaCierre: string; pedidos: PedidoReporte[];
  } | null>(null);

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
        const hoy = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString().split("T")[0];
        const ini = hoy + "T06:00:00.000Z";
        setDiaInicio(ini);
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

      const { data: pedidosDelDia } = await supabase
        .from("pedidos")
        .select(`id, numero_pedido, nombre_cliente, total, metodo_pago, created_at,
          pedido_items(nombre_producto, cantidad)`)
        .eq("estado", "entregado")
        .gte("created_at", diaInicio)
        .order("created_at", { ascending: true });

      const lista = (pedidosDelDia ?? []) as PedidoReporte[];

      const { error: cierreErr } = await supabase.from("cierres_dia").insert({
        fecha:            horaCierre,
        total_sinpe:      resumen.sinpe.total,
        total_efectivo:   resumen.efectivo.total,
        total_tarjeta:    0,
        total_general:    resumen.general.total,
        cantidad_pedidos: resumen.general.cantidad,
        pedidos_ids:      lista.map((p) => p.id),
      });
      if (cierreErr) throw new Error(cierreErr.message);

      await supabase.from("configuracion")
        .upsert({ clave: "dia_inicio", valor: horaCierre }, { onConflict: "clave" });

      setReporteData({ resumen, horaInicio: diaInicio, horaCierre, pedidos: lista });
      setShowReporte(true);
      setShowModal(false);

      setDiaInicio(horaCierre);
      setResumen({ sinpe: { total: 0, cantidad: 0 }, efectivo: { total: 0, cantidad: 0 }, general: { total: 0, cantidad: 0 } });

      window.dispatchEvent(new CustomEvent("dia-cerrado"));
    } catch (err) {
      console.error("Error al cerrar día:", err);
      alert("Error al cerrar el día. Intentá de nuevo.");
    } finally {
      setCerrando(false);
    }
  };

  // ── Render ──
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
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCerrarDia}
                disabled={cerrando}
                className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 transition-colors"
              >
                {cerrando ? "Cerrando..." : "Confirmar cierre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reporte post-cierre */}
      {showReporte && reporteData && (
        <ReporteModal
          resumen={reporteData.resumen}
          horaInicio={reporteData.horaInicio}
          horaCierre={reporteData.horaCierre}
          pedidos={reporteData.pedidos}
          onClose={() => setShowReporte(false)}
        />
      )}

      {/* Panel de ventas */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 16, padding: 20, marginBottom: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>📈 Ventas de hoy</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{fechaHoyCR()}</span>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
            >
              🔒 Cerrar día
            </button>
          </div>
        </div>

        {/* Tarjetas por método de pago */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>

          {/* SINPE Móvil */}
          <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ fontSize: 10, color: "#6b7280", margin: 0, marginBottom: 4 }}>📱 SINPE Móvil</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: "#3b82f6", margin: 0 }}>
              {loading ? "—" : fmt(resumen?.sinpe.total ?? 0)}
            </p>
            <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, marginTop: 3 }}>
              {loading ? "" : `${resumen?.sinpe.cantidad ?? 0} pedidos`}
            </p>
          </div>

          {/* Efectivo */}
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ fontSize: 10, color: "#6b7280", margin: 0, marginBottom: 4 }}>💵 Efectivo</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: "#16a34a", margin: 0 }}>
              {loading ? "—" : fmt(resumen?.efectivo.total ?? 0)}
            </p>
            <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, marginTop: 3 }}>
              {loading ? "" : `${resumen?.efectivo.cantidad ?? 0} pedidos`}
            </p>
          </div>
        </div>

        {/* Banner total del día */}
        <div style={{ background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>Total del día</p>
            <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, marginTop: 2 }}>
              {resumen?.general.cantidad ?? 0} pedidos entregados
            </p>
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, color: "#f97316", margin: 0 }}>
            {loading ? "—" : fmt(resumen?.general.total ?? 0)}
          </p>
        </div>


      </div>
    </>
  );
}
