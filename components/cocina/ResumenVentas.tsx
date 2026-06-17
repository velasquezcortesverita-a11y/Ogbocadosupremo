"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CreditCard,
  Banknote,
  Smartphone,
  TrendingUp,
  RefreshCw,
  Lock,
  AlertCircle,
} from "lucide-react";
import type { CierreDia } from "@/types/pedido";

type MetodoPago = "sinpe" | "efectivo" | "tarjeta";
type ResumenItem = { total: number; cantidad: number };
type Resumen = {
  sinpe:    ResumenItem;
  efectivo: ResumenItem;
  tarjeta:  ResumenItem;
  general:  ResumenItem;
} | null;

function fechaHoyCR(): string {
  const ahoraCR = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return ahoraCR.toISOString().split("T")[0];
}

const fmt = (n: number) => `₡${n.toLocaleString("es-CR")}`;

export default function ResumenVentas() {
  const [resumen, setResumen] = useState<Resumen>(null);
  const [loading, setLoading] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoyCR);
  const [cierreDia, setCierreDia] = useState<CierreDia | null>(null);
  const [esCierreCerrado, setEsCierreCerrado] = useState(false);
  const [diaYaCerrado, setDiaYaCerrado] = useState(false);
  const [showModalCierre, setShowModalCierre] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setCierreDia(null);
    setEsCierreCerrado(false);

    const esFechaHoy = fechaSeleccionada === fechaHoyCR();

    // Rango UTC del día CR seleccionado (medianoche CR = 06:00 UTC)
    const inicio = new Date(fechaSeleccionada + "T06:00:00.000Z");
    const fin = new Date(inicio);
    fin.setUTCDate(fin.getUTCDate() + 1);

    // Solo para días ANTERIORES buscar en cierres_dia
    if (!esFechaHoy) {
      const { data: cierreData } = await supabase
        .from("cierres_dia")
        .select("*")
        .eq("fecha", fechaSeleccionada)
        .maybeSingle();

      if (cierreData) {
        const cierre = cierreData as CierreDia;
        setCierreDia(cierre);
        setEsCierreCerrado(true);
        setResumen({
          sinpe:    { total: cierre.total_sinpe,    cantidad: 0 },
          efectivo: { total: cierre.total_efectivo, cantidad: 0 },
          tarjeta:  { total: cierre.total_tarjeta,  cantidad: 0 },
          general:  { total: cierre.total_general,  cantidad: cierre.cantidad_pedidos },
        });
        setUltimaActualizacion(
          new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })
        );
        setLoading(false);
        return;
      }
    }

    // Hoy (siempre tiempo real) o día anterior sin cierre → calcular desde pedidos
    const { data, error } = await supabase
      .from("pedidos")
      .select("total, metodo_pago")
      .eq("estado", "entregado")
      .gte("created_at", inicio.toISOString())
      .lt("created_at", fin.toISOString());

    if (error) {
      console.error("Error cargando resumen:", error.message);
      setLoading(false);
      return;
    }

    const pedidos = data ?? [];

    const sum = (metodo: MetodoPago) =>
      pedidos
        .filter((p) => p.metodo_pago === metodo)
        .reduce((acc, p) => acc + Number(p.total), 0);

    const count = (metodo: MetodoPago) =>
      pedidos.filter((p) => p.metodo_pago === metodo).length;

    setResumen({
      sinpe:    { total: sum("sinpe"),    cantidad: count("sinpe")    },
      efectivo: { total: sum("efectivo"), cantidad: count("efectivo") },
      tarjeta:  { total: sum("tarjeta"),  cantidad: count("tarjeta")  },
      general:  {
        total:    pedidos.reduce((acc, p) => acc + Number(p.total), 0),
        cantidad: pedidos.length,
      },
    });

    setUltimaActualizacion(
      new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })
    );
    setLoading(false);
  }, [fechaSeleccionada]);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 60000);
    window.addEventListener("resumen-actualizar", cargar);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resumen-actualizar", cargar);
    };
  }, [cargar]);

  // Resetear diaYaCerrado cuando cambia la fecha
  useEffect(() => {
    setDiaYaCerrado(false);
  }, [fechaSeleccionada]);

  const handleCerrarDia = async () => {
    if (!resumen) return;
    setCerrando(true);
    try {
      const fechaHoy = fechaHoyCR();

      const { error } = await supabase
        .from("cierres_dia")
        .upsert(
          {
            fecha:            fechaHoy,
            total_sinpe:      resumen.sinpe.total,
            total_efectivo:   resumen.efectivo.total,
            total_tarjeta:    resumen.tarjeta.total,
            total_general:    resumen.general.total,
            cantidad_pedidos: resumen.general.cantidad,
          },
          { onConflict: "fecha" }
        );

      if (error) throw error;

      setShowModalCierre(false);
      setDiaYaCerrado(true);
    } catch (err) {
      console.error("Error al cerrar día:", err);
      alert("Error al cerrar el día. Intentá de nuevo.");
    } finally {
      setCerrando(false);
    }
  };

  const esHoy = fechaSeleccionada === fechaHoyCR();

  const titulo = esHoy
    ? "Ventas de hoy"
    : "Ventas del " +
      new Date(fechaSeleccionada + "T12:00:00").toLocaleDateString("es-CR", {
        day: "numeric",
        month: "long",
      });

  const fechaFormateada = new Date(fechaSeleccionada + "T12:00:00").toLocaleDateString(
    "es-CR",
    { day: "numeric", month: "long" }
  );

  const tarjetas: {
    key: MetodoPago;
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
  }[] = [
    {
      key: "sinpe",
      label: "SINPE Móvil",
      icon: Smartphone,
      color: "text-blue-400",
      bg: "rgba(59,130,246,0.1)",
      border: "rgba(59,130,246,0.2)",
    },
    {
      key: "efectivo",
      label: "Efectivo",
      icon: Banknote,
      color: "text-green-400",
      bg: "rgba(34,197,94,0.1)",
      border: "rgba(34,197,94,0.2)",
    },
    {
      key: "tarjeta",
      label: "Tarjeta",
      icon: CreditCard,
      color: "text-purple-400",
      bg: "rgba(168,85,247,0.1)",
      border: "rgba(168,85,247,0.2)",
    },
  ];

  return (
    <>
      {/* Modal de confirmación de cierre */}
      {showModalCierre && resumen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <AlertCircle className="w-10 h-10 text-orange-500 mx-auto mb-3" />
            <h2 className="font-bold text-lg text-center mb-1">¿Cerrar el día?</h2>
            <p className="text-gray-500 text-sm text-center mb-4">
              Se guardará el reporte de hoy y la vista se reseteará para mañana.
            </p>

            <div className="mb-5">
              <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="text-gray-600">SINPE Móvil</span>
                <span className="font-medium">{fmt(resumen.sinpe.total)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="text-gray-600">Efectivo</span>
                <span className="font-medium">{fmt(resumen.efectivo.total)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="text-gray-600">Tarjeta</span>
                <span className="font-medium">{fmt(resumen.tarjeta.total)}</span>
              </div>
              <div className="flex justify-between text-sm py-2 font-semibold">
                <span>Total</span>
                <span>
                  {fmt(resumen.general.total)}
                  <span className="font-normal text-gray-400 ml-1">
                    · {resumen.general.cantidad} pedidos
                  </span>
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModalCierre(false)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarDia}
                disabled={cerrando}
                className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {cerrando ? "Cerrando..." : "Confirmar cierre"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-orange-400" />
            <span className="font-semibold text-white text-sm">{titulo}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="border border-white/15 bg-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            {/* Botón "Cerrar día": solo cuando es hoy y el día aún no fue cerrado esta sesión */}
            {esHoy && !diaYaCerrado && (
              <button
                onClick={() => setShowModalCierre(true)}
                className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Lock size={14} />
                Cerrar día
              </button>
            )}
            {ultimaActualizacion && (
              <span className="text-xs text-gray-500 hidden sm:inline">
                {ultimaActualizacion}
              </span>
            )}
            <button
              onClick={cargar}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Actualizar ventas"
            >
              <RefreshCw
                size={14}
                className={`text-gray-400 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Badge: solo para días anteriores con cierre guardado */}
        {esCierreCerrado && !esHoy && (
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 text-xs px-3 py-1 rounded-full border border-orange-200">
              📋 Reporte cerrado del {fechaFormateada}
            </span>
          </div>
        )}

        {/* Cards por método de pago */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {tarjetas.map(({ key, label, icon: Icon, color, bg, border }) => {
            const datos = resumen?.[key];
            return (
              <div
                key={key}
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={color} />
                  <span className="text-xs text-gray-400 font-medium">{label}</span>
                </div>
                <p className={`text-lg font-bold ${color}`}>
                  {loading
                    ? "..."
                    : `₡${(datos?.total ?? 0).toLocaleString("es-CR")}`}
                </p>
                {/* Conteo por método solo disponible en datos en tiempo real */}
                {!esCierreCerrado && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {loading ? "" : `${datos?.cantidad ?? 0} pedidos`}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Total general */}
        <div
          style={{
            background: "rgba(249,115,22,0.1)",
            border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: "12px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span className="text-sm font-semibold text-orange-300">Total del día</span>
          <div className="text-right">
            <p className="text-xl font-bold text-orange-400">
              {loading
                ? "..."
                : `₡${(resumen?.general.total ?? 0).toLocaleString("es-CR")}`}
            </p>
            <p className="text-xs text-orange-300/60">
              {resumen?.general.cantidad ?? 0} pedidos entregados
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
